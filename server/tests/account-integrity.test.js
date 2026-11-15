import { afterAll, describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from '../src/app.js';
import {
  app,
  request,
  prisma,
  createPatientAccount,
  createSpecialistAccount,
  patientToken,
  specialistToken,
  testEmail,
  cleanupTestData,
} from './helpers.js';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});
async function recoveryToken(email, role = 'patient') {
  const response = await request(app).post('/api/auth/forgot-password').send({ email, role });
  expect(response.status).toBe(200);
  const folder = resolve(process.env.MAIL_OUTBOX_DIR || 'outbox');
  const files = (await readdir(folder)).sort().reverse();
  for (const file of files) {
    const mail = JSON.parse(await readFile(resolve(folder, file), 'utf8'));
    if (mail.to === email && mail.subject.startsWith('Slaptažodžio atkūrimas')) {
      const url = new URL(mail.text.match(/https?:\/\/\S+/)[0]);
      return new URLSearchParams(url.hash.slice(1)).get('token');
    }
  }
  throw new Error('Vietinėje pašto dėžutėje nėra atkūrimo laiško.');
}

describe('Paskyrų vientisumas', () => {
  it('atkūrimo raktas saugomas maišos forma, panaudojamas vieną kartą ir nutraukia seną sesiją', async () => {
    const account = await createPatientAccount();
    const oldSession = await patientToken(account.email, account.password);
    const token = await recoveryToken(account.email);
    const stored = await prisma.patient.findUnique({ where: { id: account.patient.id } });
    expect(stored.resetTokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(stored.resetTokenHash).not.toBe(token);
    const payload = { token, newPassword: 'naujas12345' };
    expect((await request(app).post('/api/auth/reset-password').send(payload)).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send(payload)).status).toBe(400);
    expect(
      (
        await request(app)
          .get('/api/visits/my')
          .set('Authorization', 'Bearer ' + oldSession)
      ).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/patient/login')
          .send({ email: account.email, password: account.password })
      ).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/patient/login')
          .send({ email: account.email, password: payload.newPassword })
      ).status
    ).toBe(200);
  });
  it('negaliojantis ir pasibaigęs atkūrimo raktas atmetamas', async () => {
    const account = await createPatientAccount();
    const token = await recoveryToken(account.email);
    await prisma.patient.update({
      where: { id: account.patient.id },
      data: { resetExpiresAt: new Date(0) },
    });
    for (const value of [token, '0'.repeat(64)]) {
      expect(
        (
          await request(app)
            .post('/api/auth/reset-password')
            .send({ token: value, newPassword: 'naujas12345' })
        ).status
      ).toBe(400);
    }
  });
  it('atkūrimo atsakas neatskleidžia, ar paskyra egzistuoja; sėkmingos užklausos taip pat ribojamos', async () => {
    const account = await createPatientAccount();
    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: account.email });
    const missing = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail() });
    expect(known.body).toEqual(missing.body);
    const limited = createApp({ authRateLimit: { max: 2, windowMs: 60000 } });
    const send = () =>
      request(limited).post('/api/auth/forgot-password').send({ email: testEmail() });
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });
  it('specialisto slaptažodžiui pakeisti būtinas dabartinis slaptažodis; grąžinama nauja sesija', async () => {
    const account = await createSpecialistAccount();
    const token = await specialistToken(account.email, account.password, account.license);
    const change = (currentPassword) =>
      request(app)
        .post('/api/auth/specialist/change-password')
        .set('Authorization', 'Bearer ' + token)
        .send({ license: account.license, currentPassword, newPassword: 'specNaujas123' });
    expect((await change('neteisingas')).status).toBe(403);
    const changed = await change(account.password);
    expect(changed.status).toBe(200);
    expect(
      (
        await request(app)
          .get('/api/visits/my')
          .set('Authorization', 'Bearer ' + token)
      ).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .get('/api/visits/specialist/' + account.specialist.id)
          .set('Authorization', 'Bearer ' + changed.body.token)
      ).status
    ).toBe(200);
  });
  it('specialistas gali atkurti slaptažodį; paciento tipas jo rakto nepriima', async () => {
    const account = await createSpecialistAccount();
    const token = await recoveryToken(account.email, 'specialist');
    const payload = { token, newPassword: 'naujas12345', role: 'patient' };
    expect((await request(app).post('/api/auth/reset-password').send(payload)).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/auth/reset-password')
          .send({ ...payload, role: 'specialist' })
      ).status
    ).toBe(200);
  });
  it('pašalintos paskyros JWT nebegalioja, viešas katalogas neatskleidžia prisijungimo laukų', async () => {
    const account = await createPatientAccount();
    const token = await patientToken(account.email, account.password);
    await prisma.patient.update({
      where: { id: account.patient.id },
      data: { deletedAt: new Date() },
    });
    expect(
      (
        await request(app)
          .get('/api/visits/my')
          .set('Authorization', 'Bearer ' + token)
      ).status
    ).toBe(401);
    const specialist = await createSpecialistAccount();
    const list = await request(app).get('/api/specialists');
    expect(list.status).toBe(200);
    const publicSpecialist = list.body.find((s) => s.id === specialist.specialist.id);
    for (const field of [
      'email',
      'license',
      'phone',
      'passwordHash',
      'resetTokenHash',
      'tokenVersion',
    ]) {
      expect(publicSpecialist).not.toHaveProperty(field);
    }
  });
  it('bcrypt ribą viršijantis Unicode slaptažodis atmetamas, neužkerpant įvesties', async () => {
    const response = await request(app)
      .post('/api/auth/patient/register')
      .send({ name: 'Test', surname: 'Test', email: testEmail(), password: 'ą'.repeat(37) });
    expect(response.status).toBe(400);
  });
});
