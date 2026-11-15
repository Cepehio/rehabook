/**
 * Pacientų kontroleris. Visi veiksmai — tik admin.
 */
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { stripPassword, stripPasswords } from '../lib/serialize.js';
import { parsePagination, parseSort, paginated } from '../lib/pagination.js';
import logger from '../lib/logger.js';

const SALT_ROUNDS = 10;

// ─── GET /patients (admin) — puslapiavimas, paieška, soft delete filtras ───
export async function listPatients(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(
      req.query.sort,
      ['id', 'name', 'surname', 'email', 'registeredDate'],
      {
        id: 'asc',
      }
    );

    // Pagal nutylėjimą rodomi tik neištrinti; admin gali matyti ištrintus su ?includeDeleted=1
    const includeDeleted = req.query.includeDeleted === '1';
    const where = includeDeleted ? {} : { deletedAt: null };

    // Paieška pagal vardą / pavardę / el. paštą
    const search = (req.query.search || '').trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({ where, orderBy, skip, take: limit }),
    ]);

    res.json(paginated(stripPasswords(patients), total, page, limit));
  } catch (err) {
    next(err);
  }
}

// ─── POST /patients (admin) ───
export async function createPatient(req, res, next) {
  try {
    const b = req.body;
    const passwordHash = await bcrypt.hash(b.password, SALT_ROUNDS);
    const patient = await prisma.patient.create({
      data: {
        name: b.name,
        surname: b.surname,
        email: b.email,
        passwordHash,
        phone: b.phone || null,
        birthDate: b.birthDate || null,
      },
    });
    logger.info(`Admin CRUD: sukurtas pacientas #${patient.id} (${patient.email})`);
    res.status(201).json(stripPassword(patient));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /patients/:id (admin) ───
export async function updatePatient(req, res, next) {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const data = {
      name: b.name,
      surname: b.surname,
      email: b.email,
      phone: b.phone ?? undefined,
      birthDate: b.birthDate ?? undefined,
    };
    if (b.password) {
      data.passwordHash = await bcrypt.hash(b.password, SALT_ROUNDS);
      data.tokenVersion = { increment: 1 };
      data.resetTokenHash = null;
      data.resetExpiresAt = null;
    }
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const patient = await prisma.patient.update({ where: { id }, data });
    logger.info(`Admin CRUD: atnaujintas pacientas #${id}`);
    res.json(stripPassword(patient));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /patients/:id (admin) — soft delete (deletedAt) ───
export async function deletePatient(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
    logger.info(`Admin CRUD: pašalintas (soft delete) pacientas #${id}`);
    res.json({ id });
  } catch (err) {
    next(err);
  }
}
