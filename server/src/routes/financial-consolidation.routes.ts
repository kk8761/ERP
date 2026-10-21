import { Router } from 'express';
import { FinancialConsolidationController } from '../controllers/financial-consolidation.controller';
// import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
// router.use(isAuthenticated);

// ============================================================================
// Company Management Routes
// ============================================================================

router.post('/companies', FinancialConsolidationController.createCompany);
router.get('/companies', FinancialConsolidationController.getCompanies);
router.get('/companies/:companyId/hierarchy', FinancialConsolidationController.getCompanyHierarchy);
router.put('/companies/:companyId/ownership', FinancialConsolidationController.updateCompanyOwnership);

// ============================================================================
// Consolidation Group Routes
// ============================================================================

router.post('/groups', FinancialConsolidationController.createConsolidationGroup);
router.get('/groups', FinancialConsolidationController.getConsolidationGroups);
router.post('/groups/:groupId/members', FinancialConsolidationController.addCompanyToGroup);
router.delete('/groups/:groupId/members/:companyId', FinancialConsolidationController.removeCompanyFromGroup);

// ============================================================================
// Intercompany Transaction Routes
// ============================================================================

router.post('/intercompany-transactions', FinancialConsolidationController.createIntercompanyTransaction);
router.get('/intercompany-transactions', FinancialConsolidationController.findIntercompanyTransactions);
router.get('/intercompany-transactions/by-type', FinancialConsolidationController.getIntercompanyTransactionsByType);

// ============================================================================
// Consolidation Routes
// ============================================================================

router.post('/consolidations', FinancialConsolidationController.createConsolidation);
router.get('/consolidations', FinancialConsolidationController.getConsolidations);
router.get('/consolidations/:consolidationId', FinancialConsolidationController.getConsolidation);
router.post('/consolidations/:consolidationId/perform', FinancialConsolidationController.performConsolidation);
router.put('/consolidations/:consolidationId/subsidiaries/:subsidiaryId', FinancialConsolidationController.updateSubsidiaryFinancials);
router.post('/consolidations/:consolidationId/approve', FinancialConsolidationController.approveConsolidation);

// ============================================================================
// Elimination Entry Routes
// ============================================================================

router.post('/elimination-entries', FinancialConsolidationController.createEliminationEntry);
router.post('/elimination-entries/:entryId/post', FinancialConsolidationController.postEliminationEntry);
router.post('/consolidations/:consolidationId/eliminations/auto-create', FinancialConsolidationController.createEliminationsForIntercompanyTransactions);

// ============================================================================
// Reporting Routes
// ============================================================================

router.get('/consolidations/:consolidationId/financial-statements', FinancialConsolidationController.generateConsolidatedFinancialStatements);

export default router;
