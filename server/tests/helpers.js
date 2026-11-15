/**
 * Testų pagalbinės priemonės (Supertest).
 *
 * - `app`: bendra Express aplikacija su atlaisvintu rate-limit'u, kad nesėkmingų
 *   prisijungimų testai (lockout ir kt.) anksčiau laiko negautų 429. Atskiras
 *   rate-limit (429) testas susikuria savo app su mažu limitu.
 * - Fixture'ai kuriami su UNIKALIAIS identifikatoriais (email/license/pavadinimas),
 *   kad testai būtų pakartojami ir nesusidurtų su seed duomenimis ar tarpusavyje.
 * - `cleanup*` funkcijos pašalina sukurtus įrašus po testų.
 */
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export { prisma, request };

// Bendra app — didelis rate-limit, kad netriktų nesėkmingų bandymų testuose.
export const app = createApp({ authRateLimit: { max: 100000, windowMs: 60000 } });

const SALT_ROUNDS = 10;
let counter = 0;

/** Unikalus identifikatorius (be Math.random priklausomybės testų pakartojamumui). */
export function uniq(prefix = 't') {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export function testEmail() {
  return `${uniq('user').toLowerCase()}@test.rehabook.lt`;
}

/** Sukuria pacientą tiesiai DB (su hash'intu slaptažodžiu). */
export async function createPatientAccount(password = 'slaptas123') {
  const email = testEmail();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const patient = await prisma.patient.create({
    data: { name: 'Test', surname: 'Patient', email, passwordHash },
  });
  return { patient, email, password };
}

/** Sukuria specialistą tiesiai DB. */
export async function createSpecialistAccount(password = 'spec12345') {
  const email = testEmail();
  const license = uniq('LIC');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const specialist = await prisma.specialist.create({
    data: { name: 'Test Spec', license, email, passwordHash, specialties: [] },
  });
  return { specialist, email, license, password };
}

/** Sukuria paslaugą tiesiai DB. */
export async function createTestService() {
  const name = uniq('Paslauga');
  return prisma.service.create({
    data: { name, category: 'Testas', price: 40, duration: 60 },
  });
}

/** Paciento JWT per realų prisijungimo endpoint'ą. */
export async function patientToken(email, password) {
  const res = await request(app).post('/api/auth/patient/login').send({ email, password });
  return res.body.token;
}

/** Specialisto JWT per realų prisijungimo endpoint'ą. */
export async function specialistToken(email, password, license) {
  const res = await request(app)
    .post('/api/auth/specialist/login')
    .send({ email, password, license });
  return res.body.token;
}

/** Admin JWT (kredencialai iš .env). */
export async function adminToken() {
  const res = await request(app)
    .post('/api/auth/admin/login')
    .send({ email: process.env.ADMIN_EMAIL || 'admin@rehabook.lt', password: process.env.ADMIN_PASSWORD || 'admin123' });
  return res.body.token;
}

/** Pašalina testų sukurtus įrašus (vizitai -> pacientai/specialistai/paslaugos). */
export async function cleanupTestData() {
  await prisma.visit.deleteMany({
    where: {
      OR: [
        { patient: { email: { contains: '@test.rehabook.lt' } } },
        { service: { category: 'Testas' } },
      ],
    },
  });
  await prisma.patient.deleteMany({ where: { email: { contains: '@test.rehabook.lt' } } });
  await prisma.specialist.deleteMany({ where: { email: { contains: '@test.rehabook.lt' } } });
  await prisma.service.deleteMany({ where: { category: 'Testas' } });
}
