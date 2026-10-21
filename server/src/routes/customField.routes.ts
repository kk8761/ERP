/**
 * Custom Field Routes
 * API endpoints for managing custom fields on standard entities
 * Requirements: 26.1
 * Task: 37.2
 */

import { Router } from 'express';
import { customFieldController } from '../controllers/customField.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── CUSTOM FIELD DEFINITIONS ──────────────────────────────────────────

/**
 * Add a custom field to a standard entity
 * POST /api/custom-fields
 */
router.post(
  '/',
  requirePermission('create', 'custom_field'),
  auditLog('CREATE', 'custom_field'),
  customFieldController.addField.bind(customFieldController)
);

/**
 * Get all custom fields for an entity
 * GET /api/custom-fields/:entityName
 */
router.get(
  '/:entityName',
  requirePermission('read', 'custom_field'),
  customFieldController.getByEntity.bind(customFieldController)
);

/**
 * Update custom field definition
 * PUT /api/custom-fields/:id
 */
router.put(
  '/:id',
  requirePermission('update', 'custom_field'),
  auditLog('UPDATE', 'custom_field'),
  customFieldController.updateField.bind(customFieldController)
);

/**
 * Delete custom field definition
 * DELETE /api/custom-fields/:id
 */
router.delete(
  '/:id',
  requirePermission('delete', 'custom_field'),
  auditLog('DELETE', 'custom_field'),
  customFieldController.deleteField.bind(customFieldController)
);

// ─── CUSTOM FIELD VALUES ───────────────────────────────────────────────

/**
 * Get all custom field values for a record
 * GET /api/custom-fields/:entityName/:recordId/values
 */
router.get(
  '/:entityName/:recordId/values',
  requirePermission('read', 'custom_field'),
  customFieldController.getFieldValues.bind(customFieldController)
);

/**
 * Set multiple custom field values for a record
 * POST /api/custom-fields/:entityName/:recordId/values
 */
router.post(
  '/:entityName/:recordId/values',
  requirePermission('update', 'custom_field'),
  auditLog('UPDATE', 'custom_field_value'),
  customFieldController.setFieldValues.bind(customFieldController)
);

/**
 * Get custom field value for a record
 * GET /api/custom-fields/:entityName/:recordId/:fieldName
 */
router.get(
  '/:entityName/:recordId/:fieldName',
  requirePermission('read', 'custom_field'),
  customFieldController.getFieldValue.bind(customFieldController)
);

/**
 * Set custom field value for a record
 * PUT /api/custom-fields/:entityName/:recordId/:fieldName
 */
router.put(
  '/:entityName/:recordId/:fieldName',
  requirePermission('update', 'custom_field'),
  auditLog('UPDATE', 'custom_field_value'),
  customFieldController.setFieldValue.bind(customFieldController)
);

// ─── UTILITY ENDPOINTS ─────────────────────────────────────────────────

/**
 * Enrich entity with custom fields
 * POST /api/custom-fields/:entityName/enrich
 */
router.post(
  '/:entityName/enrich',
  requirePermission('read', 'custom_field'),
  customFieldController.enrichEntity.bind(customFieldController)
);

export default router;
