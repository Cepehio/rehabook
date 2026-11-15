/**
 * Vizitų kontroleris.
 * Apima nuosavybės tikrinimą (pacientas/specialistas mato tik savo) ir
 * dvigubo rezervavimo prevenciją kuriant vizitą.
 */
import { prisma } from '../lib/prisma.js';
import { formatVisit, formatVisits } from '../lib/serialize.js';
import { parsePagination, parseSort, paginated } from '../lib/pagination.js';
import logger from '../lib/logger.js';
import { sendVisitConfirmation, sendVisitCancellation } from '../lib/mailer.js';
import { serializable, httpError } from '../lib/transaction.js';
import {
  availableSlots,
  availableSlotsAny,
  bookingError,
  normalizeTime,
  overlaps,
  canTransition,
  pickLeastLoadedSpecialist,
  weekRange,
  ACTIVE_STATUSES,
  CLINIC_TIME_ZONE,
} from '../../../shared/booking.js';

const includeService = { service: true };
const activeSpecialists = { deletedAt: null, available: true };

/**
 * Darbo krūvio paskirstymas: kai pacientas nepasirenka konkretaus
 * specialisto, vizitas priskiriamas tam, kuris pasirinktu laiku laisvas visai
 * paslaugos trukmei ir turi mažiausią tos dienos (toliau – savaitės) krūvį.
 * Vykdoma toje pačioje Serializable transakcijoje kaip ir vizito įrašymas.
 */
async function assignLeastLoadedSpecialist(tx, date, time, duration) {
  const specialists = await tx.specialist.findMany({
    where: activeSpecialists,
    orderBy: { id: 'asc' },
  });
  if (!specialists.length) return null;
  const week = weekRange(date);
  const visits = await tx.visit.findMany({
    where: {
      date: { gte: week.start, lte: week.end },
      status: { not: 'atšauktas' },
      specialistId: { in: specialists.map((s) => s.id) },
    },
    select: { specialistId: true, date: true, time: true, duration: true, status: true },
  });
  const candidates = specialists.map((specialist) => {
    const weekVisits = visits.filter((v) => v.specialistId === specialist.id);
    return {
      id: specialist.id,
      dayVisits: weekVisits.filter((v) => v.date === date),
      weekVisits,
    };
  });
  const chosen = pickLeastLoadedSpecialist(candidates, time, duration);
  return chosen ? specialists.find((s) => s.id === chosen.id) : null;
}

// ─── GET /visits (admin) — puslapiavimas ir filtrai ───
export async function listAllVisits(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(req.query.sort, ['date', 'time', 'status', 'id', 'price'], {
      date: 'desc',
    });

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.specialistId) where.specialistId = Number(req.query.specialistId);
    // Datos intervalas (data laikoma "YYYY-MM-DD" eilute — leksinis palyginimas tinka)
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) where.date.gte = req.query.dateFrom;
      if (req.query.dateTo) where.date.lte = req.query.dateTo;
    }

    const [total, visits] = await Promise.all([
      prisma.visit.count({ where }),
      prisma.visit.findMany({ where, include: includeService, orderBy, skip, take: limit }),
    ]);

    res.json(paginated(formatVisits(visits), total, page, limit));
  } catch (err) {
    next(err);
  }
}

