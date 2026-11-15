/**
 * Specialistų maršrutai (/api/specialists).
 * GET viešas; kūrimas/redagavimas/šalinimas/toggle — tik admin.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  listSpecialists,
  listAdminSpecialists,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
  toggleSpecialist,
} from '../controllers/specialists.controller.js';

const router = Router();

/**
 * @swagger
 * /specialists:
 *   get:
 *     tags: [Specialists]
 *     summary: Aktyvių specialistų sąrašas (viešas)
 *     responses:
 *       200:
 *         description: Specialistų masyvas
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Specialist' } }
 *   post:
 *     tags: [Specialists]
 *     summary: Pridėti specialistą (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Specialist' }
 *     responses:
 *       201:
 *         description: Sukurtas specialistas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Specialist' } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Viešas sąrašas
router.get('/', listSpecialists);

// Toliau — tik admin
router.use(authenticate, requireRole('admin'));
router.get('/admin', listAdminSpecialists);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Vardas privalomas.'),
    body('email').isEmail().withMessage('Neteisingas el. pašto formatas.').normalizeEmail(),
    body('license').trim().notEmpty().withMessage('Licencijos numeris privalomas.'),
    body('password')
      .isString()
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).')
      .bail()
      .isLength({ min: 8 })
      .withMessage('Slaptažodis turi būti bent 8 simbolių.'),
  ],
  handleValidation,
  createSpecialist
);

/**
 * @swagger
 * /specialists/{id}:
 *   put:
 *     tags: [Specialists]
 *     summary: Redaguoti specialistą (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Specialist' } } }
 *     responses:
 *       200: { description: Atnaujintas specialistas, content: { application/json: { schema: { $ref: '#/components/schemas/Specialist' } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Nerasta }
 *   delete:
 *     tags: [Specialists]
 *     summary: Šalinti specialistą — soft delete (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pažymėtas ištrintu (deletedAt) }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /specialists/{id}/toggle:
 *   patch:
 *     tags: [Specialists]
 *     summary: Keisti aktyvumą (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pakeistas available, content: { application/json: { schema: { $ref: '#/components/schemas/Specialist' } } } }
 *       404: { description: Nerasta }
 */
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Vardas negali būti tuščias.'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Neteisingas el. pašto formatas.')
      .normalizeEmail(),
    body('password')
      .optional({ values: 'falsy' })
      .isString()
      .bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .withMessage('Slaptažodis per ilgas (iki 72 UTF-8 baitų).')
      .bail()
      .isLength({ min: 8 })
      .withMessage('Slaptažodis turi būti bent 8 simbolių.'),
  ],
  handleValidation,
  updateSpecialist
);

router.delete('/:id', deleteSpecialist);

router.patch('/:id/toggle', toggleSpecialist);

export default router;
