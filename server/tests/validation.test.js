/**
 * Serverinės įvesties validacijos testai:
 *  - blogas el. pašto formatas -> 400;
 *  - per trumpas slaptažodis (<8) -> 400;
 *  - trūkstami privalomi laukai -> 400.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { app, request, prisma, testEmail, cleanupTestData } from './helpers.js';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Validacija (registracija)', () => {
  it('blogas el. pašto formatas -> 400', async () => {
    const res = await request(app).post('/api/auth/patient/register').send({
      name: 'Jonas',
      surname: 'Jonaitis',
      email: 'ne-el-pastas',
      password: 'slaptas123',
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('per trumpas slaptažodis (<8) -> 400', async () => {
    const res = await request(app).post('/api/auth/patient/register').send({
      name: 'Jonas',
      surname: 'Jonaitis',
      email: testEmail(),
      password: 'trump',
    });
    expect(res.status).toBe(400);
    const passwordError = res.body.details?.some((d) => d.field === 'password');
    expect(passwordError).toBe(true);
  });

  it('trūkstami privalomi laukai -> 400', async () => {
    const res = await request(app).post('/api/auth/patient/register').send({
      email: testEmail(),
      password: 'slaptas123',
    });
    expect(res.status).toBe(400);
  });

  it('blogas el. paštas prisijungiant -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/patient/login')
      .send({ email: 'blogas', password: 'slaptas123' });
    expect(res.status).toBe(400);
  });
});
