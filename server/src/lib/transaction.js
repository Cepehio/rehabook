/**
 * Transakciju pagalbines funkcijos.
 * serializable(work) vykdo darba Prisma transakcijoje Serializable izoliacijos lygiu ir,
 * PostgreSQL aptikus lygiagreciu irasu konflikta (Prisma kodas P2034), pakartoja visa operacija
 * iki 3 kartu; po treciojo nesekmingo bandymo grazina 409. Kitos klaidos perduodamos toliau.
 * httpError(status, message) sukuria klaida su HTTP kodu centralizuotam apdorojimui.
 */
import { prisma } from './prisma.js';

/** Pakartojama visa transakcija, jei PostgreSQL aptinka lygiagrečių įrašų konfliktą. */
export async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable', timeout: 10000 });
    } catch (error) {
      if (error.code !== 'P2034') throw error;
      if (attempt === 2) {
        throw Object.assign(new Error('Duomenys tuo metu pasikeitė. Pakartokite veiksmą.'), {
          status: 409,
        });
      }
    }
  }
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
