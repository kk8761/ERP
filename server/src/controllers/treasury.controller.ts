/**
 * Treasury Management Controller
 * 
 * Handles HTTP requests for treasury operations
 */

import { Request, Response } from 'express';
import * as treasuryService from '../services/treasury.service';

// ============================================================================
// Cash Account Controllers
// ============================================================================

export async function createCashAccount(req: Request, res: Response) {
  try {
    const account = await treasuryService.createCashAccount(req.body);
    res.status(201).json({
      success: true,
      data: account,
      message: 'Cash account created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create cash account',
      error: error.message,
    });
  }
}

export async function getCashAccounts(req: Request, res: Response) {
  try {
    const { isActive, currency, accountType } = req.query;
    const accounts = await treasuryService.getCashAccounts({
      isActive: isActive === 'true',
      currency: currency as string,
      accountType: accountType as string,
    });
    res.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cash accounts',
      error: error.message,
    });
  }
}

export async function getCashAccountById(req: Request, res: Response) {
  try {
    const account = await treasuryService.getCashAccountById(req.params.id);
    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Cash account not found',
      });
      return;
    }
    res.json({
      success: true,
      data: account,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cash account',
      error: error.message,
    });
  }
}

export async function updateCashAccountBalance(req: Request, res: Response) {
  try {
    const { currentBalance, availableBalance } = req.body;
    const account = await treasuryService.updateCashAccountBalance(
      req.params.id,
      currentBalance,
      availableBalance
    );
    res.json({
      success: true,
      data: account,
      message: 'Cash account balance updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update cash account balance',
      error: error.message,
    });
  }
}

export async function closeCashAccount(req: Request, res: Response) {
  try {
    const { closeDate } = req.body;
    const account = await treasuryService.closeCashAccount(
      req.params.id,
      new Date(closeDate)
    );
    res.json({
      success: true,
      data: account,
      message: 'Cash account closed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to close cash account',
      error: error.message,
    });
  }
}

// ============================================================================
// Cash Transaction Controllers
// ============================================================================

export async function createCashTransaction(req: Request, res: Response) {
  try {
    const transaction = await treasuryService.createCashTransaction(req.body);
    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Cash transaction created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create cash transaction',
      error: error.message,
    });
  }
}

export async function getCashTransactions(req: Request, res: Response) {
  try {
    const { cashAccountId, startDate, endDate, transactionType, status } = req.query;
    const transactions = await treasuryService.getCashTransactions({
      cashAccountId: cashAccountId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      transactionType: transactionType as string,
      status: status as string,
    });
    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cash transactions',
      error: error.message,
    });
  }
}

export async function updateTransactionStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    const transaction = await treasuryService.updateTransactionStatus(
      req.params.id,
      status
    );
    res.json({
      success: true,
      data: transaction,
      message: 'Transaction status updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction status',
      error: error.message,
    });
  }
}

// ============================================================================
// Investment Controllers
// ============================================================================

export async function createInvestment(req: Request, res: Response) {
  try {
    const investment = await treasuryService.createInvestment(req.body);
    res.status(201).json({
      success: true,
      data: investment,
      message: 'Investment created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create investment',
      error: error.message,
    });
  }
}

export async function getInvestments(req: Request, res: Response) {
  try {
    const { investmentType, status } = req.query;
    const investments = await treasuryService.getInvestments({
      investmentType: investmentType as string,
      status: status as string,
    });
    res.json({
      success: true,
      data: investments,
      count: investments.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve investments',
      error: error.message,
    });
  }
}

export async function getInvestmentById(req: Request, res: Response) {
  try {
    const investment = await treasuryService.getInvestmentById(req.params.id);
    if (!investment) {
      res.status(404).json({
        success: false,
        message: 'Investment not found',
      });
      return;
    }
    res.json({
      success: true,
      data: investment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve investment',
      error: error.message,
    });
  }
}

export async function updateInvestmentValue(req: Request, res: Response) {
  try {
    const { currentValue, yieldRate } = req.body;
    const investment = await treasuryService.updateInvestmentValue(
      req.params.id,
      currentValue,
      yieldRate
    );
    res.json({
      success: true,
      data: investment,
      message: 'Investment value updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update investment value',
      error: error.message,
    });
  }
}

export async function recordInvestmentTransaction(req: Request, res: Response) {
  try {
    const transaction = await treasuryService.recordInvestmentTransaction(req.body);
    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Investment transaction recorded successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to record investment transaction',
      error: error.message,
    });
  }
}

export async function closeInvestment(req: Request, res: Response) {
  try {
    const { status } = req.body;
    const investment = await treasuryService.closeInvestment(req.params.id, status);
    res.json({
      success: true,
      data: investment,
      message: 'Investment closed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to close investment',
      error: error.message,
    });
  }
}

// ============================================================================
// Loan Controllers
// ============================================================================

