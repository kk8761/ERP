/**
 * Formula Field Routes
 */

import { Router } from 'express';
import { formulaFieldController } from '../controllers/formulaField.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create formula field
router.post('/', formulaFieldController.create.bind(formulaFieldController));

// Get all formula fields
router.get('/', formulaFieldController.getAll.bind(formulaFieldController));

// Get formula suggestions
router.get(
  '/suggestions',
  formulaFieldController.getSuggestions.bind(formulaFieldController)
);

// Test formula
router.post('/test', formulaFieldController.test.bind(formulaFieldController));

// Get formula fields for entity
router.get(
  '/entity/:entityName',
  formulaFieldController.getByEntity.bind(formulaFieldController)
);

// Get formula field by ID
router.get('/:id', formulaFieldController.getById.bind(formulaFieldController));

// Evaluate formula
router.post(
  '/:id/evaluate',
  formulaFieldController.evaluate.bind(formulaFieldController)
);

// Update formula field
router.put('/:id', formulaFieldController.update.bind(formulaFieldController));

// Delete formula field
router.delete(
  '/:id',
  formulaFieldController.delete.bind(formulaFieldController)
);

export default router;
