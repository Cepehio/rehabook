import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllPages, withCurrentSession } from '../src/services/api.js';

test('administratoriaus sąrašas išsaugo ir įrašus po pirmojo šimto', async () => {
  const data = Array.from({ length: 205 }, (_, id) => ({ id }));
  const calls = [];
  const result = await getAllPages(async ({ page, limit }) => {
    calls.push(page);
    return { data: data.slice((page - 1) * limit, page * limit), totalPages: 3 };
  });
  assert.deepEqual(result, data);
  assert.deepEqual(calls, [1, 2, 3]);
});
test('ankstesnės sesijos pavėluoti duomenys nerodomi naujai paskyrai', () => {
  let token = 'first-session';
  const values = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => token },
  });
  try {
    const oldResponse = withCurrentSession((data) => values.push(data));
    token = 'second-session';
    oldResponse('first-patient-data');
    withCurrentSession((data) => values.push(data))('second-patient-data');
    assert.deepEqual(values, ['second-patient-data']);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
