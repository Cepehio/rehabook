import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDate,
  normalizeTime,
  bookingError,
  overlaps,
  availableSlots,
  canTransition,
  clinicNow,
  weekRange,
  workloadMinutes,
  pickLeastLoadedSpecialist,
  availableSlotsAny,
} from '../shared/booking.js';

const now = new Date('2026-09-11T05:00:00Z');
test('kalendorinės datos: keliamieji metai ir neegzistuojančios datos', () => {
  assert.equal(isDate('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-1', null])
    assert.equal(isDate(value), false);
});
test('laiko normalizavimas neleidžia apeiti konflikto su 9:00 ir 09:00', () => {
  assert.equal(normalizeTime('9:00'), '09:00');
  for (const value of ['24:00', '09:60', '-1:00', '9:0', {}])
    assert.equal(normalizeTime(value), null);
});
test('Lietuvos data ties UTC dienos riba', () => {
  assert.deepEqual(clinicNow(new Date('2026-09-10T22:30:00Z')), {
    date: '2026-09-11',
    time: '01:30',
  });
});
test('praeitis ir darbo dienos ribos tikrinamos pagal visą paslaugos trukmę', () => {
  assert.ok(bookingError('2026-09-10', '09:00', 60, now));
  assert.ok(bookingError('2026-09-11', '07:45', 60, now));
  assert.ok(bookingError('2026-09-11', '19:30', 60, now));
  assert.equal(bookingError('2026-09-11', '19:00', 60, now), null);
  assert.ok(bookingError('2026-09-12', '08:00', 60, now));
  assert.equal(bookingError('2026-09-12', '14:00', 60, now), null);
  assert.ok(bookingError('2026-09-13', '10:00', 60, now));
});
test('intervalai persidengia, tačiau gretimi vizitai leidžiami', () => {
  const visit = { time: '09:00', duration: 60, status: 'patvirtintas' };
  assert.equal(overlaps('09:30', 45, visit), true);
  assert.equal(overlaps('08:45', 30, visit), true);
  assert.equal(overlaps('10:00', 45, visit), false);
  assert.equal(overlaps('08:00', 60, visit), false);
  assert.equal(overlaps('09:00', 60, { ...visit, status: 'atšauktas' }), false);
});
test('laisvi laikai neapima užimtos trukmės ir grąžina atšauktą laiką', () => {
  const visits = [{ time: '09:00', duration: 60, status: 'laukiamas' }];
  const slots = availableSlots('2026-09-14', 45, visits, now);
  assert.equal(slots.includes('08:30'), false);
  assert.equal(slots.includes('09:45'), false);
  assert.equal(slots.includes('10:00'), true);
  assert.equal(
    availableSlots('2026-09-14', 45, [{ ...visits[0], status: 'atšauktas' }], now).includes(
      '09:00'
    ),
    true
  );
});
test('savaitės ribos skaičiuojamos nuo pirmadienio iki sekmadienio', () => {
  assert.deepEqual(weekRange('2026-09-16'), { start: '2026-09-14', end: '2026-09-20' });
  assert.deepEqual(weekRange('2026-09-14'), { start: '2026-09-14', end: '2026-09-20' });
  assert.deepEqual(weekRange('2026-09-20'), { start: '2026-09-14', end: '2026-09-20' });
  assert.equal(weekRange('2026-02-30'), null);
});
test('darbo krūvis skaičiuojamas minutėmis be atšauktų vizitų', () => {
  assert.equal(
    workloadMinutes([
      { time: '09:00', duration: 60, status: 'laukiamas' },
      { time: '11:00', duration: 45, status: 'patvirtintas' },
      { time: '13:00', duration: 90, status: 'atšauktas' },
    ]),
    105
  );
  assert.equal(workloadMinutes([]), 0);
});
test('automatinis priskyrimas parenka laisvą ir mažiausiai apkrautą specialistą', () => {
  const busy = { time: '10:00', duration: 60, status: 'laukiamas' };
  const candidates = [
    { id: 1, dayVisits: [busy], weekVisits: [busy] },
    { id: 2, dayVisits: [{ time: '08:00', duration: 60, status: 'laukiamas' }], weekVisits: [] },
    { id: 3, dayVisits: [{ time: '08:00', duration: 30, status: 'laukiamas' }], weekVisits: [] },
  ];
  // #1 užimtas 10:00–11:00, todėl tarp #2 (60 min) ir #3 (30 min) laimi mažiau apkrautas #3
  assert.equal(pickLeastLoadedSpecialist(candidates, '10:30', 60).id, 3);
  // 12:00 laisvi visi; #1 tos dienos krūvis 60, #3 – 30 → #3
  assert.equal(pickLeastLoadedSpecialist(candidates, '12:00', 60).id, 3);
  // Vienodas dienos krūvis sprendžiamas pagal savaitės krūvį, tada pagal mažesnį ID
  const tie = [
    { id: 5, dayVisits: [], weekVisits: [{ time: '09:00', duration: 120, status: 'laukiamas' }] },
    { id: 4, dayVisits: [], weekVisits: [{ time: '09:00', duration: 30, status: 'laukiamas' }] },
    { id: 6, dayVisits: [], weekVisits: [{ time: '09:00', duration: 30, status: 'laukiamas' }] },
  ];
  assert.equal(pickLeastLoadedSpecialist(tie, '09:00', 60).id, 4);
  // Neprieinamas specialistas nekandidatuoja; niekam nelaisvu laiku grąžinamas null
  assert.equal(
    pickLeastLoadedSpecialist([{ id: 9, available: false, dayVisits: [] }], '09:00', 60),
    null
  );
  assert.equal(pickLeastLoadedSpecialist([{ id: 1, dayVisits: [busy] }], '10:15', 30), null);
  assert.equal(pickLeastLoadedSpecialist([], '09:00', 60), null);
});
test('laisvų laikų sąjunga apima laiką, kai laisvas bent vienas specialistas', () => {
  const first = [{ time: '09:00', duration: 60, status: 'laukiamas' }];
  const second = [{ time: '10:00', duration: 60, status: 'laukiamas' }];
  const slots = availableSlotsAny('2026-09-14', 60, [first, second], now);
  // 09:00 laisvas pas antrą, 10:00 – pas pirmą, 08:30 – pas antrą (09:30 užimtas abiem)
  assert.equal(slots.includes('09:00'), true);
  assert.equal(slots.includes('10:00'), true);
  assert.equal(slots.includes('08:30'), true);
  assert.equal(slots.includes('09:30'), false);
  assert.equal(availableSlotsAny('2026-09-14', 60, [first, first], now).includes('09:00'), false);
  assert.deepEqual(availableSlotsAny('2026-09-14', 60, [], now), []);
  assert.deepEqual(slots, [...slots].sort());
});
test('galutinės būsenos negrąžinamos į aktyvią rezervaciją', () => {
  assert.equal(canTransition('laukiamas', 'patvirtintas'), true);
  assert.equal(canTransition('patvirtintas', 'įvykęs'), true);
  assert.equal(canTransition('atšauktas', 'patvirtintas'), false);
  assert.equal(canTransition('įvykęs', 'laukiamas'), false);
  assert.equal(canTransition('laukiamas', 'neteisingas'), false);
});
