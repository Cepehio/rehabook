/**
 * Priminimų prieš vizitą testai (lib/reminders.js):
 *  - rytojaus „laukiamas“/„patvirtintas“ vizitams priminimas išsiunčiamas ir pažymimas reminderSentAt;
 *  - pakartotinis paleidimas tų pačių vizitų antrą kartą neprimena (idempotentiška);
 *  - „atšauktas“/„įvykęs“ vizitams ir kitų dienų vizitams priminimai nesiunčiami;
 *  - cron išraiškos ir REMINDERS_ENABLED patikra (planuoklis nepaleidžiamas / sustabdomas).
 *
 * Laiškai – MAIL_MODE=file (vietinis outbox), tad tikrinama DB būsena ir grąžinama suvestinė.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  prisma,
  createPatientAccount,
  createSpecialistAccount,
  createTestService,
  cleanupTestData,
} from './helpers.js';
import {
  sendDueReminders,
  tomorrowDateString,
  toDateString,
  startReminderScheduler,
} from '../src/lib/reminders.js';

/** Unikalus „HH:MM“ laikas kiekvienam testiniam vizitui (atitinka DB formatą po migracijos). */
let slot = 0;
const nextTime = () => {
  slot += 1;
  return `${String(8 + Math.floor(slot / 4)).padStart(2, '0')}:${String((slot % 4) * 15).padStart(2, '0')}`;
};

async function createVisit({ date, status = 'laukiamas' }) {
  const { patient } = await createPatientAccount();
  const { specialist } = await createSpecialistAccount();
  const service = await createTestService();
  return prisma.visit.create({
    data: {
      patientId: patient.id,
      specialistId: specialist.id,
      serviceId: service.id,
      date,
      time: nextTime(),
      status,
      price: service.price,
      duration: service.duration,
    },
  });
}

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Priminimai prieš vizitą', () => {
  it('toDateString grąžina YYYY-MM-DD; tomorrowDateString — rytojų', () => {
    expect(toDateString(new Date('2026-09-13T12:00:00Z'))).toBe('2026-09-13');
    expect(tomorrowDateString(new Date('2026-09-13T12:00:00Z'))).toBe('2026-09-14');
    // vidurnakčio riba pagal Europe/Vilnius (UTC+3 vasarą): 22:30Z jau kita diena Vilniuje
    expect(toDateString(new Date('2026-06-01T22:30:00Z'))).toBe('2026-06-02');
  });

  it('išsiunčia priminimus rytojaus vizitams ir pažymi reminderSentAt', async () => {
    const date = tomorrowDateString();
    const v1 = await createVisit({ date, status: 'laukiamas' });
    const v2 = await createVisit({ date, status: 'patvirtintas' });

    const result = await sendDueReminders(date);
    expect(result.date).toBe(date);
    expect(result.sent).toBeGreaterThanOrEqual(2);

    const [r1, r2] = await Promise.all([
      prisma.visit.findUnique({ where: { id: v1.id } }),
      prisma.visit.findUnique({ where: { id: v2.id } }),
    ]);
    expect(r1.reminderSentAt).toBeInstanceOf(Date);
    expect(r2.reminderSentAt).toBeInstanceOf(Date);
  });

  it('pakartotinis paleidimas tų pačių vizitų nebeprimena (idempotentiška)', async () => {
    const date = tomorrowDateString();
    const v = await createVisit({ date });
    await sendDueReminders(date);
    const first = (await prisma.visit.findUnique({ where: { id: v.id } })).reminderSentAt;

    const second = await sendDueReminders(date);
    expect(second.sent).toBe(0);
    const after = (await prisma.visit.findUnique({ where: { id: v.id } })).reminderSentAt;
    expect(after.getTime()).toBe(first.getTime());
  });

  it('atšauktiems/įvykusiems ir kitų dienų vizitams priminimai nesiunčiami', async () => {
    const date = tomorrowDateString();
    const cancelled = await createVisit({ date, status: 'atšauktas' });
    const done = await createVisit({ date, status: 'įvykęs' });
    const otherDay = await createVisit({ date: '2030-01-01', status: 'laukiamas' });

    await sendDueReminders(date);

    for (const id of [cancelled.id, done.id, otherDay.id]) {
      const v = await prisma.visit.findUnique({ where: { id } });
      expect(v.reminderSentAt).toBeNull();
    }
  });

  it('neteisinga data atmetama', async () => {
    await expect(sendDueReminders('2026-02-30')).rejects.toThrow(/Neteisinga priminimų data/);
  });

  it('netinkama REMINDER_CRON išraiška -> planuoklis nepaleidžiamas', () => {
    const prev = { c: process.env.REMINDER_CRON, e: process.env.REMINDERS_ENABLED };
    process.env.REMINDER_CRON = 'ne cron';
    process.env.REMINDERS_ENABLED = 'true';
    expect(startReminderScheduler()).toBeNull();
    process.env.REMINDER_CRON = prev.c;
    process.env.REMINDERS_ENABLED = prev.e;
  });

  it('REMINDERS_ENABLED=false -> planuoklis nepaleidžiamas', () => {
    const prev = process.env.REMINDERS_ENABLED;
    process.env.REMINDERS_ENABLED = 'false';
    expect(startReminderScheduler()).toBeNull();
    process.env.REMINDERS_ENABLED = prev;
  });

  it('galiojanti išraiška -> užduotis sukuriama ir ją galima sustabdyti', () => {
    const prev = { c: process.env.REMINDER_CRON, e: process.env.REMINDERS_ENABLED };
    process.env.REMINDER_CRON = '0 9 * * *';
    process.env.REMINDERS_ENABLED = 'true';
    const task = startReminderScheduler();
    expect(task).not.toBeNull();
    task.stop();
    process.env.REMINDER_CRON = prev.c;
    process.env.REMINDERS_ENABLED = prev.e;
  });
});
