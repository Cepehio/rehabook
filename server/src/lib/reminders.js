/**
 * Priminimai prieš vizitą (node-cron) – mažina pamirštų vizitų skaičių.
 *
 * Kasdien nustatytu laiku (numatyta 09:00 Europe/Vilnius) surandami RYTOJAUS
 * vizitai su būsena „laukiamas“ arba „patvirtintas“, kuriems priminimas dar
 * nesiųstas (reminderSentAt IS NULL), ir kiekvienam pacientui parengiamas
 * laiškas. Išsiuntus įrašoma `reminderSentAt`, todėl pakartotinis paleidimas
 * to paties vizito antrą kartą neprimins (idempotentiška operacija).
 *
 * Konfigūracija (server/.env):
 *   REMINDERS_ENABLED=true|false   (numatyta true; testuose ir CI – false)
 *   REMINDER_CRON="0 9 * * *"      (cron išraiška, numatyta kasdien 09:00)
 *   REMINDER_TZ="Europe/Vilnius"
 *
 * Rankinis paleidimas (pvz. demonstracijai): `npm run reminders` (scripts/send-reminders.js).
 */
import cron from 'node-cron';
import { prisma } from './prisma.js';
import logger from './logger.js';
import { sendVisitReminder } from './mailer.js';
import { ACTIVE_STATUSES, CLINIC_TIME_ZONE, isDate } from '../../../shared/booking.js';

/**
 * Datos eilutė „YYYY-MM-DD“ nurodytoje laiko juostoje (vizito `date` DB laikomas
 * būtent tokia eilute, todėl lyginama tekstu, o ne Date objektais).
 */
export function toDateString(d, timeZone = process.env.REMINDER_TZ || CLINIC_TIME_ZONE) {
  // en-CA lokalė duoda ISO pavidalą YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Rytojaus data „YYYY-MM-DD“. */
export function tomorrowDateString(now = new Date()) {
  return toDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

/**
 * Išsiunčia priminimus visiems nurodytos dienos aktyviems vizitams, kuriems dar nesiųsta.
 * @param {string} [date] - „YYYY-MM-DD“; numatyta – rytoj.
 * @returns {Promise<{ date: string, sent: number, skipped: number, found: number }>}
 */
export async function sendDueReminders(date = tomorrowDateString()) {
  if (!isDate(date)) throw new Error(`Neteisinga priminimų data: ${date}`);
  const visits = await prisma.visit.findMany({
    where: {
      date,
      status: { in: ACTIVE_STATUSES },
      reminderSentAt: null,
      patient: { deletedAt: null },
    },
    include: { patient: true, specialist: true, service: true },
    orderBy: { time: 'asc' },
  });

  let sent = 0;
  let skipped = 0;
  for (const visit of visits) {
    if (!visit.patient?.email) {
      skipped += 1;
      continue;
    }
    await sendVisitReminder({
      patient: visit.patient,
      specialist: visit.specialist,
      service: visit.service,
      visit,
    });
    // Žymima tik jei vizitas vis dar be priminimo (apsauga nuo lygiagrečių paleidimų).
    const marked = await prisma.visit.updateMany({
      where: { id: visit.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    sent += marked.count;
  }

  logger.info(
    `Priminimai (${date}): išsiųsta ${sent}, praleista ${skipped}, iš viso rasta ${visits.length}`
  );
  return { date, sent, skipped, found: visits.length };
}

/**
 * Užregistruoja cron užduotį. Grąžina task objektą (stop() sustabdymui) arba null,
 * jei priminimai išjungti arba cron išraiška neteisinga.
 */
export function startReminderScheduler() {
  if (String(process.env.REMINDERS_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('Priminimų planuoklis išjungtas (REMINDERS_ENABLED=false).');
    return null;
  }
  const expression = process.env.REMINDER_CRON || '0 9 * * *';
  const timezone = process.env.REMINDER_TZ || CLINIC_TIME_ZONE;

  if (!cron.validate(expression)) {
    logger.error(`Neteisinga REMINDER_CRON išraiška: "${expression}" — planuoklis nepaleistas.`);
    return null;
  }

  const task = cron.schedule(
    expression,
    () => {
      sendDueReminders().catch((err) => logger.error(`Priminimų siuntimo klaida: ${err.message}`));
    },
    { timezone }
  );
  logger.info(`Priminimų planuoklis paleistas: "${expression}" (${timezone}).`);
  return task;
}
