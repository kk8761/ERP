/**
 * Business Rule Routes
 * Requirements: 19.8
 * Task: 37.7
 */

import { Router } from 'express';
import { businessRuleController } from '../controllers/businessRule.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create business rule
router.post('/', businessRuleController.create.bind(businessRuleController));

// Get all business rules
router.get('/', businessRuleController.getAll.bind(businessRuleController));

// Get rules for entity and event
router.get(
  '/entity/:entityName/event/:triggerEvent',
  businessRuleController.getByEvent.bind(businessRuleController)
);

// Get rule by ID
router.get('/:id', businessRuleController.getById.bind(businessRuleController));

// Update business rule
router.put('/:id', businessRuleController.update.bind(businessRuleController));

// Delete business rule
router.delete('/:id', businessRuleController.delete.bind(businessRuleController));

// Toggle rule active status
router.post('/:id/toggle', businessRuleController.toggle.bind(businessRuleController));

// Get execution history
router.get(
  '/:id/history',
  businessRuleController.getExecutionHistory.bind(businessRuleController)
);

// Get execution statistics
router.get(
  '/:id/statistics',
  businessRuleController.getStatistics.bind(businessRuleController)
);

// Test rule with sample data
router.post('/:id/test', businessRuleController.test.bind(businessRuleController));

export default router;
