/**
 * Globalus testų paruošimas (Vitest setupFiles).
 * - NODE_ENV=test: išjungia HTTP žurnalą, leidžia tyliau veikti.
 * - Įkelia .env (DATABASE_URL ir kt.). Testams REKOMENDUOJAMA atskira DB:
 *     DATABASE_URL="postgresql://postgres:SLAPTAZODIS@localhost:5432/rehabook_test?schema=public"
 *   (žr. README — testų paleidimas). Migracijos pritaikomos su `prisma migrate deploy`.
 */
process.env.NODE_ENV = 'test';
// Tylesnis logeris testuose
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';

await import('../src/lib/env.js');
const testDatabase =
  process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!testDatabase || !testDatabase.endsWith('_test')) {
  throw new Error(
    'Testams būtina atskira DATABASE_URL duomenų bazė, kurios pavadinimas baigiasi _test.'
  );
}
process.env.JWT_SECRET ||= 'rehabook-test-only-secret-not-for-production';
process.env.ADMIN_EMAIL ||= 'admin@test.rehabook.lt';
process.env.ADMIN_PASSWORD ||= 'test-admin-password';
process.env.MAIL_MODE = 'file';
// Testuose planuoklis nepaleidžiamas (sendDueReminders kviečiama tiesiogiai)
process.env.REMINDERS_ENABLED = 'false';
