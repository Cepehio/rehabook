/**
 * Vitest konfigūracija.
 * - Node aplinka (jokio DOM).
 * - setup.js: nustato NODE_ENV=test ir įkelia .env (DATABASE_URL ir kt.).
 * - Testai paleidžiami nuosekliai (fileParallelism: false), kad bendrai test DB
 *   nekiltų lygiagrečių rašymo lenktynių; integraciniai testai liečia tikrą PostgreSQL.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
