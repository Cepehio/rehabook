# RehaBook

Kineziterapijos klinikos registracijos ir vizitų valdymo studijų projektas. Pacientas rezervuoja vizitą ir mato savo istoriją, specialistas tvarko jam priskirtus vizitus, administratorius prižiūri katalogus ir suvestines.


**darbo krūvio paskirstymas** – registruojantis galima rinktis „bet kuris laisvas specialistas“, tada serveris toje pačioje transakcijoje priskiria pasirinktu laiku laisvą ir mažiausiai apkrautą specialistą; **priminimai prieš vizitą** el. paštu per `node-cron` planuoklį; **saugumo priemonių atitiktis** OWASP ASVS 4.0 ir Top 10 aprašyta `docs/SAUGUMAS.md`; **paslaugų katalogo valdymas** administratoriaus zonoje (kainos, trukmės, aprašai, aktyvumas; esami vizitai saugo savo kainą); **pritaikymas mobiliesiems įrenginiams**.
## Priemonės ir katalogai

Reikia Node.js 22 arba 24, npm ir PostgreSQL (patikrinta su 16; Docker variantas naudoja 18). Docker variantui reikia Docker Engine ir Compose. Sąsaja – React 18 / Vite 7 (esbuild ir rollup) / React Router 7, API – Express 5 / Prisma 6. Tikslūs priklausomybių variantai fiksuoti abiejuose `package-lock.json` failuose; `npm audit` abiejuose paketuose nerodo žinomų pažeidžiamumų, o `npm ci` nerodo nebepalaikomų („deprecated“) paketų įspėjimų (2026-11-07). Priklausomybių diegimo skriptus leidžia tik `package.json` laukas `allowScripts` (naujesnių npm versijų politika), o `overrides` laukai tranzityvinėms priklausomybėms parenka palaikomas ir nepažeidžiamas versijas (`server`: `deepmerge-ts` 8, `glob` 14, `minimatch` 11; šaknyje: `minimatch` 11). Paskutinė `npm audit` ir `npm ci` patikra – 2026-11-07 (0 pažeidžiamumų, be nebepalaikomų paketų įspėjimų).

| Katalogas | Paskirtis |
| --- | --- |
| `src/` | React sąsaja, paskyrų puslapiai, registracija, PDF eksportas |
| `server/src/` | API, autentifikacija, kontroleriai, OpenAPI |
| `server/prisma/` | DB schema, migracijos, demonstraciniai duomenys |
| `shared/` | Bendros rezervacijų taisyklės |
| `tests/`, `server/tests/` | Logikos, PDF ir API testai |
| `src/features/booking/BookingPage.test.jsx` | Registracijos formos komponento testai |
| `docs/` | Reikalavimai, modeliai, saugumo atitiktis (`SAUGUMAS.md`), patikrų protokolas ir demonstracijos scenarijus |
| `server/src/lib/reminders.js`, `server/scripts/send-reminders.js` | Priminimų prieš vizitą planuoklis ir rankinis paleidimas |

Instrukcijos pateiktos šiame faile ir `docs/` kataloge.

## Paleidimas su Docker

Komandas vykdykite projekto šaknyje.

1. Nukopijuokite `.env.example` į `.env`: `cp .env.example .env` arba PowerShell `Copy-Item .env.example .env`. Įrašykite savo `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` ir atsitiktinį `JWT_SECRET`. Raktui sugeneruoti:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

2. Paleiskite DB ir API. API automatiškai pritaiko migracijas:

```bash
docker compose up --build -d
docker compose logs api
```

3. Demonstracijai į tuščią DB įkelkite pavyzdžius. Jei bent viena lentelė netuščia, įkėlimas praleidžiamas, esami įrašai nekeičiami:

```bash
docker compose exec api npm run seed
```

4. Sąsają paleiskite atskirai:

```bash
npm ci
npm run dev
```

Atverkite `http://localhost:5173`. API: `http://localhost:4000/api`. OpenAPI: `http://localhost:4000/api/docs`. Vite `/api` užklausas persiunčia į vietinį API. Kitam adresui nurodykite `API_PROXY_TARGET` Vite proceso aplinkoje arba `VITE_API_URL` šaknies `.env` faile.

## Paleidimas be Docker

1. Įdiekite PostgreSQL, sukurkite bazę `rehabook` ir naudotoją, galintį joje kurti lenteles.
2. Nukopijuokite `server/.env.example` į `server/.env`. Nurodykite savo `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Specialius DB slaptažodžio simbolius URL užkoduokite.
3. API terminale:

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run seed
npm start
```

4. Kitame terminale, projekto šaknyje:

```bash
npm ci
npm run dev
```

`server/.env` naudojamas vietiniam API, šaknies `.env` – Compose ir Vite. Tai skirtingi konfigūracijos failai; abu `.env` failai į versijų kontrolę neįtraukiami (`.gitignore`).

### Paleidimas vienu procesu (surinkta sąsaja)

