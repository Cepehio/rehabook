/**
 * Darbo krūvio paskirstymo testai (automatinis specialisto priskyrimas):
 *  - POST /visits be specialistId priskiria laisvą ir mažiausiai apkrautą specialistą;
 *  - užimtas specialistas pasirinktu laiku praleidžiamas;
 *  - kai laisvų specialistų nėra – 409;
 *  - GET /visits/availability be specialistId grąžina laikų sąjungą per visus specialistus;
 *  - neprieinamas (available=false) specialistas nekandidatuoja.
 *
 * Kad rezultatas nepriklausytų nuo kitų (pvz. demonstracinių) specialistų test DB,
 * testo metu laikinai išjungiami visi kiti priimantys specialistai; po testų jie atstatomi.
 */
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  app,
  request,
  prisma,
  createPatientAccount,
  createSpecialistAccount,
  createTestService,
  patientToken,
  cleanupTestData,
} from './helpers.js';

let tokenA, tokenB, tokenC, first, second, service;
let otherSpecialistIds = [];
let day = 0;
function date() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 60 + ++day * 7);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const post = (token, payload) =>
  request(app)
    .post('/api/visits')
    .set('Authorization', 'Bearer ' + token)
    .send({ serviceId: service.id, ...payload });

beforeAll(async () => {
  const [a, b, c] = await Promise.all([
    createPatientAccount(),
    createPatientAccount(),
    createPatientAccount(),
  ]);
  [tokenA, tokenB, tokenC] = await Promise.all([
    patientToken(a.email, a.password),
    patientToken(b.email, b.password),
    patientToken(c.email, c.password),
  ]);
  first = (await createSpecialistAccount()).specialist;
  second = (await createSpecialistAccount()).specialist;
  service = await createTestService();
  const others = await prisma.specialist.findMany({
    where: { available: true, deletedAt: null, id: { notIn: [first.id, second.id] } },
    select: { id: true },
  });
  otherSpecialistIds = others.map((s) => s.id);
  if (otherSpecialistIds.length) {
    await prisma.specialist.updateMany({
      where: { id: { in: otherSpecialistIds } },
      data: { available: false },
    });
  }
});
afterAll(async () => {
  if (otherSpecialistIds.length) {
    await prisma.specialist.updateMany({
      where: { id: { in: otherSpecialistIds } },
      data: { available: true },
    });
  }
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Automatinis specialisto priskyrimas pagal darbo krūvį', () => {
  it('be specialistId parenkamas laisvas ir mažiausiai apkrautas specialistas', async () => {
    const d = date();
    // Pirmasis specialistas užimtas 09:00–10:00 (pasirinktas aiškiai)
    const explicit = await post(tokenA, { specialistId: first.id, date: d, time: '09:00' });
    expect(explicit.status).toBe(201);
    expect(explicit.body.autoAssigned).toBe(false);

    // 09:30 pirmasis užimtas -> priskiriamas antrasis
    const auto = await post(tokenB, { date: d, time: '09:30' });
    expect(auto.status).toBe(201);
    expect(auto.body.autoAssigned).toBe(true);
    expect(auto.body.specialistId).toBe(second.id);
    expect(auto.body.specialist).toEqual({ id: second.id, name: second.name });

    // 14:00 laisvi abu; abiejų dienos krūvis po 60 min -> mažesnis ID (pirmasis)
    const tie = await post(tokenC, { date: d, time: '14:00' });
    expect(tie.status).toBe(201);
    expect(tie.body.specialistId).toBe(Math.min(first.id, second.id));
  });

  it('mažesnį dienos krūvį turintis specialistas gauna naują vizitą', async () => {
    const d = date();
    await post(tokenA, { specialistId: first.id, date: d, time: '08:00' });
    await post(tokenB, { specialistId: first.id, date: d, time: '10:00' });
    // pirmasis: 120 min, antrasis: 0 min -> antrasis
    const auto = await post(tokenC, { date: d, time: '12:00' });
    expect(auto.status).toBe(201);
    expect(auto.body.specialistId).toBe(second.id);
  });

  it('kai pasirinktu laiku laisvų specialistų nėra -> 409', async () => {
    const d = date();
    expect((await post(tokenA, { specialistId: first.id, date: d, time: '11:00' })).status).toBe(
      201
    );
    expect((await post(tokenB, { specialistId: second.id, date: d, time: '11:00' })).status).toBe(
      201
    );
    const none = await post(tokenC, { date: d, time: '11:30' });
    expect(none.status).toBe(409);
    expect(none.body.error).toMatch(/laisvų specialistų/i);
  });

  it('laisvų laikų API be specialistId grąžina laikus, kai laisvas bent vienas', async () => {
    const d = date();
    await post(tokenA, { specialistId: first.id, date: d, time: '09:00' });
    await post(tokenB, { specialistId: second.id, date: d, time: '10:00' });
    const res = await request(app)
      .get('/api/visits/availability')
      .query({ date: d, serviceId: service.id });
    expect(res.status).toBe(200);
    expect(res.body.specialistId).toBeNull();
    expect(res.body.specialists).toBe(2);
    expect(res.body.available).toContain('09:00'); // laisvas antrasis
    expect(res.body.available).toContain('10:00'); // laisvas pirmasis
    expect(res.body.available).not.toContain('09:30'); // užimti abu
    expect(res.body.taken).toContain('09:30');
  });

  it('neprieinamas specialistas nekandidatuoja į automatinį priskyrimą', async () => {
    await prisma.specialist.update({ where: { id: second.id }, data: { available: false } });
    try {
      const d = date();
      const res = await post(tokenA, { date: d, time: '15:00' });
      expect(res.status).toBe(201);
      expect(res.body.specialistId).toBe(first.id);
      const availability = await request(app)
        .get('/api/visits/availability')
        .query({ date: d, serviceId: service.id });
      expect(availability.body.specialists).toBe(1);
    } finally {
      await prisma.specialist.update({ where: { id: second.id }, data: { available: true } });
    }
  });
});
