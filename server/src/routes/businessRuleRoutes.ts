/**
 * Business Rule Routes
 * API endpoints for business rule management
 */

import { Router } from 'express';
import { businessRuleController } from '../controllers/BusinessRuleController';

const router = Router();

// Rule CRUD operations
router.post('/rules', businessRuleController.createRule.bind(businessRuleController));
router.get('/rules', businessRuleController.getAllRules.bind(businessRuleController));
router.get('/rules/:id', businessRuleController.getRule.bind(businessRuleController));
router.put('/rules/:id', businessRuleController.updateRule.bind(businessRuleController));
router.delete('/rules/:id', businessRuleController.deleteRule.bind(businessRuleController));

// Rule validation
router.post('/rules/validate', businessRuleController.validateRule.bind(businessRuleController));

// Rule execution
router.post('/rules/:id/execute', businessRuleController.executeRule.bind(businessRuleController));
router.post('/rules/execute', businessRuleController.executeRulesForEvent.bind(businessRuleController));

// Entity-specific rules
router.get('/rules/entity/:entity', businessRuleController.getRulesByEntity.bind(businessRuleController));

// Custom functions
router.post('/rules/functions', businessRuleController.registerCustomFunction.bind(businessRuleController));

export default router;
