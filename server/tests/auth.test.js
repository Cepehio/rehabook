/**
 * Autentifikacijos integraciniai testai:
 *  - registracija sukuria pacientą su hash'intu slaptažodžiu;
 *  - prisijungimas grąžina JWT; neteisingi kredencialai -> 401;
 *  - rate limit -> 429;
 *  - paskyros užrakinimas po 5 nesėkmingų bandymų -> 423.
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { app, prisma, testEmail, createPatientAccount, cleanupTestData } from './helpers.js';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Auth — registracija ir prisijungimas', () => {
  it('registracija sukuria pacientą su hash`intu slaptažodžiu ir grąžina JWT', async () => {
    const email = testEmail();
    const res = await request(app).post('/api/auth/patient/register').send({
      name: 'Jonas',
      surname: 'Jonaitis',
      email,
      password: 'slaptas123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email, role: 'patient' });
    // Atsake jokių jautrių laukų
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.failedLogins).toBeUndefined();
    expect(res.body.user.lockedUntil).toBeUndefined();

    // DB laikomas hash'as, ne atviras slaptažodis
    const stored = await prisma.patient.findUnique({ where: { email } });
    expect(stored.passwordHash).not.toBe('slaptas123');
    expect(stored.passwordHash.startsWith('$2')).toBe(true);
  });

  it('prisijungimas su teisingais kredencialais grąžina JWT', async () => {
    const { email, password } = await createPatientAccount();
    const res = await request(app).post('/api/auth/patient/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('patient');
  });

  it('neteisingas slaptažodis -> 401', async () => {
    const { email } = await createPatientAccount();
    const res = await request(app)
      .post('/api/auth/patient/login')
      .send({ email, password: 'blogasSlaptazodis' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('nežinomas el. paštas -> 401', async () => {
    const res = await request(app)
      .post('/api/auth/patient/login')
      .send({ email: 'nera@test.rehabook.lt', password: 'slaptas123' });
    expect(res.status).toBe(401);
  });

  it('admin prisijungimas su .env kredencialais grąžina admin token`ą', async () => {
    const res = await request(app).post('/api/auth/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@rehabook.lt',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('Auth — paskyros užrakinimas (5 nesėkmingi bandymai -> 423)', () => {
  it('po 5 nesėkmingų bandymų paskyra užrakinama', async () => {
    const { email } = await createPatientAccount();

    // 5 nesėkmingi bandymai (paskutinis užrakina paskyrą)
    for (let i = 0; i < 5; i += 1) {
      const r = await request(app).post('/api/auth/patient/login').send({ email, password: 'blogas123' });
      expect(r.status).toBe(401);
    }

    // 6-as bandymas — paskyra užrakinta
    const locked = await request(app)
      .post('/api/auth/patient/login')
      .send({ email, password: 'blogas123' });
    expect(locked.status).toBe(423);
  });
});

describe('Auth — rate limiting (-> 429)', () => {
  it('per daug nesėkmingų auth užklausų grąžina 429', async () => {
    // Atskira app su mažu limitu, kad nepaveiktų kitų testų.
    const limitedApp = createApp({ authRateLimit: { max: 3, windowMs: 60000 } });

    let lastStatus = 0;
    for (let i = 0; i < 6; i += 1) {
      const r = await request(limitedApp)
        .post('/api/auth/patient/login')
        .send({ email: 'nera@test.rehabook.lt', password: 'blogas123' });
      lastStatus = r.status;
    }
    expect(lastStatus).toBe(429);
  });
});
