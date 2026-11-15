/** Demonstraciniai duomenys įkeliami tik į visiškai tuščią bazę. Esami įrašai nekeičiami. */
import bcrypt from 'bcrypt';
import '../src/lib/env.js';
import { clinicNow, normalizeTime } from '../../shared/booking.js';
import { prisma } from '../src/lib/prisma.js';
import { initialSpecialists, initialPatients, initialVisits, services } from './demo-data.js';

const SALT_ROUNDS = 10;

/**
 * Pailgina demo slaptažodį iki politikos (≥8 simbolių), kad seed'inti
 * naudotojai galėtų prisijungti su ta pačia validacija kaip realūs.
 * spec123 -> spec12345, pac123 -> pac12345.
 */
function policyPassword(raw) {
  return raw.length >= 8 ? raw : `${raw}45`;
}

async function main() {
  console.log('Demonstracinių duomenų įkėlimas pradedamas...');

  const count =
    (await prisma.patient.count()) +
    (await prisma.specialist.count()) +
    (await prisma.service.count()) +
    (await prisma.visit.count());
  if (count) {
    console.log(
      'Duomenų bazėje jau yra įrašų. Demonstraciniai duomenys praleisti; esami įrašai išsaugoti.'
    );
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      const today = new Date(clinicNow().date + 'T12:00:00Z');
      const demoDate = (visit) => {
        const date = new Date(today);
        date.setUTCDate(
          date.getUTCDate() +
            (['įvykęs', 'atšauktas'].includes(visit.status) ? -visit.id - 2 : visit.id + 1)
        );
        while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
        return date.toISOString().slice(0, 10);
      };

      // 2) Paslaugos
      for (const s of services) {
        await tx.service.create({
          data: {
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description,
            price: s.price,
            duration: s.duration,
          },
        });
      }
      console.log(`   Paslaugų įrašyta: ${services.length}`);

      // 3) Specialistai (slaptažodis -> passwordHash)
      for (const sp of initialSpecialists) {
        const passwordHash = await bcrypt.hash(policyPassword(sp.password), SALT_ROUNDS);
        await tx.specialist.create({
          data: {
            id: sp.id,
            name: sp.name,
            title: sp.title,
            experience: sp.experience,
            rating: sp.rating,
            reviews: sp.reviews,
            specialties: sp.specialties,
            photo: sp.photo,
            available: sp.available,
            bio: sp.bio,
            license: sp.license,
            email: sp.email,
            phone: sp.phone,
            passwordHash,
          },
        });
      }
      console.log(`   Specialistų įrašyta: ${initialSpecialists.length}`);

      // 4) Pacientai (slaptažodis -> passwordHash)
      for (const p of initialPatients) {
        const passwordHash = await bcrypt.hash(policyPassword(p.password), SALT_ROUNDS);
        await tx.patient.create({
          data: {
            id: p.id,
            name: p.name,
            surname: p.surname,
            email: p.email,
            passwordHash,
            phone: p.phone,
            birthDate: p.birthDate,
            registeredDate: p.registeredDate,
          },
        });
      }
      console.log(`   Pacientų įrašyta: ${initialPatients.length}`);

      // 5) Vizitai (service pavadinimas -> serviceId)
      const serviceIdByName = new Map(services.map((s) => [s.name, s.id]));
      for (const v of initialVisits) {
        const serviceId = serviceIdByName.get(v.service);
        if (!serviceId) {
          throw new Error(`Nerasta paslauga vizitui (id=${v.id}): "${v.service}"`);
        }
        await tx.visit.create({
          data: {
            id: v.id,
            patientId: v.patientId,
            specialistId: v.specialistId,
            serviceId,
            date: demoDate(v),
            time: normalizeTime(v.time),
            duration: services.find((s) => s.id === serviceId).duration,
            status: v.status,
            diagnosis: v.diagnosis,
            procedures: v.procedures,
            recommendations: v.recommendations,
            price: v.price,
            nextVisit: null,
            cancelReason: v.cancelReason,
          },
        });
      }
      console.log(`   Vizitų įrašyta: ${initialVisits.length}`);

      // 6) id sekų atstatymas (kad nauji autoincrement id nesusidurtų su seed'intais)
      for (const table of ['Patient', 'Specialist', 'Service', 'Visit']) {
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${table}"))`
        );
      }
      console.log('   id sekos atstatytos.');
    },
    { timeout: 30000 }
  );
  console.log('Demonstraciniai duomenys įkelti.');
}

main()
  .catch((e) => {
    console.error('Demonstracinių duomenų įkėlimo klaida:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
