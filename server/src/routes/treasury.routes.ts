/**
 * Treasury Management Routes
 */

import { Router } from 'express';
import * as treasuryController from '../controllers/treasury.controller';
// import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
// router.use(authenticate);

// ============================================================================
// Cash Account Routes
// ============================================================================

router.post('/cash-accounts', treasuryController.createCashAccount);
router.get('/cash-accounts', treasuryController.getCashAccounts);
router.get('/cash-accounts/:id', treasuryController.getCashAccountById);
router.put('/cash-accounts/:id/balance', treasuryController.updateCashAccountBalance);
router.post('/cash-accounts/:id/close', treasuryController.closeCashAccount);

// ============================================================================
// Cash Transaction Routes
// ============================================================================

router.post('/cash-transactions', treasuryController.createCashTransaction);
router.get('/cash-transactions', treasuryController.getCashTransactions);
router.put('/cash-transactions/:id/status', treasuryController.updateTransactionStatus);

// ============================================================================
// Investment Routes
// ============================================================================

router.post('/investments', treasuryController.createInvestment);
router.get('/investments', treasuryController.getInvestments);
router.get('/investments/:id', treasuryController.getInvestmentById);
router.put('/investments/:id/value', treasuryController.updateInvestmentValue);
router.post('/investments/transactions', treasuryController.recordInvestmentTransaction);
router.post('/investments/:id/close', treasuryController.closeInvestment);

// ============================================================================
// Loan Routes
// ============================================================================

router.post('/loans', treasuryController.createLoan);
router.get('/loans', treasuryController.getLoans);
router.get('/loans/:id', treasuryController.getLoanById);
router.post('/loans/payments', treasuryController.recordLoanPayment);
router.get('/loans/:id/payment-schedule', treasuryController.generateLoanPaymentSchedule);
router.post('/loans/:id/close', treasuryController.closeLoan);

// ============================================================================
// Cash Flow Forecast Routes
// ============================================================================

router.post('/cash-flow-forecasts', treasuryController.createCashFlowForecast);
router.post('/cash-flow-forecasts/generate', treasuryController.generateCashFlowForecast);
router.get('/cash-flow-forecasts', treasuryController.getCashFlowForecasts);
router.post('/cash-flow-forecasts/:id/publish', treasuryController.publishCashFlowForecast);
router.put('/cash-flow-forecasts/:id/actuals', treasuryController.updateForecastWithActuals);

// ============================================================================
// Treasury Position Routes
// ============================================================================

router.post('/treasury-positions', treasuryController.generateTreasuryPosition);
router.get('/treasury-positions', treasuryController.getTreasuryPositions);
router.get('/treasury-positions/latest/:currency', treasuryController.getLatestTreasuryPosition);
router.get('/treasury-positions/total-liquidity', treasuryController.calculateTotalLiquidity);

export default router;
