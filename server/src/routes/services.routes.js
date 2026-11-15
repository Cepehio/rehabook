/**
 * Paslaugų maršrutai (/api/services).
 * Sąrašas viešas; kūrimas, redagavimas, šalinimas ir aktyvumo keitimas — tik admin.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  listServices,
  listAdminServices,
  createService,
  updateService,
  deleteService,
  toggleService,
} from '../controllers/services.controller.js';

const router = Router();

/** Paslaugos laukų taisyklės; `optional` — redagavimui (nepateikti laukai nekeičiami). */
function serviceRules(optional = false) {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('name'))
      .isString()
      .bail()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Pavadinimas turi būti 2–100 simbolių.'),
    opt(body('category'))
      .isString()
      .bail()
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Kategorija turi būti 2–60 simbolių.'),
    body('description')
      .optional({ values: 'null' })
      .isString()
      .bail()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Aprašas negali viršyti 1000 simbolių.'),
    opt(body('price'))
      .isInt({ min: 0, max: 100000 })
      .withMessage('Kaina – sveikas skaičius eurais nuo 0 iki 100000.'),
    opt(body('duration'))
      .isInt({ min: 5, max: 720 })
      .withMessage('Trukmė – nuo 5 iki 720 minučių.')
      .bail()
      .custom((value) => Number(value) % 5 === 0)
      .withMessage('Trukmė turi būti 5 minučių kartotinis.'),
    body('active').optional().isBoolean().withMessage('Aktyvumas turi būti true arba false.'),
  ];
}

/**
 * @swagger
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Aktyvių paslaugų sąrašas (viešas)
 *     responses:
 *       200:
 *         description: Paslaugų masyvas
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Service' } }
 *   post:
 *     tags: [Services]
 *     summary: Pridėti paslaugą (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, price, duration]
 *             properties:
 *               name: { type: string, example: 'Manualinė terapija' }
 *               category: { type: string, example: 'Specializuotos' }
 *               description: { type: string, nullable: true }
 *               price: { type: integer, example: 45 }
 *               duration: { type: integer, example: 45, description: 'Minutės, 5 min. kartotinis' }
 *               active: { type: boolean, example: true }
 *     responses:
 *       201: { description: Sukurta paslauga, content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: Toks pavadinimas jau yra }
 * /services/admin:
 *   get:
 *     tags: [Services]
 *     summary: Visos paslaugos su vizitų skaičiumi (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paslaugų masyvas su visitCount ir active, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Service' } } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /services/{id}:
 *   put:
 *     tags: [Services]
 *     summary: Redaguoti paslaugą (admin). Esamų vizitų kaina ir trukmė nesikeičia.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } }
 *     responses:
 *       200: { description: Atnaujinta paslauga, content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Nerasta }
 *   delete:
 *     tags: [Services]
 *     summary: Šalinti paslaugą be vizitų (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pašalinta }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Nerasta }
 *       409: { description: Paslauga turi vizitų — vietoje šalinimo išjungiamas aktyvumas }
 * /services/{id}/toggle:
 *   patch:
 *     tags: [Services]
 *     summary: Keisti paslaugos aktyvumą (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pakeistas active, content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } } }
 *       404: { description: Nerasta }
 */
// Viešas sąrašas (tik aktyvios paslaugos)
router.get('/', listServices);

// Toliau — tik admin
router.use(authenticate, requireRole('admin'));
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) {
    return res.status(400).json({ error: 'Neteisingas įrašo identifikatorius.' });
  }
  next();
});

router.get('/admin', listAdminServices);
router.post('/', serviceRules(false), handleValidation, createService);
router.put('/:id', serviceRules(true), handleValidation, updateService);
router.delete('/:id', deleteService);
router.patch('/:id/toggle', toggleService);

export default router;
