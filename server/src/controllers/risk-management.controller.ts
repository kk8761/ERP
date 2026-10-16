/**
 * Risk Management Controller
 * 
 * Handles HTTP requests for financial risk management operations
 */

import { Request, Response } from 'express';
import * as riskService from '../services/risk-management.service';

// ============================================================================
// Currency Risk Controllers
// ============================================================================

/**
 * Calculate currency risk exposure
 * GET /api/risk-management/currency-risk
 */
export async function calculateCurrencyRisk(req: Request, res: Response) {
  try {
    const { baseCurrency, asOfDate } = req.query;
    
    const exposures = await riskService.calculateCurrencyRiskExposure(
      baseCurrency as string || 'USD',
      asOfDate ? new Date(asOfDate as string) : new Date()
    );

    res.json({
      success: true,
      data: exposures,
      count: exposures.length,
      message: 'Currency risk exposure calculated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate currency risk exposure',
      error: error.message,
    });
  }
}

// ============================================================================
// Interest Rate Risk Controllers
// ============================================================================

/**
 * Calculate interest rate risk
 * GET /api/risk-management/interest-rate-risk
 */
export async function calculateInterestRateRisk(req: Request, res: Response) {
  try {
    const { currency } = req.query;
    
    const riskMetrics = await riskService.calculateInterestRateRisk(
      currency as string || 'USD'
    );

    res.json({
      success: true,
      data: riskMetrics,
      message: 'Interest rate risk calculated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate interest rate risk',
      error: error.message,
    });
  }
}

// ============================================================================
// Credit Risk Controllers
// ============================================================================

/**
 * Calculate credit risk exposure
 * GET /api/risk-management/credit-risk
 */
export async function calculateCreditRisk(req: Request, res: Response) {
  try {
    const { currency } = req.query;
    
    const riskMetrics = await riskService.calculateCreditRiskExposure(
      currency as string | undefined
    );

    res.json({
      success: true,
      data: riskMetrics,
      message: 'Credit risk exposure calculated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate credit risk exposure',
      error: error.message,
    });
  }
}

// ============================================================================
// Risk Reporting Controllers
// ============================================================================

/**
 * Generate risk report
 * POST /api/risk-management/reports
 */
export async function generateRiskReport(req: Request, res: Response) {
  try {
    const { reportType, currency, generatedBy } = req.body;

    if (!reportType || !generatedBy) {
      res.status(400).json({
        success: false,
        message: 'reportType and generatedBy are required',
      });
      return;
    }

    const validTypes = ['currency', 'interest_rate', 'credit', 'comprehensive'];
    if (!validTypes.includes(reportType)) {
      res.status(400).json({
        success: false,
        message: `Invalid reportType. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const report = await riskService.generateRiskReport(
      reportType,
      currency || 'USD',
      generatedBy
    );

    res.status(201).json({
      success: true,
      data: report,
      message: 'Risk report generated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk report',
      error: error.message,
    });
  }
}

/**
 * Get risk reports
 * GET /api/risk-management/reports
 */
export async function getRiskReports(req: Request, res: Response) {
  try {
    const { reportType, startDate, endDate, currency } = req.query;

    const reports = await riskService.getRiskReports({
      reportType: reportType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      currency: currency as string,
    });

    res.json({
      success: true,
      data: reports,
      count: reports.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk reports',
      error: error.message,
    });
  }
}

/**
 * Get latest risk report
 * GET /api/risk-management/reports/latest
 */
export async function getLatestRiskReport(req: Request, res: Response) {
  try {
    const { reportType, currency } = req.query;

    if (!reportType || !currency) {
      res.status(400).json({
        success: false,
        message: 'reportType and currency are required',
      });
      return;
    }

    const report = await riskService.getLatestRiskReport(
      reportType as string,
      currency as string
    );

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'No risk report found',
      });
      return;
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest risk report',
      error: error.message,
    });
  }
}

/**
 * Get comprehensive risk dashboard
 * GET /api/risk-management/dashboard
 */
export async function getRiskDashboard(req: Request, res: Response) {
  try {
    const { currency } = req.query;
    const baseCurrency = currency as string || 'USD';

    // Calculate all risk metrics in parallel
    const [currencyRisk, interestRateRisk, creditRisk] = await Promise.all([
      riskService.calculateCurrencyRiskExposure(baseCurrency),
      riskService.calculateInterestRateRisk(baseCurrency),
      riskService.calculateCreditRiskExposure(baseCurrency),
    ]);

    // Calculate aggregate metrics
    const totalCurrencyRisk = currencyRisk.reduce((sum, exp) => sum + exp.valueAtRisk, 0);
    const totalRiskExposure = totalCurrencyRisk + interestRateRisk.valueAtRisk + creditRisk.unexpectedCreditLoss;

    // Identify top risks
    const topRisks = [];
    
    if (currencyRisk.length > 0) {
      const topCurrency = currencyRisk[0];
      topRisks.push({
        type: 'Currency Risk',
        description: `${topCurrency.currency} exposure: ${topCurrency.netExposure.toFixed(2)}`,
        value: topCurrency.valueAtRisk,
        severity: Math.abs(topCurrency.netExposure) > 1000000 ? 'high' : 'medium',
      });
    }

    if (interestRateRisk.riskLevel !== 'low') {
      topRisks.push({
        type: 'Interest Rate Risk',
        description: `Duration gap: ${interestRateRisk.durationGap.toFixed(2)} years`,
        value: interestRateRisk.valueAtRisk,
        severity: interestRateRisk.riskLevel,
      });
    }

    if (creditRisk.riskLevel !== 'low') {
      topRisks.push({
        type: 'Credit Risk',
        description: `Expected credit loss: ${creditRisk.expectedCreditLoss.toFixed(2)}`,
        value: creditRisk.unexpectedCreditLoss,
        severity: creditRisk.riskLevel,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalRiskExposure,
          currency: baseCurrency,
          asOfDate: new Date(),
        },
        currencyRisk: {
          exposures: currencyRisk,
          totalVaR: totalCurrencyRisk,
        },
        interestRateRisk,
        creditRisk,
        topRisks: topRisks.sort((a, b) => b.value - a.value).slice(0, 5),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk dashboard',
      error: error.message,
    });
  }
}
