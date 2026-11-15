/**
 * Paslaugų kontroleris.
 * Viešas sąrašas grąžina tik aktyvias paslaugas. Kūrimas, redagavimas, šalinimas ir
 * aktyvumo keitimas – tik administratoriui. Paslauga, turinti vizitų, nešalinama
 * (istoriniai vizitai saugo jos kainą ir trukmę) – vietoje to išjungiamas aktyvumas.
 */
import { prisma } from '../lib/prisma.js';
import logger from '../lib/logger.js';

const withVisitCount = { _count: { select: { visits: true } } };

/** Administravimo sąrašui pridedamas vizitų skaičius (`visitCount`). */
function formatService({ _count, ...service }) {
  return { ...service, visitCount: _count?.visits ?? 0 };
}

/** Iš užklausos kūno paimami tik leidžiami laukai; nepateikti laukai nekeičiami. */
function serviceData(b) {
  const data = {
    name: typeof b.name === 'string' ? b.name.trim() : undefined,
    category: typeof b.category === 'string' ? b.category.trim() : undefined,
    description:
      b.description === undefined ? undefined : String(b.description ?? '').trim() || null,
    price: b.price !== undefined ? Number(b.price) : undefined,
    duration: b.duration !== undefined ? Number(b.duration) : undefined,
    active: b.active !== undefined ? Boolean(b.active) : undefined,
  };
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
}

// ─── GET /services (viešas) — tik aktyvios paslaugos ───
export async function listServices(req, res, next) {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

// ─── GET /services/admin — visos paslaugos su vizitų skaičiumi ───
export async function listAdminServices(req, res, next) {
  try {
    const services = await prisma.service.findMany({
      include: withVisitCount,
      orderBy: { id: 'asc' },
    });
    res.json(services.map(formatService));
  } catch (err) {
    next(err);
  }
}

// ─── POST /services (admin) ───
export async function createService(req, res, next) {
  try {
    const service = await prisma.service.create({
      data: { active: true, ...serviceData(req.body) },
    });
    logger.info(`Admin CRUD: sukurta paslauga #${service.id} (${service.name})`);
    res.status(201).json({ ...service, visitCount: 0 });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /services/:id (admin) ───
// Kainos ar trukmės pakeitimas galioja tik naujoms rezervacijoms: esami vizitai
// saugo rezervavimo metu galiojusias reikšmes.
export async function updateService(req, res, next) {
  try {
    const id = Number(req.params.id);
    const service = await prisma.service.update({
      where: { id },
      data: serviceData(req.body),
      include: withVisitCount,
    });
    logger.info(`Admin CRUD: atnaujinta paslauga #${id}`);
    res.json(formatService(service));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /services/:id (admin) — tik paslauga be vizitų ───
export async function deleteService(req, res, next) {
  try {
    const id = Number(req.params.id);
    const service = await prisma.service.findUnique({ where: { id }, include: withVisitCount });
    if (!service) return res.status(404).json({ error: 'Paslauga nerasta.' });
    if (service._count.visits > 0) {
      return res.status(409).json({
        error: `Paslaugai priskirtų vizitų: ${service._count.visits}. Vietoje šalinimo išjunkite jos aktyvumą.`,
      });
    }
    await prisma.service.delete({ where: { id } });
    logger.info(`Admin CRUD: pašalinta paslauga #${id}`);
    res.json({ id });
  } catch (err) {
    // Lygiagrečiai sukurtas vizitas: DB išorinio rakto apribojimas (ON DELETE RESTRICT).
    if (err.code === 'P2003') {
      return res
        .status(409)
        .json({ error: 'Paslauga turi vizitų. Vietoje šalinimo išjunkite jos aktyvumą.' });
    }
    next(err);
  }
}

// ─── PATCH /services/:id/toggle (admin) ───
export async function toggleService(req, res, next) {
  try {
    const id = Number(req.params.id);
    const current = await prisma.service.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Paslauga nerasta.' });
    const service = await prisma.service.update({
      where: { id },
      data: { active: !current.active },
      include: withVisitCount,
    });
    logger.info(`Admin CRUD: paslaugos #${id} aktyvumas -> ${service.active}`);
    res.json(formatService(service));
  } catch (err) {
    next(err);
  }
}
