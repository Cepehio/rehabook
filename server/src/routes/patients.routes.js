/**
 * Pacientų maršrutai (/api/patients). Visi veiksmai — tik admin.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from '../controllers/patients.controller.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * /patients:
 *   get:
 *     tags: [Patients]
 *     summary: Pacientų sąrašas su puslapiavimu/paieška (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Paieška pagal vardą/pavardę/el. paštą
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: string, enum: ['1'] }
 *         description: Įtraukti soft-deleted įrašus
 *     responses:
 *       200:
 *         description: Puslapiuotas pacientų sąrašas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaginatedPatients' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Patients]
 *     summary: Pridėti pacientą (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Patient' } } }
 *     responses:
 *       201: { description: Sukurtas pacientas, content: { application/json: { schema: { $ref: '#/components/schemas/Patient' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 * /patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Redaguoti pacientą (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Atnaujintas pacientas }
 *   delete:
 *     tags: [Patients]
 *     summary: Šalinti pacientą — soft delete (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pažymėtas ištrintu (deletedAt) }
 */
router.get('/', listPatients);

router.post(
  '/',
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
  ],
  handleValidation,
  createPatient
);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Vardas negali būti tuščias.'),
    body('surname').optional().trim().notEmpty().withMessage('Pavardė negali būti tuščia.'),
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
  updatePatient
);

router.delete('/:id', deletePatient);

export default router;
