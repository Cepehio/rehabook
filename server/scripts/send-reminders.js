/**
 * Rankinis priminimų paleidimas (nelaukiant, kol suveiks cron):
 *   npm run reminders                -> rytojaus vizitams
 *   npm run reminders -- 2026-10-01  -> nurodytos dienos vizitams
 *
 * Patogu demonstracijai: MAIL_MODE=file režimu laiškai atsiranda outbox kataloge.
 */
import '../src/lib/env.js';
import { prisma } from '../src/lib/prisma.js';
import { sendDueReminders, tomorrowDateString } from '../src/lib/reminders.js';

const date = process.argv[2] || tomorrowDateString();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`Neteisinga data "${date}". Formatas: YYYY-MM-DD`);
  process.exit(1);
}

try {
  const result = await sendDueReminders(date);
  console.log(
    `Priminimai ${result.date}: išsiųsta ${result.sent}, praleista ${result.skipped}, rasta ${result.found}`
  );
} finally {
  await prisma.$disconnect();
}
