/**
 * RBAC / nuosavybės integraciniai testai:
 *  - be token`o -> 401;
 *  - pacientas negali matyti svetimo paciento vizitų -> 403;
 *  - pacientas negali pasiekti admin endpoint`o (GET /visits) -> 403.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  app,
  request,
  prisma,
  createPatientAccount,
  patientToken,
  cleanupTestData,
} from './helpers.js';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('RBAC ir resursų nuosavybė', () => {
  it('be token`o -> 401', async () => {
    const res = await request(app).get('/api/visits/patient/1');
    expect(res.status).toBe(401);
  });

  it('pacientas mato tik savo vizitus; svetimas -> 403', async () => {
    const a = await createPatientAccount();
    const b = await createPatientAccount();
    const tokenA = await patientToken(a.email, a.password);

    // Savo vizitai — leidžiama (200)
    const own = await request(app)
      .get(`/api/visits/patient/${a.patient.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(own.status).toBe(200);

    // Svetimo paciento vizitai — draudžiama (403)
    const other = await request(app)
      .get(`/api/visits/patient/${b.patient.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(other.status).toBe(403);
  });

  it('pacientas negali pasiekti admin endpoint`o GET /visits -> 403', async () => {
    const a = await createPatientAccount();
    const tokenA = await patientToken(a.email, a.password);
    const res = await request(app)
      .get('/api/visits')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });

  it('neteisingas token`as -> 401', async () => {
    const res = await request(app)
      .get('/api/visits/patient/1')
      .set('Authorization', 'Bearer negaliojantis.token.cia');
    expect(res.status).toBe(401);
  });
});
