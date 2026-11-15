/**
 * Vizitų maršrutai (/api/visits). Visi, išskyrus viešą dienos laikų lentelę,
 * reikalauja autentifikacijos; nuosavybės tikrinimas atliekamas kontroleriuose.
 */
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { isDate, normalizeTime, VISIT_STATUSES } from '../../../shared/booking.js';
import { handleValidation } from '../middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  listAllVisits,
  listVisitsByPatient,
  listVisitsBySpecialist,
  listAvailability,
  createVisit,
  cancelVisit,
  updateVisit,
} from '../controllers/visits.controller.js';

const router = Router();

/**
 * @swagger
 * /visits/availability:
 *   get:
 *     tags: [Visits]
 *     summary: Dienos laikų lentelė pagal paslaugos trukmę (viešas)
 *     description: Grąžina visus galimus pradžios laikus (slots), užimtus laikus (taken), prisijungusio paciento laikus, persidengiančius su jo paties vizitais (own, tik su galiojančiu token), ir rezervuotinus laikus (available). Be specialistId laikas laisvas, kai laisvas bent vienas priimantis specialistas (automatinis priskyrimas pagal darbo krūvį).
 *     security: [{}, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: specialistId
 *         required: false
 *         schema: { type: integer }
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: '2026-04-07' }
 *     responses:
 *       200:
 *         description: Dienos pradžios laikų lentelė Lietuvos laiku ir paslaugos trukmė
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { slots: { type: array, items: { type: string }, description: 'Visi galimi pradžios laikai darbo valandomis' }, taken: { type: array, items: { type: string }, description: 'Užimti laikai – nepasirenkami nė vienam pacientui' }, own: { type: array, items: { type: string }, description: 'Persidengia su prisijungusio paciento vizitais' }, available: { type: array, items: { type: string }, description: 'Laikai, kuriuos šis lankytojas gali rezervuoti' }, duration: { type: integer }, timeZone: { type: string, example: Europe/Vilnius }, date: { type: string }, specialistId: { type: integer, nullable: true }, specialists: { type: integer, description: 'Kandidatų skaičius, kai specialistas nenurodytas' } } }
 *       400: { description: Trūksta parametrų }
 *       404: { description: Paslauga arba specialistas nerasti }
 * /visits:
 *   get:
 *     tags: [Visits]
 *     summary: Visi vizitai su puslapiavimu/filtrais (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [laukiamas, patvirtintas, įvykęs, atšauktas] }
 *       - in: query
 *         name: specialistId
 *         schema: { type: integer }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: 'date:desc' }
 *     responses:
 *       200:
 *         description: Puslapiuotas vizitų sąrašas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaginatedVisits' } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Visits]
 *     summary: Sukurti vizitą (pacientas savo / admin)
 *     description: Jei specialistId nenurodytas, vizitas priskiriamas pasirinktu laiku laisvam specialistui su mažiausiu tos dienos (toliau – savaitės) darbo krūviu; atsake autoAssigned=true ir specialist.name.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, time]
 *             properties:
 *               specialistId: { type: integer, description: 'Neprivalomas – be jo specialistas parenkamas automatiškai' }
 *               serviceId: { type: integer }
 *               service: { type: string, description: 'Paslaugos pavadinimas (alternatyva serviceId)' }
 *               patientId: { type: integer, description: 'Tik admin; pacientui imamas iš token`o' }
 *               date: { type: string, example: '2026-04-07' }
 *               time: { type: string, example: '8:00' }
 *     responses:
 *       201: { description: Sukurtas vizitas, content: { application/json: { schema: { $ref: '#/components/schemas/Visit' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Persidengia specialisto arba paciento vizitai, specialistas nepriima registracijų arba pasirinktu laiku nėra laisvų specialistų }
 * /visits/patient/{id}:
 *   get:
 *     tags: [Visits]
 *     summary: Paciento vizitai (savininkas arba admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Vizitų masyvas, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Visit' } } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /visits/specialist/{id}:
 *   get:
 *     tags: [Visits]
 *     summary: Specialisto vizitai (savininkas arba admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Vizitų masyvas }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /visits/{id}/cancel:
 *   patch:
 *     tags: [Visits]
 *     summary: Atšaukti vizitą su priežastimi (pacientas savo / admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [reason], properties: { reason: { type: string } } }
 *     responses:
 *       200: { description: Atšauktas vizitas, content: { application/json: { schema: { $ref: '#/components/schemas/Visit' } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Nerasta }
 * /visits/{id}:
 *   patch:
 *     tags: [Visits]
 *     summary: Atnaujinti vizitą — diagnozė/statusas ir kt. (specialistas savo / admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diagnosis: { type: string }
 *               procedures: { type: string }
 *               recommendations: { type: string }
 *               status: { type: string, enum: [laukiamas, patvirtintas, įvykęs, atšauktas] }
 *               nextVisit: { type: string }
 *               cancelReason: { type: string, maxLength: 1000 }
 *     responses:
 *       200: { description: Atnaujintas vizitas, content: { application/json: { schema: { $ref: '#/components/schemas/Visit' } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Nerasta }
 */

