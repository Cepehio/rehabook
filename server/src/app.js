/**
 * RehaBook Express aplikacijos kūrimas (factory).
 *
 * Atskirta nuo `index.js`, kad:
 *  - serverio paleidimas (`app.listen`) liktų tik index.js;
 *  - testai (Supertest) galėtų importuoti `app` be klausymosi prievado;
 *  - rate-limit nustatymai būtų konfigūruojami (testams patogu sumažinti/padidinti).
 *
 * Middleware: helmet, cors (tik CLIENT_ORIGIN), JSON parser, rate-limit auth keliams,
 * morgan -> winston HTTP žurnalas. Maršrutai su prefiksu /api. Klaidų apdorojimas — paskutinis.
 * Jei projekto šaknyje yra surinkta sąsaja (`dist` po `npm run build`), ji aptarnaujama
 * tuo pačiu serveriu, o ne-/api keliai grąžina index.html (SPA maršrutizavimas).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { morganStream } from './lib/logger.js';
import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import specialistsRoutes from './routes/specialists.routes.js';
import patientsRoutes from './routes/patients.routes.js';
import visitsRoutes from './routes/visits.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { mountSwagger } from './docs/swagger.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Surinktos sąsajos katalogas: `options.clientDir`, `CLIENT_DIST` aplinkos kintamasis
 * arba numatytasis `<projektas>/dist`. Grąžina kelią tik tada, kai jame yra index.html;
 * kitaip sąsaja neaptarnaujama (kūrimo režime ją aptarnauja Vite).
 */
export function resolveClientDir(clientDir) {
  const dir = path.resolve(
    clientDir ?? process.env.CLIENT_DIST ?? path.join(__dirname, '..', '..', 'dist')
  );
  return fs.existsSync(path.join(dir, 'index.html')) ? dir : null;
}

/**
 * Sukuria ir sukonfigūruoja Express aplikaciją.
 * @param {Object} [options]
 * @param {{ windowMs?: number, max?: number }} [options.authRateLimit]
 *   Rate-limit nustatymai /api/auth keliams. Numatyta — iš .env arba 15min/10.
 * @param {string|null} [options.clientDir]
 *   Surinktos sąsajos katalogas (null – neaptarnauti). Numatyta – žr. resolveClientDir().
 * @returns {import('express').Express}
 */
export function createApp(options = {}) {
  const app = express();

  // ─── Saugumo / bazinis middleware ───
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    })
  );
  app.use(express.json());

  // ─── HTTP užklausų žurnalas (morgan -> winston) ───
  // Testuose (NODE_ENV=test) HTTP žurnalo netriukšminam.
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: morganStream }));
  }

  // ─── Rate limiting auth keliams (brute-force apsauga) ───
  // Skaičiuojami tik NEPAVYKĘ bandymai (skipSuccessfulRequests), kad normalus
  // naudojimas neblokuotų, bet slaptažodžių spėliojimas (4xx/5xx) būtų ribojamas.
  const rlWindow =
    options.authRateLimit?.windowMs ?? (Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000);
  const rlMax = options.authRateLimit?.max ?? (Number(process.env.RATE_LIMIT_MAX) || 10);
  const authLimiter = rateLimit({
    windowMs: rlWindow,
    max: rlMax, // iki N nepavykusių bandymų per langą iš vieno IP
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // sėkmingi prisijungimai neskaičiuojami
    message: { error: 'Per daug nepavykusių bandymų. Pabandykite po 15 min.' },
  });
  const recoveryLimiter = rateLimit({
    windowMs: rlWindow,
    max: rlMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Per daug atkūrimo užklausų. Pabandykite vėliau.' },
  });

  // ─── Swagger UI dokumentacija (GET /api/docs) ───
  mountSwagger(app);

  // ─── Sveikatos tikrinimas ───
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // ─── Maršrutai ───
  app.use(['/api/auth/forgot-password', '/api/auth/reset-password'], recoveryLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/specialists', specialistsRoutes);
  app.use('/api/patients', patientsRoutes);
  app.use('/api/visits', visitsRoutes);
  app.use('/api/stats', statsRoutes);

  // ─── Surinkta sąsaja (gamybinis režimas: `npm run build`, tada `npm start`) ───
  // Vite sugeneruoti `assets/*` failai turi maišą pavadinime, todėl kešuojami ilgai;
  // index.html – ne, kad po naujo surinkimo naršyklė gautų naujas nuorodas.
  const clientDir = options.clientDir === null ? null : resolveClientDir(options.clientDir);
  if (clientDir) {
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.use((req, res, next) => {
      if (!['GET', 'HEAD'].includes(req.method) || req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }
  app.locals.clientDir = clientDir;

  // ─── Klaidų apdorojimas ───
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
