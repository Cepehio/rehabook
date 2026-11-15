# Programos demonstravimo scenarijus

Demonstracija atliekama su demonstraciniais duomenimis (`npm run seed`), veikiančiu API ir duomenų baze pagal README. Paskyros: `jonas@mail.lt` / `pac12345` (pacientas), `ruta@rehabook.lt` / `spec12345` / `LT-KIN-2012-0847` (specialistė), `ADMIN_EMAIL` / `ADMIN_PASSWORD` (administratorius).

| Eiga | Ką parodyti | Ką paaiškinti |
| --- | --- | --- |
| 1 | Paslaugų ir specialistų katalogai | Kokią problemą sprendžia sistema, trys rolės |
| 2 | Pasirinkti paslaugą, specialistą ir laiką neprisijungus | Laisvi laikai priklauso nuo paslaugos trukmės ir darbo valandų |
| 3 | Prisijungti pacientu ir patvirtinti išlikusią santrauką | Vizitas kuriamas tik patvirtinus; rezervacijos numeris matomas istorijoje |
| 4 | Atvertoje lentelėje parodyti pritemdytus (užimtus) laikus; antrame, anksčiau atvertame skirtuke bandyti persidengiantį intervalą | Užimti laikai nepasirenkami; seniau atvertame skirtuke laikas dar atrodo laisvas, bet API tikrina visą intervalą ir grąžina 409, o lentelė atsinaujina |
| 5 | Atšaukti vizitą su priežastimi ir rezervuoti tą laiką vėl | Atšaukimas išlaisvina laiką, bet išsaugo istoriją |
| 6 | Registruotis pasirinkus „Bet kuris laisvas specialistas“ | Darbo krūvio paskirstymas: patvirtinime rodomas automatiškai priskirtas mažiausiai apkrautas specialistas |
| 7 | Prisijungti specialistu, atverti grafiką, kalendorių ir vizito aprašą | Priskyrimas specialistui, būsenos perėjimai, aprašo laukai |
| 8 | Paciento paskyroje atsisiųsti PDF | Lietuviškos raidės ir ilgo teksto tęsinys kituose puslapiuose |
| 9 | Administratoriaus katalogai ir suvestinės; skirtuke „Paslaugos“ pakeisti kainą ir išjungti paslaugą | Rolės teisės, sąrašai, neatšauktų vizitų vertė, specialistų užimtumas; išjungta paslauga dingsta iš registracijos, o esami vizitai išlaiko senąją kainą |
| 10 | `cd server && npm run reminders -- <rytojaus data>` ir laiškas `outbox` kataloge | Priminimai prieš vizitą; antras paleidimas to paties vizito nebeprimena |
| 11 | Naršyklės įrankiuose įjungti telefono vaizdą (390 px): registracija ir specialisto zona | Meniu mygtukas, vieno stulpelio išdėstymas, slenkami skirtukai; stalinis vaizdas nepakitęs |
| 12 | Vienas automatinis testas ir jo rezultatas (`npm test`) | Kaip reikalavimas susijęs su testu |

`MAIL_MODE=file` režimu laiškai (patvirtinimas, atšaukimas, atkūrimas, priminimas) rašomi į `server/outbox/` JSON failus, o ne siunčiami gavėjui; SMTP režimui žr. README.

## Rankinės patikros protokolo forma

Kiekvienam scenarijui fiksuojama: data, OS, naršyklė ir jos versija, vykdytojas, naudoti testų duomenys, tikėtinas rezultatas, faktinis rezultatas, ekrano vaizdas arba klaidos numeris. Neatliktas scenarijus žymimas „neatlikta“.
