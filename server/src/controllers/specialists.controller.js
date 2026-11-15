/**
 * Specialistų kontroleris.
 * GET viešas (grąžina visus; vieši puslapiai filtruoja available patys, admin valdo visus).
 * Kūrimas/redagavimas/šalinimas/aktyvumo keitimas — tik admin.
 */
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { stripPassword, stripPasswords } from '../lib/serialize.js';
import logger from '../lib/logger.js';

const SALT_ROUNDS = 10;

/** specialties priimamas kaip masyvas arba kableliais atskirta eilutė. */
function normalizeSpecialties(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Inicialai iš vardo, pvz. "Rūta Kazlauskienė" -> "RK". */
function initialsFromName(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── GET /specialists (viešas) ───
// Soft-deleted nerodomi. Viešame sąraše frontend papildomai filtruoja `available`.
export async function listSpecialists(req, res, next) {
  try {
    const specialists = await prisma.specialist.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
    // Viešam katalogui nereikia prisijungimo el. pašto, telefono ar licencijos.
    res.json(
      specialists.map(
        ({ id, name, title, experience, rating, reviews, specialties, photo, available, bio }) => ({
          id,
          name,
          title,
          experience,
          rating,
          reviews,
          specialties,
          photo,
          available,
          bio,
        })
      )
    );
  } catch (err) {
    next(err);
  }
}

export async function listAdminSpecialists(req, res, next) {
  try {
    const records = await prisma.specialist.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
    res.json(stripPasswords(records));
  } catch (error) {
    next(error);
  }
}

// ─── POST /specialists (admin) ───
export async function createSpecialist(req, res, next) {
  try {
    const b = req.body;
    const passwordHash = await bcrypt.hash(b.password, SALT_ROUNDS);
    const specialist = await prisma.specialist.create({
      data: {
        name: b.name,
        title: b.title || null,
        experience: Number(b.experience) || 0,
        rating: Number(b.rating) || 0,
        reviews: Number(b.reviews) || 0,
        specialties: normalizeSpecialties(b.specialties),
        photo: b.photo || initialsFromName(b.name),
        available: b.available !== undefined ? Boolean(b.available) : true,
        bio: b.bio || null,
        license: b.license,
        email: b.email,
        phone: b.phone || null,
        passwordHash,
      },
    });
    logger.info(`Admin CRUD: sukurtas specialistas #${specialist.id} (${specialist.email})`);
    res.status(201).json(stripPassword(specialist));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /specialists/:id (admin) ───
export async function updateSpecialist(req, res, next) {
  try {
    const id = Number(req.params.id);
    const b = req.body;

    const data = {
      name: b.name,
      title: b.title ?? null,
      experience: b.experience !== undefined ? Number(b.experience) || 0 : undefined,
      rating: b.rating !== undefined ? Number(b.rating) || 0 : undefined,
      reviews: b.reviews !== undefined ? Number(b.reviews) || 0 : undefined,
      specialties: b.specialties !== undefined ? normalizeSpecialties(b.specialties) : undefined,
      photo: b.photo || (b.name ? initialsFromName(b.name) : undefined),
      available: b.available !== undefined ? Boolean(b.available) : undefined,
      bio: b.bio ?? undefined,
      license: b.license,
      email: b.email,
      phone: b.phone ?? undefined,
    };
    // Slaptažodis keičiamas tik jei pateiktas
    if (b.password) {
      data.passwordHash = await bcrypt.hash(b.password, SALT_ROUNDS);
      data.tokenVersion = { increment: 1 };
      data.resetTokenHash = null;
      data.resetExpiresAt = null;
    }
    // Pašaliname undefined laukus, kad neperrašytume nepateiktų reikšmių
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const specialist = await prisma.specialist.update({ where: { id }, data });
    logger.info(`Admin CRUD: atnaujintas specialistas #${id}`);
    res.json(stripPassword(specialist));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /specialists/:id (admin) — soft delete (deletedAt) ───
export async function deleteSpecialist(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.specialist.update({ where: { id }, data: { deletedAt: new Date() } });
    logger.info(`Admin CRUD: pašalintas (soft delete) specialistas #${id}`);
    res.json({ id });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /specialists/:id/toggle (admin) ───
export async function toggleSpecialist(req, res, next) {
  try {
    const id = Number(req.params.id);
    const current = await prisma.specialist.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Specialistas nerastas.' });
    }
    const specialist = await prisma.specialist.update({
      where: { id },
      data: { available: !current.available },
    });
    logger.info(`Admin CRUD: specialisto #${id} aktyvumas -> ${specialist.available}`);
    res.json(stripPassword(specialist));
  } catch (err) {
    next(err);
  }
}
