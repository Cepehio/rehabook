/**
 * RehaBook serverio paleidimo taškas.
 * App konfigūracija — `src/app.js` (createApp factory). Čia tik paleidžiamas
 * HTTP serveris, įkeliami .env kintamieji ir priminimų planuoklis.
 */
import './lib/env.js';
import { createApp } from './app.js';
import logger from './lib/logger.js';
import { startReminderScheduler } from './lib/reminders.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  logger.info(`RehaBook API veikia: http://localhost:${PORT}`);
  console.log(`RehaBook API veikia: http://localhost:${PORT}`);
  console.log(`API dokumentacija: http://localhost:${PORT}/api/docs`);
  if (app.locals.clientDir) {
    console.log(`Surinkta sąsaja (dist) aptarnaujama: http://localhost:${PORT}`);
  } else {
    console.log('Sąsają kūrimo režime paleiskite projekto šaknyje: npm run dev');
  }
  // Priminimai prieš vizitą (kasdien pagal REMINDER_CRON; REMINDERS_ENABLED=false išjungia)
  startReminderScheduler();
});
