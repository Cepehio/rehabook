/**
 * Autentifikacijos maršrutai (/api/auth).
 * Serverinė įvesties validacija su express-validator; slaptažodžio politika min. 8 simboliai.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  registerPatient,
  loginPatient,
  loginSpecialist,
  loginAdmin,
  forgotPassword,
  resetPassword,
  changeSpecialistPassword,
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * /auth/patient/register:
 *   post:
 *     tags: [Auth]
 *     summary: Paciento registracija
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, surname, email, password]
 *             properties:
 *               name: { type: string, example: Jonas }
 *               surname: { type: string, example: Jonaitis }
 *               email: { type: string, format: email, example: jonas@example.lt }
 *               password: { type: string, minLength: 8, example: slaptas123 }
 *               phone: { type: string, example: '+37060000000' }
 *               birthDate: { type: string, example: '1990-05-12' }
 *     responses:
 *       201:
 *         description: Sukurtas pacientas + JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409:
 *         description: El. paštas jau registruotas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 */
// Paciento registracija
router.post(
  '/patient/register',
  [
    body('name').trim().notEmpty().withMessage('Vardas privalomas.'),
    body('surname').trim().notEmpty().withMessage('Pavardė privaloma.'),
    body('email').isEmail().withMessage('Neteisingas el. pašto formatas.').normalizeEmail(),
    body('password')
      .isString()
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).')
      .bail()
      .isLength({ min: 8 })
      .withMessage('Slaptažodis turi būti bent 8 simbolių.'),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('birthDate').optional({ values: 'falsy' }).trim(),
  ],
  handleValidation,
  registerPatient
);

/**
 * @swagger
 * /auth/patient/login:
 *   post:
 *     tags: [Auth]
 *     summary: Paciento prisijungimas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: jonas@example.lt }
 *               password: { type: string, example: pac12345 }
 *     responses:
 *       200:
 *         description: JWT + naudotojas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } }
 *       401:
 *         description: Neteisingi kredencialai
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *       423:
 *         description: Paskyra laikinai užrakinta (5 nesėkmingi bandymai)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *       429:
 *         description: Per daug bandymų (rate limit)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 */
// Paciento prisijungimas
router.post(
  '/patient/login',
  [
    body('email').isEmail().withMessage('Neteisingas el. pašto formatas.').normalizeEmail(),
    body('password').notEmpty().withMessage('Slaptažodis privalomas.'),
  ],
  handleValidation,
  loginPatient
);

/**
 * @swagger
 * /auth/specialist/login:
 *   post:
 *     tags: [Auth]
 *     summary: Specialisto prisijungimas (el. paštas + slaptažodis + licencija)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, license]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, example: spec12345 }
 *               license: { type: string, example: LT-12345 }
 *     responses:
 *       200:
 *         description: JWT + naudotojas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       423:
 *         description: Paskyra laikinai užrakinta
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 */
// Specialisto prisijungimas
router.post(
  '/specialist/login',
  [
    body('email').isEmail().withMessage('Neteisingas el. pašto formatas.').normalizeEmail(),
    body('password').notEmpty().withMessage('Slaptažodis privalomas.'),
    body('license').trim().notEmpty().withMessage('Licencijos numeris privalomas.'),
  ],
  handleValidation,
  loginSpecialist
);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Administratoriaus prisijungimas (.env kredencialai)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@rehabook.lt }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: Admin JWT
 *         content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Administratoriaus prisijungimas
router.post(
  '/admin/login',
  [
    body('email').trim().notEmpty().withMessage('El. paštas privalomas.'),
    body('password').notEmpty().withMessage('Slaptažodis privalomas.'),
  ],
  handleValidation,
  loginAdmin
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Slaptažodžio atkūrimo užklausa
 *     description: Saugumo sumetimais visada grąžina vienodą atsakymą.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [patient, specialist], default: patient }
 *     responses:
 *       200:
 *         description: Užklausa priimta
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } }
 */
// Slaptažodžio atkūrimo užklausa
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Neteisingas el. pašto formatas.').normalizeEmail(),
    body('role')
      .optional()
      .isIn(['patient', 'specialist'])
      .withMessage('Neteisingas paskyros tipas.'),
  ],
  handleValidation,
  forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Pakeisti slaptažodį su vienkartiniu 30 minučių raktu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string, pattern: '^[a-f0-9]{64}$' }
 *               newPassword: { type: string, minLength: 8, description: 'Iki 72 UTF-8 baitų' }
 *               role: { type: string, enum: [patient, specialist], default: patient }
 *     responses:
 *       200: { description: Slaptažodis pakeistas ir ankstesnės sesijos panaikintos }
 *       400: { description: Raktas netinkamas, panaudotas arba pasibaigęs }
 *       429: { description: Per daug atkūrimo užklausų }
 */
router.post(
  '/reset-password',
  [
    body('token')
      .isString()
      .bail()
      .matches(/^[a-f0-9]{64}$/)
      .withMessage('Neteisinga atkūrimo nuoroda.'),
    body('role').optional().isIn(['patient', 'specialist']),
    body('newPassword')
      .isString()
      .bail()
      .isString()
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).')
      .bail()
      .isLength({ min: 8 })
      .withMessage('Slaptažodis turi būti bent 8 simbolių.')
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).'),
  ],
  handleValidation,
  resetPassword
);

/**
 * @swagger
 * /auth/specialist/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Specialisto slaptažodžio keitimas (būtina licencija)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [license, currentPassword, newPassword]
 *             properties:
 *               license: { type: string, example: LT-12345 }
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Slaptažodis pakeistas
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean } } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Specialisto slaptažodžio keitimas (būtina licencija)
router.post(
  '/specialist/change-password',
  authenticate,
  requireRole('specialist'),
  [
    body('license').trim().notEmpty().withMessage('Licencijos numeris privalomas.'),
    body('currentPassword')
      .isString()
      .bail()
      .notEmpty()
      .withMessage('Dabartinis slaptažodis privalomas.'),
    body('newPassword')
      .isString()
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).')
      .bail()
      .isLength({ min: 8 })
      .withMessage('Naujas slaptažodis turi būti bent 8 simbolių.'),
  ],
  handleValidation,
  changeSpecialistPassword
);

export default router;