Vietoje Vite kūrimo serverio sąsają galima surinkti ir aptarnauti pačiu API serveriu – tada reikia vieno terminalo ir vieno adreso. Projekto šaknyje:

```bash
npm ci
npm run build
```

Tada `server` kataloge `npm start`. Radęs projekto šaknies `dist` katalogą, serveris jį aptarnauja tuo pačiu adresu (`http://localhost:4000`): `assets/*` failai su ilgu kešavimu, o visi ne-`/api` keliai grąžina `index.html` (SPA maršrutizavimas). `/api/*` keliai ir API 404 atsakymai nesikeičia. Kitą sąsajos vietą nurodo `CLIENT_DIST` kintamasis; be `dist` katalogo serveris sąsajos neaptarnauja ir paleidimo metu tai praneša. Po kodo pakeitimų sąsają reikia surinkti iš naujo.

### Klaida „Environment variable not found: DATABASE_URL“

Ši klaida reiškia, kad API negavo DB prisijungimo adreso. `.env.example` yra šablonas; vietinis serveris skaito `server/.env`. Failas neturi vadintis `.env.txt`. API ir demonstracinis įkėlimas šį kelią nustato pagal savo modulio vietą, todėl jis nepriklauso nuo terminalo katalogo. Docker ir CI perduoti aplinkos kintamieji išlaiko pirmenybę.

Windows PowerShell terminale, projekto šaknyje:

```powershell
cd server
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Linux / macOS terminale vykdykite `cd server`, tada, jei `.env` dar nėra, `cp .env.example .env`. Atverkite failą teksto redaktoriumi. Abiem atvejais įrašykite savo veikiančios PostgreSQL bazės adresą:

```dotenv
DATABASE_URL="postgresql://postgres:TAVO_SLAPTAZODIS@localhost:5432/rehabook?schema=public"
```

Pakeiskite naudotoją, slaptažodį, prievadą ir bazės vardą pagal savo DB. URL reikšmėje esantys specialūs slaptažodžio simboliai turi būti užkoduoti. Užpildykite ir šablone esančius `JWT_SECRET` bei `ADMIN_PASSWORD`. Išsaugokite failą, sustabdykite ankstesnį API procesą ir iš `server` katalogo paleiskite:

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
npm start
```

PostgreSQL turi veikti, o prisijungimas – leisti pasiekti `rehabook` bazę. Šios komandos nėra PostgreSQL serverio diegimas. Jei jau turite duomenų, prieš migraciją išsaugokite DB kopiją; demonstracinis įkėlimas netuščios DB nekeičia. Gavus kitą klaidą, pavyzdžiui, apie neteisingą slaptažodį ar nepasiekiamą serverį, tikrinkite būtent tą prisijungimo parametrą.

## Demonstracinės paskyros

Šios paskyros skirtos vietiniams pavyzdžiams, kuriuos sukuria `npm run seed`.

| Rolė | El. paštas | Slaptažodis | Licencija |
| --- | --- | --- | --- |
| Pacientas | jonas@mail.lt | pac12345 | – |
| Specialistas | ruta@rehabook.lt | spec12345 | LT-KIN-2012-0847 |
| Administratorius | Reikšmė `ADMIN_EMAIL` | Reikšmė `ADMIN_PASSWORD` | – |

## El. paštas ir atkūrimas

Numatytas `MAIL_MODE=file`. Laiškai išorėje nesiunčiami; tekstai saugomi API `outbox/` katalogo JSON failuose. Atkūrimo nuoroda galioja 30 min. ir panaudojama vieną kartą. Testuojantis asmuo ją atveria iš savo demonstracinio laiško. Docker laiškus galima nukopijuoti:

```bash
docker compose cp api:/app/server/outbox ./demo-outbox
```

