import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  app,
  request,
  prisma,
  createPatientAccount,
  createSpecialistAccount,
  createTestService,
  patientToken,
  specialistToken,
  cleanupTestData,
} from './helpers.js';

let patient, token, specialist, specialistAuth, secondSpecialist, service;
let day = 0;
function date() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30 + ++day * 7);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const post = (payload) =>
  request(app)
    .post('/api/visits')
    .set('Authorization', 'Bearer ' + token)
    .send({ serviceId: service.id, specialistId: specialist.id, ...payload });

beforeAll(async () => {
  const account = await createPatientAccount();
  patient = account.patient;
  token = await patientToken(account.email, account.password);
  const sp = await createSpecialistAccount();
  specialist = sp.specialist;
  specialistAuth = await specialistToken(sp.email, sp.password, sp.license);
  secondSpecialist = (await createSpecialistAccount()).specialist;
  service = await createTestService();
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Rezervacijų vientisumas', () => {
  it('atšaukus vizitą tas pats laikas gali būti rezervuojamas iš naujo', async () => {
    const payload = { date: date(), time: '09:00' };
    const first = await post(payload);
    expect(first.status).toBe(201);
    const cancelled = await request(app)
      .patch('/api/visits/' + first.body.id + '/cancel')
      .set('Authorization', 'Bearer ' + token)
      .send({ reason: 'Pasikeitė planai' });
    expect(cancelled.status).toBe(200);
    const second = await post(payload);
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });
  it('blokuojamas dalinis persidengimas, gretimas intervalas leidžiamas', async () => {
    const d = date();
    expect((await post({ date: d, time: '9:00' })).status).toBe(201);
    expect((await post({ date: d, time: '09:00' })).status).toBe(409);
    expect((await post({ date: d, time: '09:30' })).status).toBe(409);
    expect((await post({ date: d, time: '10:00' })).status).toBe(201);
  });
  it('pacientas negali turėti persidengiančių vizitų pas skirtingus specialistus', async () => {
    const d = date();
    expect((await post({ date: d, time: '09:00' })).status).toBe(201);
    expect((await post({ date: d, time: '09:30', specialistId: secondSpecialist.id })).status).toBe(
      409
    );
  });
  it('kainos, trukmės, būsenos ir medicininių laukų klastojimas atmetamas', async () => {
    for (const extra of [
      { price: 0 },
      { duration: 1 },
      { status: 'įvykęs' },
      { diagnosis: 'Pakeista' },
    ]) {
      expect((await post({ date: date(), time: '09:00', ...extra })).status).toBe(400);
    }
    const result = await post({ date: date(), time: '09:00', patientId: patient.id + 99999 });
    expect(result.status).toBe(201);
    expect(result.body.patientId).toBe(patient.id);
    expect(result.body.price).toBe(service.price);
    expect(result.body.duration).toBe(service.duration);
  });
  it('atmetamos neegzistuojančios, praeities datos ir netinkami laikai', async () => {
    for (const payload of [
      { date: '2026-02-30', time: '09:00' },
      { date: '2000-01-01', time: '09:00' },
      { date: date(), time: '24:00' },
      { date: date(), time: '19:30' },
      { date: date(), time: '09:07' },
    ]) {
      expect((await post(payload)).status).toBe(400);
    }
  });
  it('neaktyvus arba pašalintas specialistas negali gauti naujų rezervacijų', async () => {
    await prisma.specialist.update({
      where: { id: secondSpecialist.id },
      data: { available: false },
    });
    expect(
      (await post({ date: date(), time: '09:00', specialistId: secondSpecialist.id })).status
    ).toBe(409);
    await prisma.specialist.update({
      where: { id: secondSpecialist.id },
      data: { available: true, deletedAt: new Date() },
    });
    expect(
      (await post({ date: date(), time: '09:00', specialistId: secondSpecialist.id })).status
    ).toBe(409);
  });
  it('laikų lentelė: užimti laikai visiems, paciento persidengiantys – tik su jo token', async () => {
    const d = date();
    expect((await post({ date: d, time: '09:00' })).status).toBe(201);
    const freeSpecialist = (await createSpecialistAccount()).specialist;
    const query = (specialistId) => ({ date: d, specialistId, serviceId: service.id });

    // Neprisijungęs lankytojas: 09:00 ir 09:30 užimti (60 min trukmė), own tuščias
    const anonymous = await request(app)
      .get('/api/visits/availability')
      .query(query(specialist.id));
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.slots).toEqual(
      expect.arrayContaining(['08:00', '09:00', '09:30', '10:00'])
    );
    expect(anonymous.body.taken).toEqual(expect.arrayContaining(['09:00', '09:30']));
    expect(anonymous.body.taken).not.toContain('10:00');
    expect(anonymous.body.own).toEqual([]);
    expect(anonymous.body.available).not.toContain('09:30');
    expect(anonymous.body.available).toContain('10:00');
    expect(anonymous.body.slots.length).toBe(
      anonymous.body.taken.length + anonymous.body.available.length
    );

    // Tas pats pacientas pas laisvą kitą specialistą: specialistas laisvas, bet laikas
    // persidengia su jo paties vizitu – own, ne taken, ir ne available
    const own = await request(app)
      .get('/api/visits/availability')
      .set('Authorization', 'Bearer ' + token)
      .query(query(freeSpecialist.id));
    expect(own.status).toBe(200);
    expect(own.body.taken).not.toContain('09:00');
    expect(own.body.own).toEqual(['08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45']);
    expect(own.body.available).not.toContain('09:00');
    expect(own.body.available).toContain('10:00');

    // Kitas pacientas tą patį laiką pas kitą specialistą gali rinktis
    const other = await createPatientAccount();
    const otherToken = await patientToken(other.email, other.password);
    const others = await request(app)
      .get('/api/visits/availability')
      .set('Authorization', 'Bearer ' + otherToken)
      .query(query(freeSpecialist.id));
    expect(others.body.own).toEqual([]);
    expect(others.body.available).toContain('09:00');

    // Negaliojantis token viešo maršruto nelaužo – atsakoma kaip neprisijungusiam
    const invalid = await request(app)
      .get('/api/visits/availability')
      .set('Authorization', 'Bearer neteisingas')
      .query(query(specialist.id));
    expect(invalid.status).toBe(200);
    expect(invalid.body.own).toEqual([]);
  });
  it('laisvų laikų API atsižvelgia į visą trukmę ir neatiduoda pacientų duomenų', async () => {
    const d = date();
    await post({ date: d, time: '09:00' });
    const response = await request(app)
      .get('/api/visits/availability')
      .query({ date: d, specialistId: specialist.id, serviceId: service.id });
    expect(response.status).toBe(200);
    expect(response.body.available).not.toContain('09:30');
    expect(response.body.available).toContain('10:00');
    expect(response.body.patient).toBeUndefined();
    expect(
      (await request(app).get('/api/visits/availability').query({ date: 'bad', specialistId: 'x' }))
        .status
    ).toBe(400);
  });
  it('lygiagrečios to paties intervalo užklausos sukuria vieną vizitą', async () => {
    const payload = { date: date(), time: '09:00' };
    const responses = await Promise.all([post(payload), post(payload)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.visit.count({
        where: { specialistId: specialist.id, date: payload.date, time: payload.time },
      })
    ).toBe(1);
  });
  it('neleidžiama iš naujo aktyvuoti įvykusio vizito arba pakeisti būseną į neegzistuojančią', async () => {
    const created = await post({ date: date(), time: '09:00' });
    const update = (status) =>
      request(app)
        .patch('/api/visits/' + created.body.id)
        .set('Authorization', 'Bearer ' + specialistAuth)
        .send({ status });
    expect((await update('klaida')).status).toBe(400);
    expect((await update('įvykęs')).status).toBe(200);
    expect((await update('laukiamas')).status).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/visits/' + created.body.id + '/cancel')
          .set('Authorization', 'Bearer ' + token)
          .send({ reason: 'Bandymas' })
      ).status
    ).toBe(409);
  });
});
