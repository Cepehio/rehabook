/**
 * Surinktos sąsajos aptarnavimas tuo pačiu serveriu (gamybinis režimas):
 *  - index.html ir assets failai grąžinami iš nurodyto katalogo;
 *  - ne-/api GET keliai grąžina index.html (SPA maršrutizavimas);
 *  - /api keliai ir ne-GET užklausos toliau grąžina JSON 404;
 *  - be dist katalogo sąsaja neaptarnaujama.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp, resolveClientDir } from '../src/app.js';

let dir;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehabook-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>RehaBook test</title>');
  fs.writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1);');
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Surinkta sąsaja', () => {
  it('aptarnauja index.html, assets ir SPA kelius, o /api 404 lieka JSON', async () => {
    const app = createApp({ clientDir: dir });
    const home = await request(app).get('/');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toMatch(/text\/html/);
    expect(home.headers['cache-control']).toBe('no-cache');
    expect(home.text).toContain('RehaBook test');

    const spa = await request(app).get('/registracija');
    expect(spa.status).toBe(200);
    expect(spa.text).toContain('RehaBook test');

    const asset = await request(app).get('/assets/index-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers['cache-control']).toContain('immutable');

    const api = await request(app).get('/api/nera');
    expect(api.status).toBe(404);
    expect(api.body).toEqual({ error: 'Maršrutas nerastas.' });

    const post = await request(app).post('/registracija');
    expect(post.status).toBe(404);
    expect(post.body).toEqual({ error: 'Maršrutas nerastas.' });

    const health = await request(app).get('/api/health');
    expect(health.body).toEqual({ status: 'ok' });
  });

  it('be dist katalogo šakninis kelias grąžina JSON 404', async () => {
    const app = createApp({ clientDir: null });
    const home = await request(app).get('/');
    expect(home.status).toBe(404);
    expect(home.body).toEqual({ error: 'Maršrutas nerastas.' });
    expect(resolveClientDir(path.join(dir, 'nera'))).toBeNull();
    expect(resolveClientDir(dir)).toBe(dir);
  });
});