// ─── GET /visits/availability?serviceId=&date=[&specialistId=] (viešas) ───
// Grąžina visą pasirinktos dienos pradžios laikų lentelę pagal paslaugos trukmę:
//  - slots     – visi galimi pradžios laikai darbo valandomis;
//  - taken     – laikai, kuriais specialistas (be specialistId – visi priimantys
//                specialistai) užimtas bent dalį paslaugos trukmės; jie
//                nepasirenkami nė vienam pacientui;
//  - own       – prisijungusio paciento laikai, persidengiantys su jo paties
//                vizitais (su galiojančiu token; neprisijungus – tuščias sąrašas);
//  - available – laikai, kuriuos šis lankytojas gali rezervuoti (slots be taken ir own).
// Atšaukti vizitai neskaičiuojami (laikas atsilaisvina). Galutinė patikra visada
// atliekama kuriant vizitą (Serializable transakcija), todėl lentelė yra tik
// pagalba pasirinkimui, o ne vienintelė apsauga nuo dvigubos rezervacijos.
export async function listAvailability(req, res, next) {
  try {
    const date = req.query.date;
    const service = await prisma.service.findUnique({ where: { id: Number(req.query.serviceId) } });
    if (!service || !service.active) return res.status(404).json({ error: 'Paslauga nerasta.' });
    const slots = availableSlots(date, service.duration, []);
    const ownVisits =
      req.user?.role === 'patient'
        ? await prisma.visit.findMany({
            where: { patientId: req.user.id, date, status: { not: 'atšauktas' } },
            select: { time: true, duration: true, status: true },
          })
        : [];
    const own = slots.filter((time) => ownVisits.some((v) => overlaps(time, service.duration, v)));
    const response = { date, duration: service.duration, timeZone: CLINIC_TIME_ZONE };
    const table = (free) => ({
      slots,
      taken: slots.filter((time) => !free.includes(time)),
      own,
      available: free.filter((time) => !own.includes(time)),
    });

    if (req.query.specialistId === undefined) {
      const specialists = await prisma.specialist.findMany({
        where: activeSpecialists,
        select: { id: true },
      });
      const visits = await prisma.visit.findMany({
        where: {
          date,
          status: { not: 'atšauktas' },
          specialistId: { in: specialists.map((s) => s.id) },
        },
        select: { specialistId: true, time: true, duration: true, status: true },
      });
      const free = availableSlotsAny(
        date,
        service.duration,
        specialists.map((s) => visits.filter((v) => v.specialistId === s.id))
      );
      return res.json({
        ...response,
        specialistId: null,
        specialists: specialists.length,
        ...table(free),
      });
    }

    const specialistId = Number(req.query.specialistId);
    const [specialist, visits] = await Promise.all([
      prisma.specialist.findFirst({ where: { id: specialistId, deletedAt: null } }),
      prisma.visit.findMany({
        where: { specialistId, date, status: { not: 'atšauktas' } },
        select: { time: true, duration: true, status: true },
      }),
    ]);
    if (!specialist) return res.status(404).json({ error: 'Specialistas arba paslauga nerasta.' });
    const free = specialist.available ? availableSlots(date, service.duration, visits) : [];
    res.json({ ...response, specialistId, ...table(free) });
  } catch (err) {
    next(err);
  }
}

// ─── GET /visits/patient/:id (savininkas arba admin) ───
export async function listVisitsByPatient(req, res, next) {
  try {
    const patientId = Number(req.params.id);
    if (req.user.role !== 'admin' && !(req.user.role === 'patient' && req.user.id === patientId)) {
      return res.status(403).json({ error: 'Galite matyti tik savo vizitus.' });
    }
    const visits = await prisma.visit.findMany({
      where: { patientId },
      include: includeService,
      orderBy: { date: 'desc' },
    });
    res.json(formatVisits(visits));
  } catch (err) {
    next(err);
  }
}

// ─── GET /visits/specialist/:id (savininkas arba admin) ───
export async function listVisitsBySpecialist(req, res, next) {
  try {
    const specialistId = Number(req.params.id);
    if (
      req.user.role !== 'admin' &&
      !(req.user.role === 'specialist' && req.user.id === specialistId)
    ) {
      return res.status(403).json({ error: 'Galite matyti tik savo vizitus.' });
    }
    const visits = await prisma.visit.findMany({
      where: { specialistId },
      include: { service: true, patient: true },
      orderBy: { date: 'desc' },
    });
    res.json(formatVisits(visits));
  } catch (err) {
    next(err);
  }
}

// ─── POST /visits (patient -> savo; admin -> nurodo patientId) ───
// specialistId neprivalomas: be jo specialistas priskiriamas automatiškai pagal darbo krūvį.
export async function createVisit(req, res, next) {
  try {
    const b = req.body;

    const patientId = req.user.role === 'patient' ? req.user.id : Number(b.patientId);
    const requestedSpecialistId =
      b.specialistId === undefined || b.specialistId === null ? null : Number(b.specialistId);
    const time = normalizeTime(b.time);
    const { visit, patient, specialist, service } = await serializable(async (tx) => {
      const service = await tx.service.findUnique({
        where: b.serviceId !== undefined ? { id: Number(b.serviceId) } : { name: b.service },
      });
      if (!service) throw httpError(400, 'Nurodyta paslauga nerasta.');
      if (!service.active) throw httpError(400, 'Ši paslauga šiuo metu neteikiama.');
      const invalid = bookingError(b.date, time, service.duration);
      if (invalid) throw httpError(400, invalid);
      const patient = await tx.patient.findFirst({ where: { id: patientId, deletedAt: null } });
      if (!patient) throw httpError(404, 'Paciento paskyra nerasta arba neaktyvi.');

      // Tikrinami ir specialisto, ir paciento intervalai. Skaitymas ir įrašymas yra vienoje transakcijoje.
      let specialist;
      if (requestedSpecialistId !== null) {
        specialist = await tx.specialist.findFirst({
          where: { id: requestedSpecialistId, ...activeSpecialists },
        });
        if (!specialist) throw httpError(409, 'Specialistas šiuo metu vizitų nepriima.');
        const specialistVisits = await tx.visit.findMany({
          where: { date: b.date, specialistId: specialist.id, status: { not: 'atšauktas' } },
        });
        if (specialistVisits.some((v) => overlaps(time, service.duration, v)))
          throw httpError(409, 'Specialistas užimtas bent dalį pasirinktos paslaugos laiko.');
      } else {
        specialist = await assignLeastLoadedSpecialist(tx, b.date, time, service.duration);
        if (!specialist)
          throw httpError(409, 'Pasirinktu laiku laisvų specialistų nėra. Pasirinkite kitą laiką.');
      }
      const patientVisits = await tx.visit.findMany({
        where: { date: b.date, patientId, status: { not: 'atšauktas' } },
      });
      if (patientVisits.some((v) => overlaps(time, service.duration, v)))
        throw httpError(409, 'Jau turite vizitą, kuris persidengia su pasirinktu laiku.');

      // Kaina, trukmė, būsena ir medicininiai laukai nėra priimami iš rezervacijos formos.
      const visit = await tx.visit.create({
        data: {
          patientId,
          specialistId: specialist.id,
          serviceId: service.id,
          date: b.date,
          time,
          price: service.price,
          duration: service.duration,
          status: 'laukiamas',
        },
        include: { ...includeService, specialist: true },
      });
      return { visit, patient, specialist, service };
    });

    logger.info(
      `Vizitas sukurtas #${visit.id}: pacientas #${patientId}, specialistas #${specialist.id}` +
        `${requestedSpecialistId === null ? ' (priskirtas automatiškai)' : ''}, ${visit.date} ${visit.time}`
    );

    // Patvirtinimo laiškas pacientui — fire-and-forget (neblokuoja atsako).
    sendVisitConfirmation({ patient, specialist, service, visit });

    res.status(201).json({ ...formatVisit(visit), autoAssigned: requestedSpecialistId === null });
  } catch (err) {
    // Atsarginė dvigubo rezervavimo gaudyklė (unikalumo apribojimas)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Šis specialistas pasirinktu laiku jau užimtas.' });
    }
    next(err);
  }
}

