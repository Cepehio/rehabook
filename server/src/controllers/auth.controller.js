/**
 * Autentifikacijos kontroleris.
 * bcrypt slaptažodžių hash'inimas + JWT generavimas. passwordHash niekur negrąžinamas.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../lib/mailer.js';
import { stripPassword } from '../lib/serialize.js';
import { serializable, httpError } from '../lib/transaction.js';

const SALT_ROUNDS = 10;

// Paskyros užrakinimo politika
const MAX_FAILED = 5; // nesėkmingų bandymų riba
const LOCK_MINUTES = 15; // užrakinimo trukmė

// ─── Pagalbinės ───
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
}

/** Pašalina jautrius/vidinius laukus ir prideda rolę. */
function publicUser(record, role) {
  return { ...stripPassword(record), role };
}

/** Ar paskyra šiuo metu užrakinta? */
function isLocked(account) {
  return account.lockedUntil && account.lockedUntil > new Date();
}

/**
 * Užregistruoja nesėkmingą prisijungimą: didina skaitiklį, o pasiekus ribą —
 * užrakina paskyrą LOCK_MINUTES minutėms ir nunulina skaitiklį.
 * @param {'patient'|'specialist'} model
 */
async function registerFailedLogin(model, account) {
  await serializable(async (tx) => {
    const current = await tx[model].findUnique({ where: { id: account.id } });
    if (!current || isLocked(current)) return;
    const failedLogins = current.failedLogins + 1;
    const data =
      failedLogins >= MAX_FAILED
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
        : { failedLogins };
    await tx[model].update({ where: { id: account.id }, data });
  });
}

/** Po sėkmingo prisijungimo nunulina skaitiklį ir užraktą (jei buvo). */
async function resetLoginState(model, account) {
  if (account.failedLogins > 0 || account.lockedUntil) {
    await prisma[model].update({
      where: { id: account.id },
      data: { failedLogins: 0, lockedUntil: null },
    });
  }
}

// ─── Paciento registracija ───
export async function registerPatient(req, res, next) {
  try {
    const { name, surname, email, password, phone, birthDate } = req.body;

    const exists = await prisma.patient.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'Vartotojas su šiuo el. paštu jau registruotas.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const patient = await prisma.patient.create({
      data: {
        name,
        surname,
        email,
        passwordHash,
        phone: phone || null,
        birthDate: birthDate || null,
      },
    });

    logger.info(`Registracija: naujas pacientas #${patient.id} (${patient.email})`);
    // Sveikinimo laiškas — fire-and-forget, neblokuoja atsako.
    sendWelcomeEmail(patient);

    const user = publicUser(patient, 'patient');
    const token = signToken({ id: patient.id, role: 'patient', v: patient.tokenVersion });
    return res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

