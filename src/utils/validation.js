/**
 * Centralizuotos zod validacijos schemos.
 *
 * Schemos atitinka serverinę validaciją (server/src/routes/*.js):
 *  - el. pašto formatas;
 *  - slaptažodis ≥ 8 simbolių;
 *  - privalomi laukai;
 *  - telefono formatas.
 * Pranešimai — lietuviški, rodomi po laukais.
 */
import { z } from 'zod';

// Bendri laukai
const email = z.string().min(1, 'El. paštas privalomas.').email('Neteisingas el. pašto formatas.');
const password = z
  .string()
  .min(8, 'Slaptažodis turi būti bent 8 simbolių.')
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    'Slaptažodis per ilgas (iki 72 UTF-8 baitų).'
  );

// Telefonas: neprivalomas, bet jei įvestas — turi atitikti formatą (skaitmenys, +, tarpai, () ir -).
const phoneOptional = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\+?[\d\s()-]{6,}$/.test(v), 'Neteisingas telefono numerio formatas.');

const requiredText = (msg) => z.string().trim().min(1, msg);

// ─── Autentifikacija ───
export const patientLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Slaptažodis privalomas.'),
});

export const patientRegisterSchema = z.object({
  name: requiredText('Vardas privalomas.'),
  surname: requiredText('Pavardė privaloma.'),
  email,
  password,
  phone: phoneOptional,
  birthDate: z.string().optional(),
});

export const specialistLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Slaptažodis privalomas.'),
  license: requiredText('Licencijos numeris privalomas.'),
});

export const adminLoginSchema = z.object({
  email: requiredText('El. paštas privalomas.'),
  password: z.string().min(1, 'Slaptažodis privalomas.'),
});

export const forgotPasswordSchema = z.object({ email });

// ─── Vizito rezervavimas (kontaktiniai duomenys — viešas srautas) ───
export const bookingContactSchema = z.object({
  firstName: requiredText('Vardas privalomas.'),
  lastName: requiredText('Pavardė privaloma.'),
  phone: requiredText('Telefonas privalomas.').refine(
    (v) => /^\+?[\d\s()-]{6,}$/.test(v),
    'Neteisingas telefono numerio formatas.'
  ),
  email,
});

// ─── Admin: paciento kūrimas/redagavimas ───
// `isEdit` atveju slaptažodis neprivalomas (keičiamas tik jei įvestas).
export const patientAdminSchema = (isEdit = false) =>
  z.object({
    name: requiredText('Vardas privalomas.'),
    surname: requiredText('Pavardė privaloma.'),
    email,
    password: isEdit
      ? z
          .string()
          .optional()
          .refine((v) => !v || v.length >= 8, 'Slaptažodis turi būti bent 8 simbolių.')
      : password,
    phone: phoneOptional,
    birthDate: z.string().optional(),
  });

// ─── Admin: specialisto kūrimas/redagavimas ───
export const specialistAdminSchema = (isEdit = false) =>
  z.object({
    name: requiredText('Vardas ir pavardė privalomi.'),
    email,
    license: requiredText('Licencijos numeris privalomas.'),
    password: isEdit
      ? z
          .string()
          .optional()
          .refine((v) => !v || v.length >= 8, 'Slaptažodis turi būti bent 8 simbolių.')
      : password,
    title: z.string().optional(),
    phone: phoneOptional,
    specialties: z.string().optional(),
    experience: z.coerce.number().min(0, 'Patirtis negali būti neigiama.').optional(),
    bio: z.string().optional(),
  });

// ─── Admin: paslaugos kūrimas/redagavimas ───
// Atitinka serverio taisykles (server/src/routes/services.routes.js). Skaitiniai laukai
// ateina iš formos kaip tekstas, todėl tikrinami kaip eilutės ir tik tada paverčiami skaičiais.
const intField = (label, { min, max, step = 1 }) =>
  z
    .string()
    .trim()
    .min(1, `${label} privaloma.`)
    .refine((v) => /^\d+$/.test(v), `${label} turi būti sveikas skaičius.`)
    .refine((v) => Number(v) >= min && Number(v) <= max, `${label}: nuo ${min} iki ${max}.`)
    .refine((v) => Number(v) % step === 0, `${label} turi būti ${step} kartotinis.`)
    .transform(Number);

export const serviceAdminSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Pavadinimas turi būti bent 2 simbolių.')
    .max(100, 'Pavadinimas iki 100 simbolių.'),
  category: z
    .string()
    .trim()
    .min(2, 'Kategorija privaloma (bent 2 simboliai).')
    .max(60, 'Kategorija iki 60 simbolių.'),
  description: z.string().trim().max(1000, 'Aprašas iki 1000 simbolių.').optional(),
  price: intField('Kaina', { min: 0, max: 100000 }),
  duration: intField('Trukmė', { min: 5, max: 720, step: 5 }),
});

// ─── Specialistas: vizito užbaigimas ───
export const visitCompletionSchema = z.object({
  status: z.enum(['laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas']),
  cancelReason: z.string().max(1000).optional(),
  diagnosis: z.string().optional(),
  procedures: z.string().optional(),
  recommendations: z.string().optional(),
  nextVisit: z.string().optional(),
});

// ─── Specialistas: slaptažodžio keitimas (būtina licencija + patvirtinimas) ───
export const specialistPasswordSchema = z
  .object({
    license: requiredText('Licencijos numeris privalomas.'),
    currentPassword: requiredText('Dabartinis slaptažodis privalomas.'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Pakartokite slaptažodį.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Slaptažodžiai nesutampa.',
    path: ['confirmPassword'],
  });
