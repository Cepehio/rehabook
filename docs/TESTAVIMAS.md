# RehaBook patikrų protokolas

Data: 2026-10-14; visos automatinės patikros pakartotos 2026-10-21 po priklausomybių atnaujinimo ir 2026-11-07 po naujų `npm audit` pranešimų (žr. lentelės eilutes apie `npm audit` ir `npm ci`). Aplinka: Linux x64, Node.js 22.22.0, npm 10.9.4 ir 11, PostgreSQL 16.15, Chromium 141. API testai vykdyti su atskira `rehabook_test` baze ir `connection_limit=5`, todėl Serializable transakcijų konkurencija tikrinta keliomis DB jungtimis. Migracijos (4) pritaikytos tuščioje bazėje iš eilės. CPU ir RAM parametrai nėra deklaruojami kaip minimalūs sistemos reikalavimai.

| Patikra | Faktinis rezultatas |
| --- | --- |
| Node logikos, API kliento ir PDF testai (`npm test` šaknyje) | 14 iš 14 praėjo (4 nauji: savaitės ribos, krūvis minutėmis, automatinis priskyrimas, laikų sąjunga) |
| React BookingPage komponentas (Vitest + Testing Library) | 6 iš 6 praėjo (nauji: „bet kuris laisvas specialistas“ siunčiamas be `specialistId`; užimti ir persidengiantys laikai pritemdyti ir nepasirenkami) |
| Express API ir Prisma (Supertest, PostgreSQL 16) | 57 iš 57 praėjo: 36 `booking-integrity`, `visits`, `auth`, `rbac`, `validation`, `account-integrity` (naujas: dienos laikų lentelė `slots`/`taken`/`own`/`available`) + 5 `auto-assign.test.js` + 8 `reminders.test.js` + 6 `services.test.js` + 2 `static-client.test.js` (surinktos sąsajos aptarnavimas: index.html, `assets`, SPA keliai, `/api` 404 lieka JSON, be `dist` – 404) |
| Lygiagrečios to paties intervalo užklausos (N01) | Vienas 201 ir vienas 409 su 5 DB jungtimis |
| Serverio `.env` įkėlimo testai (`npm run test:config`) | 4 iš 4 praėjo |
| SQL migracijos tuščioje bazėje | Pritaikytos visos keturios |
| Demonstracinis įkėlimas | Sukurtos 8 paslaugos, 4 specialistai, 5 pacientai ir 12 vizitų |
| ESLint 10 | 0 klaidų, 0 įspėjimų |
| `npm audit` (šaknis ir `server`) | 0 pažeidžiamumų po priklausomybių atnaujinimo 2026-10-15 (React Router 7, nodemailer 10, `deepmerge-ts` 8 per `overrides`, `nodemon` pakeistas `node --watch`), 2026-10-20 (ESLint 10, Recharts 3, `glob` 13 per `overrides` vietoje `swagger-jsdoc` fiksuotos nebepalaikomos 11 versijos) ir 2026-10-21 (Vite 7.3.7 su esbuild ir rollup vietoje Vite 8 su `rolldown`, kurio kūrimo serveris Windows aplinkoje nutrūkdavo priklausomybių surinkimo žingsnyje) ir 2026-11-07 (naujiems pranešimams apie `minimatch`, `glob` ir `body-parser` pritaikyti `overrides`: `minimatch` 11 šaknyje ir `server`, `glob` 14 `server`; `express` atnaujintas į 5.3 su `body-parser` 2.4; po to visi 81 testai, lint ir build pakartoti sėkmingai) |
| `npm ci` švariame kataloge (npm 10 ir 11) | 2026-10-21: šaknis 319, `server` 254 paketai; 2026-11-07: šaknis 321, `server` 257 paketai; be pažeidžiamumų ir be nebepalaikomų („deprecated“) paketų įspėjimų |
| Vite build | Sėkmingas; pradinis JS paketas ~73 kB (anksčiau 983 kB), viešas puslapis iš anksto įkelia tik `vendor-react` ir `vendor-forms`, o diagramos, kalendorius ir PDF – atskiri tingiai kraunami paketai, priklausantys tik nuo `vendor-react`; Vite 7 surinkimo ekrano nuotraukos (37 puslapiai, 1366×800 ir 390×844) sutampa su Vite 8 surinkimu pikselių tikslumu, skiriasi tik animuojamos diagramos ir kalendoriaus laiko linija |
| Surinktos sąsajos aptarnavimas API serveriu (Chromium, `CLIENT_DIST`) | Pradžios, prisijungimo, registracijos (3 žingsnis) ir paciento puslapiai atsidaro iš `http://localhost:<API prievadas>` su `helmet` CSP antraštėmis be konsolės klaidų; prisijungimas ir laikų lentelė veikia per tą patį adresą |
| Vite 7 kūrimo serveris (Chromium) | `npm run dev` su esbuild priklausomybių surinkimu: pradžios, prisijungimo, registracijos ir paciento puslapiai be konsolės klaidų |
| Diagramos po Recharts 3 atnaujinimo (Chromium, 1366×800 ir 390×844) | Specialisto apžvalgos ir analitikos bei administratoriaus suvestinės diagramos ir užvedimo langeliai sutampa su Recharts 2 vaizdu (pikselių palyginimas); analitikos diagnozių skritulinės diagramos reikšmių užrašai (įskaitant viršutinį) telpa į 200 px konteinerį – patikrinta DOM matavimu stalinėje ir telefono peržiūroje |
| OpenAPI | 24 keliai; `specialistId` neprivalomas `GET /visits/availability` ir `POST /visits`; dokumentas su `glob` 13 sutampa su ankstesniu |
| Priminimų scenarijus | `npm run reminders -- <data>` su demonstraciniais duomenimis: pirmas paleidimas parengė 1 laišką `outbox` kataloge, antras – 0 (idempotentiška) |
| PDF teksto patikra | 3 puslapiai, didžiosios ir mažosios lietuviškos raidės, galutinė teksto žyma išliko |
| Naršyklės kelias, 1366×800 | Vieši puslapiai, prisijungimai, registracija su automatiniu priskyrimu iki patvirtinimo, paciento, specialisto ir administratoriaus zonos; stalinio vaizdo ekrano nuotraukos sutampa su ankstesne versija pikselių tikslumu (skiriasi tik animuojami elementai ir naujas 2 žingsnio pasirinkimas) |
| Administratoriaus paslaugų skirtukas (Chromium, 1366×800 ir 390×844) | Sukurta, redaguota, išjungta ir vėl įjungta paslauga; išjungta paslauga dingo iš viešo puslapio; paslauga su vizitais nepašalinta (409 pranešimas), be vizitų – pašalinta |
| Dienos laikų lentelė (Chromium, 1366×800 ir 390×844, realus API) | Pacientui rezervavus 12:00, kitam pacientui ir neprisijungusiam lankytojui 11:30–12:30 rodomi pritemdyti ir nepasirenkami; pačiam pacientui pas kitą specialistą – brūkšniuotu rėmeliu kaip persidengiantys su jo vizitu; pritemdyto laiko paspaudimas nepasirenka, „Toliau“ – „Pasirinkite patikrintą laisvą laiką.“ |
| Naršyklės kelias, 390×844 (mobilus) | Meniu mygtukas, registracija iki patvirtinimo (vizitas sukurtas, rodomas priskirtas specialistas), visos trys zonos be horizontalaus puslapio slinkimo; vizitų lentelė slenkama kortelės viduje |

