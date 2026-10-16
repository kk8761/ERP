/**
 * Custom Entity Routes
 * API and view routes for custom entity management
 * Requirements: 19.6, 26.2
 */

import { Router } from 'express';
import { customEntityController } from '../controllers/customEntity.controller';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ─── View Routes ───────────────────────────────────────────

// GET /custom-entities/designer - Entity designer page
router.get(
  '/designer',
  checkPermission('custom_entity', 'create'),
  customEntityController.renderDesigner.bind(customEntityController)
);

// GET /custom-entities - List all custom entities
router.get(
  '/',
  checkPermission('custom_entity', 'read'),
  customEntityController.renderEntityList.bind(customEntityController)
);

// ─── API Routes ────────────────────────────────────────────

// GET /api/custom-entities - Get all custom entities
router.get(
  '/api',
  checkPermission('custom_entity', 'read'),
  customEntityController.getAllEntities.bind(customEntityController)
);

// GET /api/custom-entities/:id - Get entity by ID
router.get(
  '/api/:id',
  checkPermission('custom_entity', 'read'),
  customEntityController.getEntityById.bind(customEntityController)
);

// POST /api/custom-entities - Create new custom entity
router.post(
  '/api',
  checkPermission('custom_entity', 'create'),
  customEntityController.createEntity.bind(customEntityController)
);

// DELETE /api/custom-entities/:id - Delete custom entity
router.delete(
  '/api/:id',
  checkPermission('custom_entity', 'delete'),
  customEntityController.deleteEntity.bind(customEntityController)
);

export default router;