export async function createLoan(req: Request, res: Response) {
  try {
    const loan = await treasuryService.createLoan(req.body);
    res.status(201).json({
      success: true,
      data: loan,
      message: 'Loan created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create loan',
      error: error.message,
    });
  }
}

export async function getLoans(req: Request, res: Response) {
  try {
    const { loanType, direction, status } = req.query;
    const loans = await treasuryService.getLoans({
      loanType: loanType as string,
      direction: direction as string,
      status: status as string,
    });
    res.json({
      success: true,
      data: loans,
      count: loans.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loans',
      error: error.message,
    });
  }
}

export async function getLoanById(req: Request, res: Response) {
  try {
    const loan = await treasuryService.getLoanById(req.params.id);
    if (!loan) {
      res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
      return;
    }
    res.json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan',
      error: error.message,
    });
  }
}

export async function recordLoanPayment(req: Request, res: Response) {
  try {
    const payment = await treasuryService.recordLoanPayment(req.body);
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Loan payment recorded successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to record loan payment',
      error: error.message,
    });
  }
}

export async function generateLoanPaymentSchedule(req: Request, res: Response) {
  try {
    const schedule = await treasuryService.generateLoanPaymentSchedule(req.params.id);
    res.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate loan payment schedule',
      error: error.message,
    });
  }
}

export async function closeLoan(req: Request, res: Response) {
  try {
    const { status } = req.body;
    const loan = await treasuryService.closeLoan(req.params.id, status);
    res.json({
      success: true,
      data: loan,
      message: 'Loan closed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to close loan',
      error: error.message,
    });
  }
}

// ============================================================================
// Cash Flow Forecast Controllers
// ============================================================================

export async function createCashFlowForecast(req: Request, res: Response) {
  try {
    const { forecastInput, forecastData } = req.body;
    const forecast = await treasuryService.createCashFlowForecast(
      forecastInput,
      forecastData
    );
    res.status(201).json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create cash flow forecast',
      error: error.message,
    });
  }
}

export async function generateCashFlowForecast(req: Request, res: Response) {
  try {
    const { startDate, endDate, frequency, cashAccountId } = req.body;
    const forecastData = await treasuryService.generateCashFlowForecast(
      new Date(startDate),
      new Date(endDate),
      frequency,
      cashAccountId
    );
    res.json({
      success: true,
      data: forecastData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate cash flow forecast',
      error: error.message,
    });
  }
}

export async function getCashFlowForecasts(req: Request, res: Response) {
  try {
    const { status, currency } = req.query;
    const forecasts = await treasuryService.getCashFlowForecasts({
      status: status as string,
      currency: currency as string,
    });
    res.json({
      success: true,
      data: forecasts,
      count: forecasts.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cash flow forecasts',
      error: error.message,
    });
  }
}

export async function publishCashFlowForecast(req: Request, res: Response) {
  try {
    const forecast = await treasuryService.publishCashFlowForecast(req.params.id);
    res.json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast published successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish cash flow forecast',
      error: error.message,
    });
  }
}

export async function updateForecastWithActuals(req: Request, res: Response) {
  try {
    const { actualData } = req.body;
    const forecast = await treasuryService.updateForecastWithActuals(
      req.params.id,
      actualData
    );
    res.json({
      success: true,
      data: forecast,
      message: 'Forecast updated with actual data successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update forecast with actuals',
      error: error.message,
    });
  }
}

// ============================================================================
// Treasury Position Controllers
// ============================================================================

export async function generateTreasuryPosition(req: Request, res: Response) {
  try {
    const { snapshotDate, currency, generatedBy } = req.body;
    const position = await treasuryService.generateTreasuryPosition(
      new Date(snapshotDate),
      currency,
      generatedBy
    );
    res.status(201).json({
      success: true,
      data: position,
      message: 'Treasury position generated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate treasury position',
      error: error.message,
    });
  }
}

export async function getTreasuryPositions(req: Request, res: Response) {
  try {
    const { startDate, endDate, currency } = req.query;
    const positions = await treasuryService.getTreasuryPositions({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      currency: currency as string,
    });
    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve treasury positions',
      error: error.message,
    });
  }
}

export async function getLatestTreasuryPosition(req: Request, res: Response) {
  try {
    const { currency } = req.params;
    const position = await treasuryService.getLatestTreasuryPosition(currency);
    if (!position) {
      res.status(404).json({
        success: false,
        message: 'No treasury position found for this currency',
      });
      return;
    }
    res.json({
      success: true,
      data: position,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest treasury position',
      error: error.message,
    });
  }
}

export async function calculateTotalLiquidity(req: Request, res: Response) {
  try {
    const totalLiquidity = await treasuryService.calculateTotalLiquidity();
    res.json({
      success: true,
      data: { totalLiquidity },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate total liquidity',
      error: error.message,
    });
  }
}
