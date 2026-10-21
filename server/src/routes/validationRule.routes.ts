/**
 * Validation Rule Routes
 * Requirements: 26.4
 * Task: 37.4
 */

import { Router } from 'express';
import { validationRuleController } from '../controllers/validationRule.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create validation rule
router.post('/', validationRuleController.create.bind(validationRuleController));

// Get all validation rules
router.get('/', validationRuleController.getAll.bind(validationRuleController));

// Get validation rules for entity
router.get(
  '/entity/:entityName',
  validationRuleController.getByEntity.bind(validationRuleController)
);

// Validate record
router.post(
  '/entity/:entityName/validate',
  validationRuleController.validateRecord.bind(validationRuleController)
);

// Validate field
router.post(
  '/entity/:entityName/field/:fieldName/validate',
  validationRuleController.validateField.bind(validationRuleController)
);

// Get validation rule by ID
router.get('/:id', validationRuleController.getById.bind(validationRuleController));

// Update validation rule
router.put('/:id', validationRuleController.update.bind(validationRuleController));

// Delete validation rule
router.delete('/:id', validationRuleController.delete.bind(validationRuleController));

// Toggle rule active status
router.post('/:id/toggle', validationRuleController.toggle.bind(validationRuleController));

export default router;
