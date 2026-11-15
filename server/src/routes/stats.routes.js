/**
 * Statistikos maršrutai (/api/stats). Tik admin.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getAdminStats } from '../controllers/stats.controller.js';

const router = Router();

/**
 * @swagger
 * /stats/admin:
 *   get:
 *     tags: [Stats]
 *     summary: Admin analitikos suvestinė (pajamos, vizitai, užimtumas, top paslaugos)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Suvestinė diagramoms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 revenueByMonth:
 *                   type: array
 *                   items: { type: object, properties: { month: { type: string, example: '2026-04' }, revenue: { type: integer } } }
 *                 visitsByStatus:
 *                   type: array
 *                   items: { type: object, properties: { status: { type: string }, count: { type: integer } } }
 *                 specialistWorkload:
 *                   type: array
 *                   items: { type: object, properties: { specialistId: { type: integer }, name: { type: string }, count: { type: integer } } }
 *                 topServices:
 *                   type: array
 *                   items: { type: object, properties: { name: { type: string }, count: { type: integer }, revenue: { type: integer } } }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     visits: { type: integer }
 *                     revenue: { type: integer }
 *                     patients: { type: integer }
 *                     specialists: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/admin', authenticate, requireRole('admin'), getAdminStats);

export default router;