Iš viso praėjo 81 automatinis testas. Testų vykdymo išvestys pateiktos `docs/test-results/`.

## Testų aprėpiami scenarijai

- Registracija ir prisijungimas, paskyros užrakinimas, HTTP bandymų ribojimas.
- Rolės, vizitų nuosavybė, pašalintos paskyros JWT atmetimas.
- Realios kalendorinės datos, laiko normalizavimas, Lietuvos datos riba, darbo laikas ir trukmė.
- Vienodas ir dalinai persidengiantis laikas, gretimi intervalai, paciento konfliktas pas kitą specialistą.
- Dienos laikų lentelė: užimti laikai visiems lankytojams, paciento persidengiantys laikai tik su jo token, kito paciento ir neprisijungusio lankytojo atsakymai be paciento duomenų, negaliojantis token viešo maršruto nelaužo.
- Surinktos sąsajos aptarnavimas: `index.html` be kešavimo, `assets` su `immutable`, SPA keliai, `/api` ir ne-GET užklausų JSON 404, veikimas be `dist`.
- Atšaukimas ir to paties laiko rezervavimas vėl; galutinės būsenos neaktyvavimas.
- Kainos, trukmės, būsenos ir medicininių laukų klastojimo atmetimas.
- Automatinis specialisto priskyrimas: užimtas specialistas praleidžiamas, mažesnis dienos krūvis laimi, lygybė sprendžiama pagal savaitės krūvį ir ID, 409 be laisvų specialistų, neprieinamas specialistas nekandidatuoja, laisvų laikų sąjunga.
- Priminimai: rytojaus aktyvūs vizitai, idempotentiškumas, atšauktų ir kitų dienų vizitų praleidimas, cron išraiškos ir įjungimo patikra.
- Paslaugų administravimas: kūrimas ir viešas sąrašas, 401/403 ne administratoriui, įvesties validacija ir pavadinimo unikalumas, kainos pakeitimas negalioja esamam vizitui, išjungta paslauga dingsta iš sąrašo, laisvų laikų ir rezervacijų, šalinimas tik be vizitų.
- Vienkartinis atkūrimo raktas, galiojimo pabaiga, maiša DB ir senų sesijų nutraukimas.
- Viešo specialisto atsako laukai ir dabartinio slaptažodžio patikra keičiant slaptažodį.
- Tikros API sėkmės laukimas formoje, 409 grįžimas, pasirinkimų išsaugojimas, ryšio klaida, rezervacija be `specialistId`.
- Daugiau nei 100 įrašų gavimas API kliente ir pavėluoto ankstesnės paskyros atsako atmetimas.
- Įterptas Unicode šriftas ir ilgo PDF puslapiavimas.

