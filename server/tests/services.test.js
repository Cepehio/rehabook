/**
 * Paslaugų administravimo testai (/api/services):
 *  - administratorius kuria paslaugą, ji matoma viešame sąraše;
 *  - pacientas ir neprisijungęs lankytojas paslaugų keisti negali (403 / 401);
 *  - įvesties validacija (pavadinimas, kaina, trukmė) ir pavadinimo unikalumas;
 *  - redagavus kainą esamas vizitas išsaugo senąją, nauja rezervacija gauna naująją;
 *  - išjungta paslauga dingsta iš viešo sąrašo, laisvų laikų ir rezervacijų;
 *  - paslauga su vizitais nešalinama (409), be vizitų — pašalinama.
 */
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  app,
  request,
  prisma,
  uniq,
  createPatientAccount,
  createSpecialistAccount,
  createTestService,
  patientToken,
  adminToken,
  cleanupTestData,
} from './helpers.js';

let admin, patient, patientAuth, specialist;
let day = 0;
function date() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 90 + ++day * 7);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const payload = (extra = {}) => ({
  name: uniq('Paslauga'),
  category: 'Testas',
  description: 'Testinė paslauga',
  price: 40,
  duration: 45,
  ...extra,
});
const asAdmin = (req) => req.set('Authorization', 'Bearer ' + admin);
const book = (serviceId, time = '09:00') =>
  request(app)
    .post('/api/visits')
    .set('Authorization', 'Bearer ' + patientAuth)
    .send({ serviceId, specialistId: specialist.id, date: date(), time });

beforeAll(async () => {
  admin = await adminToken();
  const account = await createPatientAccount();
  patient = account.patient;
  patientAuth = await patientToken(account.email, account.password);
  specialist = (await createSpecialistAccount()).specialist;
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Paslaugų administravimas', () => {
  it('administratorius sukuria paslaugą; ji matoma viešame ir administravimo sąrašuose', async () => {
    const created = await asAdmin(request(app).post('/api/services')).send(payload());
    expect(created.status).toBe(201);
    expect(created.body.active).toBe(true);
    expect(created.body.visitCount).toBe(0);
    expect(created.body.price).toBe(40);

    const publicList = await request(app).get('/api/services');
    expect(publicList.status).toBe(200);
    expect(publicList.body.some((s) => s.id === created.body.id)).toBe(true);

    const adminList = await asAdmin(request(app).get('/api/services/admin'));
    expect(adminList.status).toBe(200);
    const row = adminList.body.find((s) => s.id === created.body.id);
    expect(row.visitCount).toBe(0);
  });

  it('pacientas ir neprisijungęs lankytojas paslaugų keisti negali', async () => {
    const service = await createTestService();
    expect((await request(app).post('/api/services').send(payload())).status).toBe(401);
    const asPatient = (req) => req.set('Authorization', 'Bearer ' + patientAuth);
    expect((await asPatient(request(app).post('/api/services')).send(payload())).status).toBe(403);
    expect(
      (await asPatient(request(app).put('/api/services/' + service.id)).send({ price: 1 })).status
    ).toBe(403);
    expect((await asPatient(request(app).delete('/api/services/' + service.id))).status).toBe(403);
    expect(
      (await asPatient(request(app).patch('/api/services/' + service.id + '/toggle'))).status
    ).toBe(403);
    expect((await asPatient(request(app).get('/api/services/admin'))).status).toBe(403);
  });

  it('atmetama netinkama įvestis ir pasikartojantis pavadinimas', async () => {
    for (const bad of [
      { name: 'A' },
      { category: '' },
      { price: -5 },
      { price: 'daug' },
      { duration: 0 },
      { duration: 52 }, // ne 5 min. kartotinis
      { duration: 800 },
      { description: 'x'.repeat(1001) },
    ]) {
      const res = await asAdmin(request(app).post('/api/services')).send(payload(bad));
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect(
      (await asAdmin(request(app).post('/api/services')).send(payload({ duration: 50 }))).status
    ).toBe(201);
    const first = await asAdmin(request(app).post('/api/services')).send(payload());
    const duplicate = await asAdmin(request(app).post('/api/services')).send(
      payload({ name: first.body.name })
    );
    expect(duplicate.status).toBe(409);
    expect((await asAdmin(request(app).delete('/api/services/abc'))).status).toBe(400);
  });

  it('redagavus kainą esamas vizitas išsaugo senąją, nauja rezervacija gauna naująją', async () => {
    const created = await asAdmin(request(app).post('/api/services')).send(payload());
    const before = await book(created.body.id);
    expect(before.status).toBe(201);
    expect(before.body.price).toBe(40);

    const updated = await asAdmin(request(app).put('/api/services/' + created.body.id)).send({
      price: 55,
      duration: 60,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.price).toBe(55);
    expect(updated.body.duration).toBe(60);
    expect(updated.body.visitCount).toBe(1);

    const stored = await prisma.visit.findUnique({ where: { id: before.body.id } });
    expect(stored.price).toBe(40);
    expect(stored.duration).toBe(45);

    const after = await book(created.body.id);
    expect(after.status).toBe(201);
    expect(after.body.price).toBe(55);
    expect(after.body.duration).toBe(60);
    expect(after.body.patientId).toBe(patient.id);
  });

  it('išjungta paslauga dingsta iš viešo sąrašo, laisvų laikų ir rezervacijų', async () => {
    const created = await asAdmin(request(app).post('/api/services')).send(payload());
    const toggled = await asAdmin(
      request(app).patch('/api/services/' + created.body.id + '/toggle')
    );
    expect(toggled.status).toBe(200);
    expect(toggled.body.active).toBe(false);

    const publicList = await request(app).get('/api/services');
    expect(publicList.body.some((s) => s.id === created.body.id)).toBe(false);
    const adminList = await asAdmin(request(app).get('/api/services/admin'));
    expect(adminList.body.find((s) => s.id === created.body.id).active).toBe(false);

    const availability = await request(app)
      .get('/api/visits/availability')
      .query({ date: date(), serviceId: created.body.id, specialistId: specialist.id });
    expect(availability.status).toBe(404);
    const booking = await book(created.body.id);
    expect(booking.status).toBe(400);
    expect(booking.body.error).toMatch(/neteikiama/);

    const enabled = await asAdmin(request(app).put('/api/services/' + created.body.id)).send({
      active: true,
    });
    expect(enabled.body.active).toBe(true);
    expect((await book(created.body.id)).status).toBe(201);
  });

  it('paslauga su vizitais nešalinama, be vizitų — pašalinama', async () => {
    const used = await asAdmin(request(app).post('/api/services')).send(payload());
    expect((await book(used.body.id)).status).toBe(201);
    const blocked = await asAdmin(request(app).delete('/api/services/' + used.body.id));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatch(/aktyvumą/);

    const unused = await asAdmin(request(app).post('/api/services')).send(payload());
    const removed = await asAdmin(request(app).delete('/api/services/' + unused.body.id));
    expect(removed.status).toBe(200);
    expect(await prisma.service.findUnique({ where: { id: unused.body.id } })).toBeNull();
    expect((await asAdmin(request(app).delete('/api/services/' + unused.body.id))).status).toBe(
      404
    );
  });
});
