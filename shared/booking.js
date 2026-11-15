/** Klinikų darbo laikas ir rezervacijų taisyklės, bendros klientui ir serveriui. */
export const CLINIC_TIME_ZONE = 'Europe/Vilnius';
export const VISIT_STATUSES = ['laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas'];
export const ACTIVE_STATUSES = ['laukiamas', 'patvirtintas'];

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeTime(value) {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export const timeMinutes = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return NaN;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function clinicNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export function workingHours(date) {
  if (!isDate(date)) return null;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day === 0) return null;
  return day === 6 ? { start: 9 * 60, end: 15 * 60 } : { start: 8 * 60, end: 20 * 60 };
}

export function bookingError(date, time, duration, now = new Date()) {
  if (!isDate(date) || !normalizeTime(time)) return 'Neteisinga vizito data arba laikas.';
  if (!Number.isInteger(duration) || duration < 1 || duration > 720)
    return 'Neteisinga paslaugos trukmė.';
  const current = clinicNow(now);
  if (date < current.date || (date === current.date && normalizeTime(time) <= current.time)) {
    return 'Vizitą galima rezervuoti tik ateities laikui.';
  }
  const hours = workingHours(date);
  const start = timeMinutes(time);
  if (!hours || start < hours.start || start + duration > hours.end || start % 15 !== 0) {
    return 'Pasirinktas laikas arba visa paslaugos trukmė netelpa į klinikos darbo laiką.';
  }
  return null;
}

export function overlaps(time, duration, visit) {
  if (visit.status === 'atšauktas') return false;
  const start = timeMinutes(time);
  const otherStart = timeMinutes(visit.time);
  return start < otherStart + visit.duration && otherStart < start + duration;
}

export function availableSlots(date, duration, visits = [], now = new Date()) {
  const hours = workingHours(date);
  if (!hours || !Number.isInteger(duration) || duration < 1 || duration > 720) return [];
  const result = [];
  for (let start = hours.start; start + duration <= hours.end; start += 15) {
    const time = formatTime(start);
    if (
      !bookingError(date, time, duration, now) &&
      !visits.some((visit) => overlaps(time, duration, visit))
    ) {
      result.push(time);
    }
  }
  return result;
}

/** Savaitės (pirmadienis–sekmadienis), kuriai priklauso data, ribos „YYYY-MM-DD“ pavidalu. */
export function weekRange(date) {
  if (!isDate(date)) return null;
  const day = new Date(`${date}T12:00:00Z`);
  const offset = (day.getUTCDay() + 6) % 7; // 0 = pirmadienis
  const start = new Date(day);
  start.setUTCDate(day.getUTCDate() - offset);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Specialisto darbo krūvis minutėmis: neatšauktų vizitų trukmių suma. */
export function workloadMinutes(visits = []) {
  return visits
    .filter((visit) => visit.status !== 'atšauktas')
    .reduce((sum, visit) => sum + (Number(visit.duration) || 0), 0);
}

/**
 * Darbo krūvio paskirstymas: iš specialistų, laisvų pasirinktu laiku visai paslaugos
 * trukmei, parenkamas mažiausiai apkrautas. Kandidatas: { id, dayVisits, weekVisits }.
 * Lyginama eilės tvarka: 1) tos dienos krūvis minutėmis, 2) tos savaitės krūvis
 * minutėmis, 3) mažesnis identifikatorius (kad rezultatas būtų determinuotas).
 * Grąžina pasirinktą kandidatą arba null, jei laisvų specialistų nėra.
 */
export function pickLeastLoadedSpecialist(candidates = [], time, duration) {
  const free = candidates.filter(
    (candidate) =>
      candidate.available !== false &&
      !(candidate.dayVisits || []).some((visit) => overlaps(time, duration, visit))
  );
  if (!free.length) return null;
  const score = (candidate) => [
    workloadMinutes(candidate.dayVisits),
    workloadMinutes(candidate.weekVisits || candidate.dayVisits),
    Number(candidate.id),
  ];
  return free.reduce((best, candidate) => {
    const [a, b] = [score(best), score(candidate)];
    for (let i = 0; i < a.length; i += 1) {
      if (b[i] !== a[i]) return b[i] < a[i] ? candidate : best;
    }
    return best;
  });
}

/** Laisvi pradžios laikai, kai tinka bet kuris specialistas: sąjunga per visus kandidatus. */
export function availableSlotsAny(date, duration, visitsBySpecialist = [], now = new Date()) {
  const union = new Set();
  for (const visits of visitsBySpecialist) {
    for (const time of availableSlots(date, duration, visits, now)) union.add(time);
  }
  return [...union].sort();
}

export function canTransition(from, to) {
  if (!VISIT_STATUSES.includes(from) || !VISIT_STATUSES.includes(to)) return false;
  if (from === to) return true;
  return {
    laukiamas: ['patvirtintas', 'įvykęs', 'atšauktas'],
    patvirtintas: ['įvykęs', 'atšauktas'],
    įvykęs: [],
    atšauktas: [],
  }[from].includes(to);
}
