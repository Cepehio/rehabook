import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'postgresql://demo:example@localhost:5432/from_server_file';
const externalUrl = 'postgresql://demo:example@localhost:5432/from_process';

function runFixture({ file, external, expected }) {
  // Naudojama izoliuota tikro įkėlimo modulio kopija; naudotojo server/.env nekeičiamas.
  const root = mkdtempSync(join(here, '.tmp-env-'));
  try {
    mkdirSync(join(root, 'src/lib'), { recursive: true });
    mkdirSync(join(root, 'other'));
    copyFileSync(join(here, '../src/lib/env.js'), join(root, 'src/lib/env.js'));
    if (file !== undefined) writeFileSync(join(root, '.env'), file);
    writeFileSync(join(root, 'other/.env'), 'DATABASE_URL=wrong_working_directory\n');
    const environment = { ...process.env };
    delete environment.DATABASE_URL;
    for (const key of Object.keys(environment)) {
      if (key.startsWith('DOTENV_')) delete environment[key];
    }
    if (external !== undefined) environment.DATABASE_URL = external;
    const moduleUrl = pathToFileURL(join(root, 'src/lib/env.js')).href;
    const script =
      `import ${JSON.stringify(moduleUrl)};` +
      `if (process.env.DATABASE_URL !== ${JSON.stringify(expected)}) process.exitCode = 2;`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: join(root, 'other'),
      env: environment,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ifError(result.error);
    return result;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('server/.env įkeliamas ir paleidus iš kito katalogo', () => {
  const result = runFixture({ file: `DATABASE_URL="${fileUrl}"\n`, expected: fileUrl });
  assert.equal(result.status, 0, result.stderr);
});

test('proceso DATABASE_URL turi pirmenybę prieš vietinį .env', () => {
  const result = runFixture({
    file: `DATABASE_URL="${fileUrl}"\n`,
    external: externalUrl,
    expected: externalUrl,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('Docker arba CI gali veikti su proceso aplinka be .env failo', () => {
  const result = runFixture({ external: externalUrl, expected: externalUrl });
  assert.equal(result.status, 0, result.stderr);
});

test('trūkstamas arba tuščias DATABASE_URL stabdo paleidimą su instrukcija', () => {
  for (const file of [undefined, 'DATABASE_URL="   "\n']) {
    const result = runFixture({ file });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Nenustatytas DATABASE_URL/);
    assert.match(result.stderr, /server\/\.env\.example/);
  }
});