// ─── Paciento prisijungimas ───
export async function loginPatient(req, res, next) {
  try {
    const { email, password } = req.body;

    // Soft-deleted paskyros prisijungti negali (deletedAt: null)
    const patient = await prisma.patient.findFirst({ where: { email, deletedAt: null } });
    if (!patient) {
      return res.status(401).json({ error: 'Neteisingas el. paštas arba slaptažodis.' });
    }
    if (isLocked(patient)) {
      return res.status(423).json({
        error: `Paskyra laikinai užrakinta dėl daugkartinių nesėkmingų bandymų. Pabandykite po ${LOCK_MINUTES} min.`,
      });
    }
    const ok = await bcrypt.compare(password, patient.passwordHash);
    if (!ok) {
      await registerFailedLogin('patient', patient);
      logger.warn(`Nesėkmingas prisijungimas (pacientas): ${email}`);
      return res.status(401).json({ error: 'Neteisingas el. paštas arba slaptažodis.' });
    }

    await resetLoginState('patient', patient);
    logger.info(`Prisijungimas pavyko (pacientas): ${email}`);
    const user = publicUser(patient, 'patient');
    const token = signToken({ id: patient.id, role: 'patient', v: patient.tokenVersion });
    return res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

// ─── Specialisto prisijungimas (email + slaptažodis + licencija) ───
export async function loginSpecialist(req, res, next) {
  try {
    const { email, password, license } = req.body;

    const specialist = await prisma.specialist.findFirst({ where: { email, deletedAt: null } });
    // Tas pats pranešimas visais atvejais — neatskleidžiame, kuris laukas neteisingas.
    if (!specialist) {
      return res.status(401).json({ error: 'Neteisingi duomenys arba licencijos numeris.' });
    }
    if (isLocked(specialist)) {
      return res.status(423).json({
        error: `Paskyra laikinai užrakinta dėl daugkartinių nesėkmingų bandymų. Pabandykite po ${LOCK_MINUTES} min.`,
      });
    }
    const ok =
      specialist.license === license && (await bcrypt.compare(password, specialist.passwordHash));
    if (!ok) {
      await registerFailedLogin('specialist', specialist);
      logger.warn(`Nesėkmingas prisijungimas (specialistas): ${email}`);
      return res.status(401).json({ error: 'Neteisingi duomenys arba licencijos numeris.' });
    }

    await resetLoginState('specialist', specialist);
    logger.info(`Prisijungimas pavyko (specialistas): ${email}`);
    const user = publicUser(specialist, 'specialist');
    const token = signToken({ id: specialist.id, role: 'specialist', v: specialist.tokenVersion });
    return res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

// ─── Administratoriaus prisijungimas (.env kredencialai) ───
export async function loginAdmin(req, res) {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Priimami tik sukonfigūruoti administratoriaus prisijungimo duomenys.
  const emailOk = Boolean(adminEmail && adminPassword) && email === adminEmail;
  const passwordOk =
    Boolean(adminPassword) &&
    timingSafeEqual(
      createHash('sha256').update(String(password)).digest(),
      createHash('sha256').update(adminPassword).digest()
    );
  if (!emailOk || !passwordOk) {
    logger.warn(`Nesėkmingas prisijungimas (admin): ${email}`);
    return res.status(401).json({ error: 'Neteisingi administratoriaus duomenys.' });
  }

  logger.info('Prisijungimas pavyko (admin)');
  const token = signToken({ id: 'admin', role: 'admin' });
  return res.json({ token, user: { id: 'admin', name: 'Administratorius', role: 'admin' } });
}

// ─── Vienkartinė, 30 minučių galiojanti atkūrimo nuoroda ───
export async function forgotPassword(req, res, next) {
  try {
    const role = req.body.role || 'patient';
    const account = await prisma[role].findFirst({
      where: { email: req.body.email, deletedAt: null },
    });
    if (account) {
      const token = randomBytes(32).toString('hex');
      const resetTokenHash = createHash('sha256').update(token).digest('hex');
      await prisma[role].update({
        where: { id: account.id },
        data: {
          resetTokenHash,
          resetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail({ account, role, token });
    }
    return res.json({
      success: true,
      message: 'Jei tokia paskyra yra, jai parengta slaptažodžio atkūrimo nuoroda.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword, role = 'patient' } = req.body;
    const resetTokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await serializable(async (tx) => {
      const account = await tx[role].findFirst({
        where: {
          resetTokenHash,
          resetExpiresAt: { gt: new Date() },
          deletedAt: null,
        },
      });
      if (!account)
        throw httpError(400, 'Atkūrimo nuoroda neteisinga, panaudota arba nebegalioja.');
      const result = await tx[role].updateMany({
        where: {
          id: account.id,
          resetTokenHash,
          resetExpiresAt: { gt: new Date() },
          deletedAt: null,
        },
        data: {
          passwordHash,
          resetTokenHash: null,
          resetExpiresAt: null,
          failedLogins: 0,
          lockedUntil: null,
          tokenVersion: { increment: 1 },
        },
      });
      if (result.count !== 1) throw httpError(400, 'Atkūrimo nuoroda jau panaudota.');
    });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

// ─── Specialisto slaptažodžio keitimas (būtina licencija) ───
export async function changeSpecialistPassword(req, res, next) {
  try {
    const { license, currentPassword, newPassword } = req.body;

    // Tapatybė patvirtinama JWT (req.user) + licencijos numeriu.
    const specialist = await prisma.specialist.findUnique({ where: { id: req.user.id } });
    if (
      !specialist ||
      specialist.deletedAt ||
      specialist.license !== license ||
      !(await bcrypt.compare(currentPassword, specialist.passwordHash))
    ) {
      return res
        .status(403)
        .json({ error: 'Neteisingas dabartinis slaptažodis arba licencijos numeris.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updated = await prisma.specialist.update({
      where: { id: specialist.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    });
    return res.json({
      success: true,
      token: signToken({ id: updated.id, role: 'specialist', v: updated.tokenVersion }),
    });
  } catch (err) {
    next(err);
  }
}
