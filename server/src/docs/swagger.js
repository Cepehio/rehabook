/**
 * Swagger / OpenAPI dokumentacija.
 *
 * swagger-jsdoc surenka @swagger JSDoc komentarus iš maršrutų failų ir sudaro
 * OpenAPI specifikaciją; swagger-ui-express ją pateikia adresu GET /api/docs.
 *
 * Bendri schemų (Patient, Specialist, Service, Visit), saugumo (bearer JWT) ir
 * atsakų komponentai aprašyti čia; konkretūs endpoint'ai — prie maršrutų.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const __dirname = dirname(fileURLToPath(import.meta.url));

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'RehaBook API',
    version: '1.1.0',
    description:
      'Reabilitacijos centro rezervacijų sistema. Autentifikacija per JWT (Bearer). ' +
      'Statusai su lietuviškomis raidėmis: laukiamas | patvirtintas | įvykęs | atšauktas.',
  },
  servers: [{ url: '/api', description: 'RehaBook API bazinis kelias' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Įveskite prisijungimo metu gautą JWT token`ą.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validacijos klaida.' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Neteisingas el. pašto formatas.' },
              },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              id: { oneOf: [{ type: 'integer' }, { type: 'string' }], example: 1 },
              name: { type: 'string', example: 'Jonas' },
              role: {
                type: 'string',
                enum: ['patient', 'specialist', 'admin'],
                example: 'patient',
              },
            },
          },
        },
      },
      Patient: {
        type: 'object',
        description:
          'Pacientas. Atsakuose niekada negrąžinami passwordHash/failedLogins/lockedUntil.',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Jonas' },
          surname: { type: 'string', example: 'Jonaitis' },
          email: { type: 'string', format: 'email', example: 'jonas@example.lt' },
          phone: { type: 'string', nullable: true, example: '+37060000000' },
          birthDate: { type: 'string', nullable: true, example: '1990-05-12' },
          registeredDate: { type: 'string', example: '2026-01-15' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Specialist: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Rūta Kazlauskienė' },
          title: { type: 'string', nullable: true, example: 'Fizinės medicinos gydytoja' },
          experience: { type: 'integer', example: 12 },
          rating: { type: 'number', format: 'float', example: 4.9 },
          reviews: { type: 'integer', example: 87 },
          specialties: { type: 'array', items: { type: 'string' }, example: ['Kineziterapija'] },
          photo: { type: 'string', nullable: true, example: 'RK' },
          available: { type: 'boolean', example: true },
          bio: { type: 'string', nullable: true },
          license: { type: 'string', example: 'LT-12345' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Kineziterapijos seansas' },
          category: { type: 'string', example: 'Kineziterapija' },
          description: { type: 'string', nullable: true },
          price: { type: 'integer', example: 45 },
          duration: { type: 'integer', description: 'Minutės', example: 60 },
          active: {
            type: 'boolean',
            example: true,
            description: 'Neaktyvi paslauga nerodoma viešai ir nepriimama naujoms rezervacijoms',
          },
          visitCount: {
            type: 'integer',
            example: 12,
            description: 'Priskirtų vizitų skaičius (tik administravimo sąraše)',
          },
        },
      },
      Visit: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          patientId: { type: 'integer', example: 1 },
          specialistId: { type: 'integer', example: 1 },
          serviceId: { type: 'integer', example: 1 },
          service: {
            type: 'string',
            description: 'Paslaugos pavadinimas',
            example: 'Kineziterapijos seansas',
          },
          date: { type: 'string', example: '2026-04-07' },
          time: { type: 'string', example: '8:00' },
          status: {
            type: 'string',
            enum: ['laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas'],
            example: 'laukiamas',
          },
          diagnosis: { type: 'string', nullable: true },
          procedures: { type: 'string', nullable: true },
          recommendations: { type: 'string', nullable: true },
          price: { type: 'integer', example: 45 },
          duration: { type: 'integer', example: 60, description: 'Trukmė minutėmis' },
          nextVisit: { type: 'string', nullable: true },
          cancelReason: { type: 'string', nullable: true },
          reminderSentAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Kada išsiųstas priminimas prieš vizitą',
          },
          specialist: {
            type: 'object',
            nullable: true,
            description: 'Specialisto santrauka (grąžinama sukūrus vizitą)',
            properties: {
              id: { type: 'integer', example: 1 },
              name: { type: 'string', example: 'Rūta Kazlauskienė' },
            },
          },
          autoAssigned: {
            type: 'boolean',
            description: 'Ar specialistas parinktas automatiškai pagal darbo krūvį',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedVisits: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Visit' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 12 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      PaginatedPatients: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Patient' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 5 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Trūksta arba neteisingas token`as.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Nepakanka teisių (RBAC arba ne savininkas).',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Įvesties validacijos klaida.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Autentifikacija ir registracija' },
    { name: 'Services', description: 'Paslaugos' },
    { name: 'Specialists', description: 'Specialistai' },
    { name: 'Patients', description: 'Pacientai (admin)' },
    { name: 'Visits', description: 'Vizitai' },
    { name: 'Stats', description: 'Admin analitika' },
  ],
};

const spec = swaggerJSDoc({
  definition,
  // JSDoc @swagger komentarai prie maršrutų. Absoliutus kelias — kad veiktų
  // nepriklausomai nuo proceso darbinio katalogo. Brūkšniai paverčiami į „/“,
  // nes swagger-jsdoc glob`as Windows`e atgalinių brūkšnių neatpažįsta.
  apis: [join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/')],
});

// Viešas katalogas ir administravimo duomenys turi atskiras schemas.
spec.components.schemas.PublicSpecialist = {
  ...spec.components.schemas.Specialist,
  properties: Object.fromEntries(
    Object.entries(spec.components.schemas.Specialist.properties).filter(
      ([key]) => !['email', 'license', 'phone', 'createdAt', 'deletedAt'].includes(key)
    )
  ),
};
spec.components.schemas.Visit.properties.duration = {
  type: 'integer',
  minimum: 1,
  maximum: 720,
  description: 'Rezervacijos metu užfiksuota paslaugos trukmė minutėmis',
};
spec.paths['/specialists'].get.responses['200'].content['application/json'].schema = {
  type: 'array',
  items: { $ref: '#/components/schemas/PublicSpecialist' },
};
spec.paths['/specialists/admin'] = {
  get: {
    tags: ['Specialists'],
    summary: 'Specialistų administravimo sąrašas',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Specialistai su administravimui reikalingais laukais',
        content: {
          'application/json': {
            schema: { type: 'array', items: { $ref: '#/components/schemas/Specialist' } },
          },
        },
      },
      403: { $ref: '#/components/responses/Forbidden' },
    },
  },
};

/**
 * Prijungia Swagger UI prie aplikacijos adresu /api/docs.
 * @param {import('express').Express} app
 */
export function mountSwagger(app) {
  app.get('/api/docs.json', (req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'RehaBook API' }));
}

export { spec };
export default mountSwagger;