// ─── PATCH /visits/:id/cancel (savininkas pacientas arba admin) ───
export async function cancelVisit(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;

    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return res.status(404).json({ error: 'Vizitas nerastas.' });
    }
    if (
      req.user.role !== 'admin' &&
      !(req.user.role === 'patient' && visit.patientId === req.user.id)
    ) {
      return res.status(403).json({ error: 'Galite atšaukti tik savo vizitą.' });
    }
    if (!ACTIVE_STATUSES.includes(visit.status)) {
      return res
        .status(409)
        .json({ error: 'Atšaukti galima tik laukiamą arba patvirtintą vizitą.' });
    }
    const changed = await prisma.visit.updateMany({
      where: { id, status: visit.status },
      data: { status: 'atšauktas', cancelReason: reason },
    });
    if (!changed.count)
      return res.status(409).json({ error: 'Vizito būsena pasikeitė. Atnaujinkite sąrašą.' });
    const updated = await prisma.visit.findUnique({ where: { id }, include: includeService });

    logger.info(`Vizitas atšauktas #${id} (vartotojas: ${req.user.role} #${req.user.id})`);

    // Pranešimas pacientui apie atšaukimą — fire-and-forget.
    const patient = await prisma.patient.findUnique({ where: { id: updated.patientId } });
    sendVisitCancellation({ patient, visit: updated });

    res.json(formatVisit(updated));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /visits/:id (specialistas savininkas arba admin) ───
export async function updateVisit(req, res, next) {
  try {
    const id = Number(req.params.id);
    const b = req.body;

    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return res.status(404).json({ error: 'Vizitas nerastas.' });
    }
    if (
      req.user.role !== 'admin' &&
      !(req.user.role === 'specialist' && visit.specialistId === req.user.id)
    ) {
      return res.status(403).json({ error: 'Galite atnaujinti tik savo vizitą.' });
    }

    if (b.status !== undefined && !canTransition(visit.status, b.status)) {
      return res.status(409).json({ error: 'Toks vizito būsenos pakeitimas neleidžiamas.' });
    }
    if (visit.status === 'atšauktas')
      return res.status(409).json({ error: 'Atšaukto vizito keisti nebegalima.' });
    if (b.status === 'atšauktas' && !b.cancelReason?.trim()) {
      return res.status(400).json({ error: 'Atšaukimo priežastis privaloma.' });
    }
    const data = {};
    for (const field of [
      'diagnosis',
      'procedures',
      'recommendations',
      'status',
      'nextVisit',
      'cancelReason',
    ]) {
      if (b[field] !== undefined) data[field] = b[field];
    }
    const changed = await prisma.visit.updateMany({
      where: { id, status: visit.status },
      data,
    });
    if (!changed.count)
      return res.status(409).json({ error: 'Vizito būsena pasikeitė. Atnaujinkite sąrašą.' });
    const updated = await prisma.visit.findUnique({ where: { id }, include: includeService });
    if (b.status === 'atšauktas') {
      const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
      sendVisitCancellation({ patient, visit: updated });
    }
    res.json(formatVisit(updated));
  } catch (err) {
    next(err);
  }
}
