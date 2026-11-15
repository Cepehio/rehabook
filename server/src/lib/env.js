/** Serverio konfigūracija siejama su server/.env, nepriklausomai nuo terminalo katalogo. */
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
const { error } = dotenv.config({ path: envFile, override: false, quiet: true });

// Docker ir CI gali perduoti reikšmes tiesiai per proceso aplinką, be .env failo.
if (error && error.code !== 'ENOENT') {
  throw new Error(`Nepavyko perskaityti server/.env (${error.code || 'skaitymo klaida'}).`);
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    'Nenustatytas DATABASE_URL. Nukopijuokite server/.env.example į server/.env, ' +
      'įrašykite savo PostgreSQL prisijungimo adresą ir paleiskite serverį iš naujo. ' +
      'Failo vardas turi būti .env, ne .env.txt. Docker / CI aplinkoje nustatykite DATABASE_URL kintamąjį.'
  );
}