// Viešas: dienos laikų lentelė pasirinktą dieną (rezervacijai).
// Turi būti PRIEŠ authenticate, nes naudoja ir neprisijungę lankytojai; su
// galiojančiu paciento token papildomai pažymimi jo paties vizitų laikai.
router.get(
  '/availability',
  optionalAuthenticate,
  [
    query('specialistId')
      .optional()
      .isInt({ min: 1, max: 2147483647 })
      .withMessage('Neteisingas specialistas.'),
    query('serviceId').isInt({ min: 1, max: 2147483647 }).withMessage('Neteisinga paslauga.'),
    query('date').custom(isDate).withMessage('Data turi būti galiojanti YYYY-MM-DD data.'),
  ],
  handleValidation,
  listAvailability
);

// Visi kiti vizitų maršrutai reikalauja prisijungimo
router.use(authenticate);
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) {
    return res.status(400).json({ error: 'Neteisingas įrašo identifikatorius.' });
  }
  next();
});

// Visi vizitai — tik admin
router.get(
  '/',
  requireRole('admin'),
  [
    query('status').optional().isIn(VISIT_STATUSES),
    query('specialistId').optional().isInt({ min: 1, max: 2147483647 }),
    query('dateFrom').optional().custom(isDate),
    query('dateTo').optional().custom(isDate),
  ],
  handleValidation,
  listAllVisits
);

// Paciento / specialisto vizitai — nuosavybė tikrinama kontroleryje
router.get('/patient/:id', listVisitsByPatient);
router.get('/specialist/:id', listVisitsBySpecialist);

// Vizito kūrimas — pacientas (savo) arba admin
router.post(
  '/',
  requireRole('patient', 'admin'),
  [
    // Be specialistId vizitas priskiriamas mažiausiai apkrautam laisvam specialistui.
    body('specialistId')
      .optional({ values: 'null' })
      .isInt({ min: 1, max: 2147483647 })
      .withMessage('Pasirinkite specialistą.'),
    body('serviceId').optional().isInt({ min: 1, max: 2147483647 }),
    body('service').optional().isString().bail().trim().isLength({ min: 1, max: 200 }),
    body()
      .custom((value) => value.serviceId !== undefined || Boolean(value.service))
      .withMessage('Paslauga privaloma.'),
    body('patientId')
      .custom(
        (value, { req }) =>
          req.user.role === 'patient' ||
          (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647)
      )
      .withMessage('Nurodykite pacientą.'),
    body('date').custom(isDate).withMessage('Neteisinga vizito data.'),
    body('time')
      .custom((value) => Boolean(normalizeTime(value)))
      .withMessage('Neteisingas laikas.'),
    body()
      .custom(
        (value) =>
          ![
            'price',
            'duration',
            'status',
            'diagnosis',
            'procedures',
            'recommendations',
            'nextVisit',
          ].some((key) => key in value)
      )
      .withMessage(
        'Rezervuojant kainą, trukmę ir būseną nustato serveris; medicininiai laukai čia nekeičiami.'
      ),
  ],
  handleValidation,
  createVisit
);

// Atšaukimas — pacientas (savo) arba admin
router.patch(
  '/:id/cancel',
  requireRole('patient', 'admin'),
  [
    body('reason')
      .isString()
      .bail()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Atšaukimo priežastis privaloma (iki 1000 simbolių).'),
  ],
  handleValidation,
  cancelVisit
);

// Atnaujinimas (diagnozė, statusas ir kt.) — specialistas (savo) arba admin
router.patch(
  '/:id',
  requireRole('specialist', 'admin'),
  [
    param('id').isInt({ min: 1, max: 2147483647 }),
    body('status').optional().isIn(VISIT_STATUSES).withMessage('Neteisinga vizito būsena.'),
    ...['diagnosis', 'procedures', 'recommendations', 'cancelReason'].map((field) =>
      body(field)
        .optional()
        .isString()
        .bail()
        .isLength({ max: 5000 })
        .withMessage('Tekstas negali viršyti 5000 simbolių.')
    ),
    body('nextVisit')
      .optional({ values: 'falsy' })
      .custom(isDate)
      .withMessage('Neteisinga kito vizito data.'),
  ],
  handleValidation,
  updateVisit
);

export default router;
