import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { buildVisitPdf } from '../src/utils/pdf.js';

test('ilgo vizito PDF kuriamas su įterptu Unicode šriftu ir keliais puslapiais', async () => {
  const font = await readFile(new URL('../src/assets/fonts/DejaVuSans.ttf', import.meta.url));
  const doc = await buildVisitPdf(
    {
      id: 42,
      service: 'Kineziterapija',
      date: '2099-01-05',
      time: '09:00',
      duration: 60,
      status: 'įvykęs',
      diagnosis: 'ĄČĘĖĮŠŲŪŽ ąčęėįšųūž',
      price: 40,
      procedures: 'Procedūrų aprašas. '.repeat(160),
      recommendations: 'Rekomendacijų tekstas. '.repeat(160) + 'PABAIGOS ŽYMA',
    },
    'Testo specialistė',
    font
  );
  assert.ok(doc.getNumberOfPages() > 1);
  assert.ok(doc.getFontList().DejaVu);
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  assert.ok(bytes.length > 10000);
  if (process.env.QA_PDF_OUTPUT) await writeFile(process.env.QA_PDF_OUTPUT, bytes);
});
