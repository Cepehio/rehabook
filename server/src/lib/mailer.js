/** El. laiškai: vietiniai JSON failai demonstracijai arba sukonfigūruotas SMTP. Siuntimo klaidos registruojamos serveryje. */
import nodemailer from 'nodemailer';
import logger from './logger.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const MAIL_MODE = process.env.MAIL_MODE || 'file';
const MAIL_FROM = process.env.MAIL_FROM || 'RehaBook <noreply@rehabook.lt>';

// SMTP transporteris kuriamas tik „smtp“ režimu (kad „log“ veiktų be priklausomybių nuo serverio).
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

/**
 * Bendras siuntimas. Niekada nemeta klaidos (fire-and-forget).
 * @param {{ to: string, subject: string, text: string }} msg
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, text }) {
  if (!to) return;
  try {
    if (MAIL_MODE === 'smtp') {
      const info = await getTransporter().sendMail({ from: MAIL_FROM, to, subject, text });
      logger.info(`El. laiškas išsiųstas (SMTP) -> ${to} | ${subject} | id=${info.messageId}`);
    } else {
      // Lokali demonstracinė pašto dėžutė. Atkūrimo raktai nepatenka į bendrus žurnalus ar HTTP atsakus.
      const directory = resolve(process.env.MAIL_OUTBOX_DIR || 'outbox');
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(
        resolve(directory, `${Date.now()}-${randomUUID()}.json`),
        JSON.stringify({ to, subject, text }, null, 2),
        { mode: 0o600 }
      );
      logger.info('Demonstracinis laiškas parengtas vietinėje pašto dėžutėje.');
    }
  } catch (err) {
    // Fire-and-forget: klaidą tik užfiksuojame, atsako neblokuojame.
    logger.error(`El. laiško siuntimo klaida (-> ${to}): ${err.message}`);
  }
}

export function sendPasswordResetEmail({ account, role, token }) {
  const url = new URL('/atkurti-slaptazodi', process.env.CLIENT_ORIGIN || 'http://localhost:5173');
  // Fragmentas nepersiunčiamas HTTP serveriui ir nepatenka į prieigos žurnalus.
  url.hash = new URLSearchParams({ token, role }).toString();
  return sendMail({
    to: account.email,
    subject: 'Slaptažodžio atkūrimas — RehaBook',
    text: `Slaptažodį galite pakeisti per 30 minučių: ${url}\n\nNuoroda vienkartinė. Jei atkūrimo neprašėte, šį laišką ignoruokite.`,
  });
}

/** Sveikinimo laiškas po paciento registracijos. */
export function sendWelcomeEmail(patient) {
  return sendMail({
    to: patient.email,
    subject: 'Sveiki prisijungę prie RehaBook',
    text:
      `Sveiki, ${patient.name}!\n\n` +
      `Jūsų RehaBook paskyra sėkmingai sukurta. Dabar galite rezervuoti vizitus ` +
      `pas mūsų specialistus ir matyti savo vizitų istoriją.\n\n` +
      `Pagarbiai,\nRehaBook komanda`,
  });
}

/** Vizito patvirtinimo laiškas pacientui po rezervacijos. */
export function sendVisitConfirmation({ patient, specialist, service, visit }) {
  return sendMail({
    to: patient?.email,
    subject: 'Vizito rezervacija patvirtinta — RehaBook',
    text:
      `Sveiki, ${patient?.name || ''}!\n\n` +
      `Jūsų vizitas užregistruotas:\n` +
      `  Specialistas: ${specialist?.name || '-'}\n` +
      `  Paslauga: ${service?.name || '-'}\n` +
      `  Data: ${visit.date} ${visit.time}\n` +
      `  Kaina: ${visit.price} €\n\n` +
      `Jei planai keisis, vizitą galite atšaukti savo paskyroje.\n\n` +
      `Pagarbiai,\nRehaBook komanda`,
  });
}

/** Pranešimas pacientui apie vizito atšaukimą. */
export function sendVisitCancellation({ patient, visit }) {
  return sendMail({
    to: patient?.email,
    subject: 'Vizitas atšauktas — RehaBook',
    text:
      `Sveiki, ${patient?.name || ''}!\n\n` +
      `Jūsų vizitas ${visit.date} ${visit.time} buvo atšauktas.\n` +
      (visit.cancelReason ? `Priežastis: ${visit.cancelReason}\n` : '') +
      `\nGalite rezervuoti naują vizitą bet kada.\n\n` +
      `Pagarbiai,\nRehaBook komanda`,
  });
}

/** Priminimas pacientui dieną prieš vizitą (siunčia planuoklis – lib/reminders.js). */
export function sendVisitReminder({ patient, specialist, service, visit }) {
  return sendMail({
    to: patient?.email,
    subject: `Priminimas: rytoj vizitas ${visit.time} — RehaBook`,
    text:
      `Sveiki, ${patient?.name || ''}!\n\n` +
      `Primename, kad rytoj Jūsų laukia vizitas:\n` +
      `  Specialistas: ${specialist?.name || '-'}\n` +
      `  Paslauga: ${service?.name || '-'}\n` +
      `  Data: ${visit.date} ${visit.time}\n` +
      `  Trukmė: ${visit.duration} min\n` +
      `  Adresas: Gedimino pr. 28, Vilnius\n\n` +
      `Jei atvykti negalėsite, prašome atšaukti vizitą savo paskyroje, kad laiką galėtų užimti kitas pacientas.\n\n` +
      `Pagarbiai,\nRehaBook komanda`,
  });
}

export default {
  sendWelcomeEmail,
  sendVisitConfirmation,
  sendVisitCancellation,
  sendPasswordResetEmail,
  sendVisitReminder,
};
