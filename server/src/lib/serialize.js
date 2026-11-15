/**
 * Atsako formavimo pagalbinės funkcijos.
 * - stripPassword: pašalina jautrius/vidinius laukus (passwordHash, failedLogins,
 *   lockedUntil, deletedAt) — jų niekada negrąžiname klientui.
 * - formatVisit: vizito `service` ryšį paverčia paslaugos pavadinimo eilute,
 *   kaip tikisi frontend (v.service === pavadinimas).
 */
export function stripPassword(record) {
  if (!record) return record;
  const {
    passwordHash: _hash,
    failedLogins: _failed,
    lockedUntil: _lock,
    deletedAt: _deleted,
    resetTokenHash: _reset,
    resetExpiresAt: _expires,
    tokenVersion: _version,
    ...rest
  } = record;
  return rest;
}

export function stripPasswords(records) {
  return records.map(stripPassword);
}

export function formatVisit(visit) {
  if (!visit) return visit;
  const { service, patient, specialist, ...rest } = visit;
  return {
    ...rest,
    service: service ? service.name : rest.service,
    // Paciento/specialisto santrauka įtraukiama tik jei ryšys buvo užklaustas
    // (pvz. specialisto vizituose, kad būtų matomi pacientų vardai be admin teisių).
    ...(patient
      ? { patient: { id: patient.id, name: patient.name, surname: patient.surname } }
      : {}),
    ...(specialist ? { specialist: { id: specialist.id, name: specialist.name } } : {}),
  };
}

export function formatVisits(visits) {
  return visits.map(formatVisit);
}