SMTP režimui nurodykite `MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. `CLIENT_ORIGIN` turi atitikti sąsajos adresą, nes naudojamas atkūrimo nuorodoms. SMTP siuntimas nebuvo tikrintas. Siuntimo klaida fiksuojama API žurnale; rezervacijos įrašas dėl jos neatšaukiamas.

## Rezervacijos taisyklės

Laiko zona `Europe/Vilnius`. Pirmadienį–penktadienį dirbama 08:00–20:00, šeštadienį 09:00–15:00, sekmadienį nedirbama. Pradžios laikai siūlomi kas 15 min.; turi tilpti visa paslaugos trukmė. Registracijoje rodoma visa dienos laikų lentelė: laikai, kuriais specialistas užimtas bent dalį paslaugos trukmės, visiems rodomi pritemdyti ir nepasirenkami, o prisijungusiam pacientui taip pat pažymimi laikai, persidengiantys su jo paties vizitais (brūkšniuotu rėmeliu). Vizitas negali persidengti su to paties specialisto arba paciento neatšauktu vizitu – tai galutinai tikrinama serveryje kuriant vizitą. Atšauktos ir įvykusios rezervacijos neaktyvuojamos iš naujo.

Paslaugų katalogą (pavadinimą, kategoriją, aprašą, kainą, trukmę) administratorius tvarko skirtuke „Paslaugos“. Išjungta paslauga nerodoma pacientams ir nepriimama naujoms rezervacijoms, bet jos vizitų istorija išlieka; paslauga su vizitais nešalinama. Kainos ar trukmės pakeitimas galioja tik naujoms rezervacijoms.

`nextVisit` yra rekomenduojama kito vizito data, papildomos rezervacijos ji nesukuria. Sumų suvestinės rodo neatšauktų vizitų paslaugų vertę. Individualūs specialistų grafikai, atostogos ir atsiskaitymų apskaita neįgyvendinti.

### Automatinis specialisto priskyrimas

Antrame registracijos žingsnyje galima rinktis **„Bet kuris laisvas specialistas“**. Tada laisvi laikai rodomi, kai laisvas bent vienas priimantis specialistas, o pateikus rezervaciją (`POST /api/visits` be `specialistId`) serveris parenka specialistą, laisvą visai paslaugos trukmei, pagal mažiausią tos dienos darbo krūvį minutėmis; esant lygybei – pagal mažiausią savaitės krūvį, tada pagal mažesnį ID. Atsake grąžinama `specialist.name` ir `autoAssigned: true`; patvirtinimo ekrane ir laiške nurodomas priskirtas specialistas. Jei pasirinktu laiku laisvų specialistų nėra – 409.

### Priminimai prieš vizitą

API procesas kasdien `REMINDER_CRON` laiku (numatyta `0 9 * * *`, `Europe/Vilnius`) pacientams, turintiems rytojaus laukiamą arba patvirtintą vizitą, parengia priminimo laišką ir pažymi `Visit.reminderSentAt`, todėl vienas vizitas primenamas vieną kartą. Išjungimas: `REMINDERS_ENABLED=false` (testuose ir CI išjungta). Rankinis paleidimas demonstracijai, iš `server` katalogo:

```bash
npm run reminders               # rytojaus vizitams
npm run reminders -- 2026-10-17 # nurodytos dienos vizitams
```

### Mobilieji įrenginiai

Sąsaja pritaikyta siauriems ekranams (≤ 768 px) atskiru CSS sluoksniu `src/styles/globals.css`: meniu mygtukas viršuje, vieno stulpelio išdėstymas, rolių zonose šoninė juosta virsta viršutine juosta su slenkamais skirtukais, administratoriaus vizitų lentelė slenkama horizontaliai. Stalinio vaizdo išvaizda nepakeista.

## Patikros

Sąsajos ir logikos testams DB nereikia:

```bash
npm test
npm run lint
npm run build
```

API testams sukurkite atskirą `rehabook_test` DB. Testų paruošimas atmeta bazę, kurios vardas nesibaigia `_test`. Testai kuria ir šalina bandomuosius įrašus. Naudojamos ar demonstracinės `rehabook` bazės testams nenaudokite.

Linux/macOS API terminale:

```bash
cd server
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/rehabook_test?schema=public&connection_limit=5'
npx prisma migrate deploy
npm test
```

PowerShell vietoje `export`:

```powershell
$env:DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/rehabook_test?schema=public&connection_limit=5'
```

`.github/workflows/verify.yml` atlieka tą pačią patikrą GitHub aplinkoje su PostgreSQL 18 (`npm ci`, lint, visi testai, build). Patikrų rezultatai ir apribojimai pateikti `docs/TESTAVIMAS.md`.

Serverio `.env` įkėlimą galima atskirai patikrinti be DB: iš `server` katalogo vykdykite `npm run test:config`. Šie testai naudoja laikinus failus ir nekeičia jūsų `server/.env`.

## Atnaujinimas ir šalinimas

Prieš migruodami esamą DB išsaugokite jos kopiją. Trečioji ir ketvirtoji migracijos (`20261014000100_visit_reminders`, `20261014000200_service_active`) tik prideda `Visit.reminderSentAt` ir `Service.active` stulpelius. Antroji migracija perkelia paslaugos trukmę į vizitą, suvienodina laiką į `HH:mm` ir pakeičia unikalumo apribojimą. Jei senuose įrašuose yra neteisingų būsenų, neigiamų kainų ar laikų dublių po suvienodinimo, būtina patikrinti ir sutvarkyti konkrečius įrašus. Migraciją į jau naudojamą DB pirmiausia išbandykite su jos kopija.

PostgreSQL 18 konteinerio tomo vieta – `/var/lib/postgresql`. Turint senos Compose konfigūracijos tomą, pirmiausia eksportuokite jo duomenis ir atkurkite atskiroje naujoje bazėje. Neprijunkite seno tomo aklai prie pakeistos konfigūracijos.

Node procesus sustabdo `Ctrl+C`, Docker paslaugas – `docker compose down`. Duomenų tomai lieka. Programai pašalinti išsaugokite reikalingą DB kopiją, sustabdykite procesus ir pašalinkite projekto katalogą. DB bei tomų ištrynimas yra atskiras veiksmas, prarandantis jų duomenis; atnaujinimui jis nereikalingas.
