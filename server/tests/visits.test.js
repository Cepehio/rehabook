/**
 * Vizitų integraciniai testai:
 *  - vizito kūrimas (201);
 *  - dvigubo rezervavimo konfliktas (tas pats specialistas/data/laikas) -> 409;
 *  - vizito atšaukimas su priežastimi (status -> atšauktas).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

let token;
let specialist;
let service;

beforeAll(async () => {
  const acc = await createPatientAccount();
  token = await patientToken(acc.email, acc.password);
  const sp = await createSpecialistAccount();
  specialist = sp.specialist;
  service = await createTestService();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Vizitai', () => {
  it('pacientas sukuria vizitą -> 201', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialistId: specialist.id,
        serviceId: service.id,
        date: '2099-01-10',
        time: '9:00',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe('laukiamas');
    expect(res.body.specialistId).toBe(specialist.id);
  });

  it('dvigubas rezervavimas (tas pats specialistas/data/laikas) -> 409', async () => {
    const payload = {
      specialistId: specialist.id,
      serviceId: service.id,
      date: '2099-02-20',
      time: '10:00',
    };
    const first = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(second.status).toBe(409);
  });

  it('pacientas atšaukia savo vizitą su priežastimi', async () => {
    const created = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialistId: specialist.id,
        serviceId: service.id,
        date: '2099-03-30',
        time: '11:00',
      });
    expect(created.status).toBe(201);

    const cancelled = await request(app)
      .patch(`/api/visits/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Pasikeitė planai' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('atšauktas');
    expect(cancelled.body.cancelReason).toBe('Pasikeitė planai');
  });

  it('atšaukimas be priežasties -> 400', async () => {
    const created = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialistId: specialist.id,
        serviceId: service.id,
        date: '2099-04-15',
        time: '12:00',
      });
    const res = await request(app)
      .patch(`/api/visits/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
