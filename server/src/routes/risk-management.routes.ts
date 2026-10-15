/**
 * Risk Management Routes
 * 
 * API endpoints for financial risk management
 */

import { Router } from 'express';
import * as riskController from '../controllers/risk-management.controller';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// ============================================================================
// Currency Risk Routes
// ============================================================================

/**
 * @route   GET /api/risk-management/currency-risk
 * @desc    Calculate currency risk exposure
 * @access  Private
 * @query   baseCurrency - Base currency for calculations (default: USD)
 * @query   asOfDate - Date for risk calculation (default: today)
 */
router.get('/currency-risk', riskController.calculateCurrencyRisk);

// ============================================================================
// Interest Rate Risk Routes
// ============================================================================

/**
 * @route   GET /api/risk-management/interest-rate-risk
 * @desc    Calculate interest rate risk
 * @access  Private
 * @query   currency - Currency for risk calculation (default: USD)
 */
router.get('/interest-rate-risk', riskController.calculateInterestRateRisk);

// ============================================================================
// Credit Risk Routes
// ============================================================================

/**
 * @route   GET /api/risk-management/credit-risk
 * @desc    Calculate credit risk exposure
 * @access  Private
 * @query   currency - Currency filter (optional)
 */
router.get('/credit-risk', riskController.calculateCreditRisk);

// ============================================================================
// Risk Reporting Routes
// ============================================================================

/**
 * @route   POST /api/risk-management/reports
 * @desc    Generate a risk report
 * @access  Private
 * @body    reportType - Type of report (currency, interest_rate, credit, comprehensive)
 * @body    currency - Currency for report (default: USD)
 * @body    generatedBy - User ID generating the report
 */
router.post('/reports', riskController.generateRiskReport);

/**
 * @route   GET /api/risk-management/reports
 * @desc    Get risk reports with filters
 * @access  Private
 * @query   reportType - Filter by report type
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 * @query   currency - Filter by currency
 */
router.get('/reports', riskController.getRiskReports);

/**
 * @route   GET /api/risk-management/reports/latest
 * @desc    Get latest risk report
 * @access  Private
 * @query   reportType - Type of report (required)
 * @query   currency - Currency (required)
 */
router.get('/reports/latest', riskController.getLatestRiskReport);

/**
 * @route   GET /api/risk-management/dashboard
 * @desc    Get comprehensive risk dashboard
 * @access  Private
 * @query   currency - Currency for dashboard (default: USD)
 */
router.get('/dashboard', riskController.getRiskDashboard);

export default router;