## Ankstesnės patikros

2026-09-13 ir 2026-09-14 patikros atliktos su PostgreSQL WASM variantu (PGlite) vienos DB jungties režimu: 35 API testai, 10 Node testų, 4 komponento testai, 4 `.env` testai, ESLint ir build. Kadangi viena jungtis neįrodo kelių transakcijų konkurencijos, 2026-10-14 visi API testai pakartoti su įprastu PostgreSQL 16 ir 5 jungtimis; šis protokolas remiasi pakartotos patikros rezultatais.

## Komponentų testų apribojimas

Registracijos komponento testai vykdyti jsdom aplinkoje su valdomais API atsakymais. Jie tikrina React formos būsenas, mygtukus ir navigaciją. Visas kelias naršyklė–API–DB tikrintas atskirai Chromium naršyklėje su veikiančiu API ir PostgreSQL (lentelėje – naršyklės kelio eilutės).

## Neatliktos patikros

Docker diegimas, SMTP siuntimas, DB atsarginės kopijos atkūrimas, tikri mobilieji įrenginiai (iOS Safari, Android Chrome – tikrinta tik Chromium emuliacija), apkrovos ir visų naršyklių suderinamumo tyrimas, migracija su jau naudojama DB ir naudotojų testavimas. `.github/workflows/verify.yml` GitHub aplinkoje dar nepaleistas; `npm ci` su abiem `package-lock.json` švariame kataloge praėjo (319 ir 254 paketai).

## Pakartojimas

Vykdykite README nurodytus `npm ci`, `npm test`, `npm run lint`, `npm run build`. API testams nurodykite atskirą `_test` bazę ir prieš bandymus pritaikykite visas migracijas (`npx prisma migrate deploy`). Nepaleiskite testų prieš naudojamą DB. Rankiniam protokolui naudokite DEMONSTRACIJA.md.

## Serverio konfigūracijos įkėlimas

Serverio konfigūracija įkeliama iš `server/.env`, kelią nustatant pagal modulio vietą. Trūkstamas ar tuščias `DATABASE_URL` sustabdo paleidimą su instrukcija prieš sukuriant Prisma klientą. Proceso aplinkos reikšmės turi pirmenybę; Docker ir CI vietinio failo nereikalauja. `npm run test:config` tikrina įkėlimą iš kito darbinio katalogo, proceso reikšmės pirmenybę, veikimą be failo su perduotu kintamuoju ir klaidą trūkstant arba ištuštinus adresą; testai naudoja laikinas modulio ir nustatymų kopijas ir nekeičia naudotojo `.env`.
