/**
 * Risk Management Service
 * 
 * Handles financial risk assessment including:
 * - Currency risk exposure calculation
 * - Interest rate risk assessment
 * - Credit risk evaluation
 * - Risk reporting and analytics
 * 
 * Requirements: 10.5
 */

import prisma from '../config/prisma';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CurrencyRiskExposure {
  currency: string;
  totalExposure: number;
  assetExposure: number;
  liabilityExposure: number;
  netExposure: number;
  hedges: CurrencyHedge[];
  netExposureAfterHedges: number;
  valueAtRisk: number; // VaR at 95% confidence
  potentialLoss: number;
}

export interface CurrencyHedge {
  hedgeType: 'forward' | 'option' | 'swap' | 'natural';
  currency: string;
  amount: number;
  maturityDate?: Date;
  strikeRate?: number;
}

export interface InterestRateRisk {
  totalInterestBearingAssets: number;
  totalInterestBearingLiabilities: number;
  netInterestPosition: number;
  averageAssetRate: number;
  averageLiabilityRate: number;
  durationGap: number; // Duration of assets - duration of liabilities
  basisPointValue: number; // Change in value for 1bp rate change
  valueAtRisk: number; // VaR for 100bp rate change
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CreditRiskExposure {
  totalCreditExposure: number;
  exposureByRating: Record<string, number>;
  exposureByCounterparty: Array<{
    counterpartyId: string;
    counterpartyName: string;
    exposure: number;
    creditRating?: string;
    probabilityOfDefault: number;
    expectedLoss: number;
  }>;
  concentrationRisk: number; // % of total exposure in top 10 counterparties
  expectedCreditLoss: number;
  unexpectedCreditLoss: number; // Credit VaR
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskReport {
  reportId: string;
  reportDate: Date;
  reportType: 'currency' | 'interest_rate' | 'credit' | 'comprehensive';
  currency: string;
  currencyRisk?: CurrencyRiskExposure[];
  interestRateRisk?: InterestRateRisk;
  creditRisk?: CreditRiskExposure;
  summary: {
    totalRiskExposure: number;
    highRiskAreas: string[];
    recommendations: string[];
  };
  generatedBy: string;
  createdAt: Date;
}

// ============================================================================
// Currency Risk Management
// ============================================================================

/**
 * Calculate currency risk exposure across all foreign currency positions
 */
export async function calculateCurrencyRiskExposure(
  baseCurrency: string = 'USD',
  asOfDate: Date = new Date()
): Promise<CurrencyRiskExposure[]> {
  // Get all cash accounts in foreign currencies
  const cashAccounts = await prisma.cashAccount.findMany({
    where: {
      isActive: true,
      currency: { not: baseCurrency },
    },
  });

  // Get all investments in foreign currencies
  const investments = await prisma.investment.findMany({
    where: {
      status: 'active',
      currency: { not: baseCurrency },
    },
  });

  // Get all loans in foreign currencies
  const loans = await prisma.loan.findMany({
    where: {
      status: 'active',
      currency: { not: baseCurrency },
    },
  });

  // Get all AR invoices in foreign currencies
  const arInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['pending', 'partially_paid'] },
      currency: { not: baseCurrency },
    },
  });

  // Get all AP invoices in foreign currencies
  const apInvoices = await prisma.vendorInvoice.findMany({
    where: {
      status: { in: ['pending', 'partially_paid'] },
      currency: { not: baseCurrency },
    },
  });

  // Group exposures by currency
  const exposureMap = new Map<string, {
    assets: number;
    liabilities: number;
  }>();

  // Process cash accounts (assets)
  cashAccounts.forEach(account => {
    const current = exposureMap.get(account.currency) || { assets: 0, liabilities: 0 };
    current.assets += account.currentBalance;
    exposureMap.set(account.currency, current);
  });

  // Process investments (assets)
  investments.forEach(investment => {
    const current = exposureMap.get(investment.currency) || { assets: 0, liabilities: 0 };
    current.assets += investment.currentValue;
    exposureMap.set(investment.currency, current);
  });

  // Process loans
  loans.forEach(loan => {
    const current = exposureMap.get(loan.currency) || { assets: 0, liabilities: 0 };
    if (loan.direction === 'lent') {
      current.assets += loan.outstandingBalance;
    } else {
      current.liabilities += loan.outstandingBalance;
    }
    exposureMap.set(loan.currency, current);
  });

  // Process AR invoices (assets)
  arInvoices.forEach(invoice => {
    const current = exposureMap.get(invoice.currency) || { assets: 0, liabilities: 0 };
    current.assets += invoice.totalAmount - (invoice.paidAmount || 0);
    exposureMap.set(invoice.currency, current);
  });

  // Process AP invoices (liabilities)
  apInvoices.forEach(invoice => {
    const current = exposureMap.get(invoice.currency) || { assets: 0, liabilities: 0 };
    current.liabilities += invoice.totalAmount - (invoice.paidAmount || 0);
    exposureMap.set(invoice.currency, current);
  });

  // Calculate risk metrics for each currency
  const exposures: CurrencyRiskExposure[] = [];

  for (const [currency, amounts] of exposureMap.entries()) {
    const netExposure = amounts.assets - amounts.liabilities;
    const totalExposure = amounts.assets + amounts.liabilities;

    // Get exchange rate volatility (simplified - in production, use historical data)
    const volatility = await getExchangeRateVolatility(currency, baseCurrency);

    // Calculate Value at Risk (VaR) at 95% confidence level
    // VaR = Net Exposure × Exchange Rate × Volatility × Z-score (1.645 for 95%)
    const valueAtRisk = Math.abs(netExposure) * volatility * 1.645;

    // Get any hedges for this currency
    const hedges = await getCurrencyHedges(currency);
    const totalHedgeAmount = hedges.reduce((sum, hedge) => sum + hedge.amount, 0);
    const netExposureAfterHedges = netExposure - totalHedgeAmount;

    // Calculate potential loss (10% adverse movement scenario)
    const potentialLoss = Math.abs(netExposureAfterHedges) * 0.10;

    exposures.push({
      currency,
      totalExposure,
      assetExposure: amounts.assets,
      liabilityExposure: amounts.liabilities,
      netExposure,
      hedges,
      netExposureAfterHedges,
      valueAtRisk,
      potentialLoss,
    });
  }

  return exposures.sort((a, b) => Math.abs(b.netExposure) - Math.abs(a.netExposure));
}

/**
 * Get exchange rate volatility (simplified implementation)
 * In production, this should use historical exchange rate data
 */
async function getExchangeRateVolatility(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Get recent exchange rates
  const rates = await prisma.exchangeRate.findMany({
    where: {
      fromCurrency,
      toCurrency,
      effectiveDate: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    },
    orderBy: { effectiveDate: 'asc' },
  });

  if (rates.length < 2) {
    // Default volatility if insufficient data
    return 0.05; // 5% default volatility
  }

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < rates.length; i++) {
    const dailyReturn = (rates[i].rate - rates[i - 1].rate) / rates[i - 1].rate;
    returns.push(dailyReturn);
  }

  // Calculate standard deviation (volatility)
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Annualize volatility (assuming 252 trading days)
  return volatility * Math.sqrt(252);
}

/**
 * Get currency hedges (placeholder - would integrate with derivatives system)
 */
async function getCurrencyHedges(currency: string): Promise<CurrencyHedge[]> {
  // In production, this would query a derivatives/hedging system
  // For now, return empty array
  return [];
}

// ============================================================================
// Interest Rate Risk Management
// ============================================================================

/**
 * Calculate interest rate risk exposure
 */
export async function calculateInterestRateRisk(
  currency: string = 'USD'
): Promise<InterestRateRisk> {
  // Get all interest-bearing assets
  const investments = await prisma.investment.findMany({
    where: {
      status: 'active',
      currency,
      interestRate: { not: null },
    },
  });

  const loansReceivable = await prisma.loan.findMany({
    where: {
      status: 'active',
      currency,
      direction: 'lent',
    },
  });

  // Get all interest-bearing liabilities
  const loansPayable = await prisma.loan.findMany({
    where: {
      status: 'active',
      currency,
      direction: 'borrowed',
    },
  });

  // Calculate total interest-bearing positions
  const totalAssets = investments.reduce((sum, inv) => sum + inv.currentValue, 0) +
    loansReceivable.reduce((sum, loan) => sum + loan.outstandingBalance, 0);

  const totalLiabilities = loansPayable.reduce((sum, loan) => sum + loan.outstandingBalance, 0);

  const netPosition = totalAssets - totalLiabilities;

  // Calculate weighted average rates
  let assetRateSum = 0;
  let assetWeightSum = 0;

  investments.forEach(inv => {
    if (inv.interestRate) {
      assetRateSum += inv.interestRate * inv.currentValue;
      assetWeightSum += inv.currentValue;
    }
  });

  loansReceivable.forEach(loan => {
    assetRateSum += loan.interestRate * loan.outstandingBalance;
    assetWeightSum += loan.outstandingBalance;
  });

  const averageAssetRate = assetWeightSum > 0 ? assetRateSum / assetWeightSum : 0;

  let liabilityRateSum = 0;
  let liabilityWeightSum = 0;

  loansPayable.forEach(loan => {
    liabilityRateSum += loan.interestRate * loan.outstandingBalance;
    liabilityWeightSum += loan.outstandingBalance;
  });

  const averageLiabilityRate = liabilityWeightSum > 0 ? liabilityRateSum / liabilityWeightSum : 0;

  // Calculate duration gap (simplified Macaulay duration)
  const assetDuration = calculatePortfolioDuration(investments, loansReceivable);
  const liabilityDuration = calculatePortfolioDuration([], loansPayable);
  const durationGap = assetDuration - liabilityDuration;

  // Calculate basis point value (BPV) - change in portfolio value for 1bp rate change
  // BPV = Duration × Portfolio Value × 0.0001
  const basisPointValue = Math.abs(durationGap * netPosition * 0.0001);

  // Calculate Value at Risk for 100bp rate change
  const valueAtRisk = Math.abs(durationGap * netPosition * 0.01);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (Math.abs(durationGap) < 1) {
    riskLevel = 'low';
  } else if (Math.abs(durationGap) < 3) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    totalInterestBearingAssets: totalAssets,
    totalInterestBearingLiabilities: totalLiabilities,
    netInterestPosition: netPosition,
    averageAssetRate,
    averageLiabilityRate,
    durationGap,
    basisPointValue,
    valueAtRisk,
    riskLevel,
  };
}

/**
 * Calculate portfolio duration (simplified)
 */
function calculatePortfolioDuration(
  investments: any[],
  loans: any[]
): number {
  let totalDuration = 0;
  let totalValue = 0;

  // Calculate duration for investments
  investments.forEach(inv => {
    if (inv.maturityDate && inv.purchaseDate) {
      const yearsToMaturity = (inv.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
      const duration = Math.max(0, yearsToMaturity);
      totalDuration += duration * inv.currentValue;
      totalValue += inv.currentValue;
    }
  });

  // Calculate duration for loans
  loans.forEach(loan => {
    if (loan.maturityDate && loan.originationDate) {
      const yearsToMaturity = (loan.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
      const duration = Math.max(0, yearsToMaturity);
      totalDuration += duration * loan.outstandingBalance;
      totalValue += loan.outstandingBalance;
    }
  });

  return totalValue > 0 ? totalDuration / totalValue : 0;
}

// ============================================================================
// Credit Risk Management
// ============================================================================

/**
 * Calculate credit risk exposure
 */
export async function calculateCreditRiskExposure(
  currency?: string
): Promise<CreditRiskExposure> {
  // Get all AR invoices (credit exposure to customers)
  const arInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['pending', 'partially_paid', 'overdue'] },
      ...(currency && { currency }),
    },
    include: {
      customer: true,
    },
  });

  // Get all loans receivable (credit exposure to borrowers)
  const loansReceivable = await prisma.loan.findMany({
    where: {
      status: 'active',
      direction: 'lent',
      ...(currency && { currency }),
    },
  });

  // Calculate total credit exposure
  const arExposure = arInvoices.reduce(
    (sum, inv) => sum + (inv.totalAmount - (inv.paidAmount || 0)),
    0
  );
  const loanExposure = loansReceivable.reduce(
    (sum, loan) => sum + loan.outstandingBalance,
    0
  );
  const totalExposure = arExposure + loanExposure;

  // Group exposure by counterparty
  const counterpartyMap = new Map<string, {
    name: string;
    exposure: number;
    creditRating?: string;
    overdueAmount: number;
  }>();

  // Process AR invoices
  arInvoices.forEach(invoice => {
    const customerId = invoice.customerId || 'unknown';
    const customerName = invoice.customer?.name || 'Unknown Customer';
    const current = counterpartyMap.get(customerId) || {
      name: customerName,
      exposure: 0,
      overdueAmount: 0,
    };

    const outstandingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
    current.exposure += outstandingAmount;

    if (invoice.status === 'overdue') {
      current.overdueAmount += outstandingAmount;
    }

    counterpartyMap.set(customerId, current);
  });

  // Process loans receivable
  loansReceivable.forEach(loan => {
    const borrowerId = loan.borrower || 'unknown';
    const current = counterpartyMap.get(borrowerId) || {
      name: loan.borrower || 'Unknown Borrower',
      exposure: 0,
      overdueAmount: 0,
    };

    current.exposure += loan.outstandingBalance;
    counterpartyMap.set(borrowerId, current);
  });

  // Calculate exposure by counterparty with risk metrics
  const exposureByCounterparty = Array.from(counterpartyMap.entries())
    .map(([id, data]) => {
      // Estimate probability of default based on overdue ratio
      const overdueRatio = data.exposure > 0 ? data.overdueAmount / data.exposure : 0;
      const probabilityOfDefault = estimateProbabilityOfDefault(overdueRatio, data.creditRating);

      // Calculate expected loss (Exposure × PD × LGD)
      // Assuming Loss Given Default (LGD) of 50%
      const lossGivenDefault = 0.50;
      const expectedLoss = data.exposure * probabilityOfDefault * lossGivenDefault;

      return {
        counterpartyId: id,
        counterpartyName: data.name,
        exposure: data.exposure,
        creditRating: data.creditRating,
        probabilityOfDefault,
        expectedLoss,
      };
    })
    .sort((a, b) => b.exposure - a.exposure);

  // Calculate exposure by rating
  const exposureByRating: Record<string, number> = {};
  exposureByCounterparty.forEach(cp => {
    const rating = cp.creditRating || 'Unrated';
    exposureByRating[rating] = (exposureByRating[rating] || 0) + cp.exposure;
  });

  // Calculate concentration risk (top 10 counterparties)
  const top10Exposure = exposureByCounterparty
    .slice(0, 10)
    .reduce((sum, cp) => sum + cp.exposure, 0);
  const concentrationRisk = totalExposure > 0 ? (top10Exposure / totalExposure) * 100 : 0;

  // Calculate expected credit loss
  const expectedCreditLoss = exposureByCounterparty.reduce(
    (sum, cp) => sum + cp.expectedLoss,
    0
  );

  // Calculate unexpected credit loss (Credit VaR at 95% confidence)
  // Simplified calculation: ECL × 2.5 (assuming normal distribution)
  const unexpectedCreditLoss = expectedCreditLoss * 2.5;

  // Determine risk level
  const eclRatio = totalExposure > 0 ? (expectedCreditLoss / totalExposure) * 100 : 0;
  let riskLevel: 'low' | 'medium' | 'high';
  if (eclRatio < 2) {
    riskLevel = 'low';
  } else if (eclRatio < 5) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    totalCreditExposure: totalExposure,
    exposureByRating,
    exposureByCounterparty,
    concentrationRisk,
    expectedCreditLoss,
    unexpectedCreditLoss,
    riskLevel,
  };
}

/**
 * Estimate probability of default based on overdue ratio and credit rating
 */
function estimateProbabilityOfDefault(
  overdueRatio: number,
  creditRating?: string
): number {
  // Base PD from credit rating
  let basePD = 0.02; // 2% default

  if (creditRating) {
    const ratingPD: Record<string, number> = {
      'AAA': 0.001,
      'AA': 0.002,
      'A': 0.005,
      'BBB': 0.01,
      'BB': 0.03,
      'B': 0.08,
      'CCC': 0.20,
      'CC': 0.40,
      'C': 0.60,
      'D': 1.00,
    };
    basePD = ratingPD[creditRating] || basePD;
  }

  // Adjust PD based on overdue ratio
  const overdueAdjustment = overdueRatio * 0.5; // 50% weight to overdue
  const adjustedPD = Math.min(1.0, basePD + overdueAdjustment);

  return adjustedPD;
}

// ============================================================================
// Risk Reporting
// ============================================================================

/**
 * Generate comprehensive risk report
 */
export async function generateRiskReport(
  reportType: 'currency' | 'interest_rate' | 'credit' | 'comprehensive',
  currency: string = 'USD',
  generatedBy: string
): Promise<RiskReport> {
  const reportId = `RISK-${Date.now()}`;
  const reportDate = new Date();

  let currencyRisk: CurrencyRiskExposure[] | undefined;
  let interestRateRisk: InterestRateRisk | undefined;
  let creditRisk: CreditRiskExposure | undefined;

  // Calculate requested risk metrics
  if (reportType === 'currency' || reportType === 'comprehensive') {
    currencyRisk = await calculateCurrencyRiskExposure(currency);
  }

  if (reportType === 'interest_rate' || reportType === 'comprehensive') {
    interestRateRisk = await calculateInterestRateRisk(currency);
  }

  if (reportType === 'credit' || reportType === 'comprehensive') {
    creditRisk = await calculateCreditRiskExposure(currency);
  }

  // Calculate total risk exposure
  let totalRiskExposure = 0;
  const highRiskAreas: string[] = [];
  const recommendations: string[] = [];

  if (currencyRisk) {
    const totalCurrencyRisk = currencyRisk.reduce((sum, exp) => sum + exp.valueAtRisk, 0);
    totalRiskExposure += totalCurrencyRisk;

    const highExposures = currencyRisk.filter(exp => Math.abs(exp.netExposure) > 1000000);
    if (highExposures.length > 0) {
      highRiskAreas.push(`High currency exposure in ${highExposures.map(e => e.currency).join(', ')}`);
      recommendations.push('Consider implementing currency hedging strategies for major exposures');
    }
  }

  if (interestRateRisk) {
    totalRiskExposure += interestRateRisk.valueAtRisk;

    if (interestRateRisk.riskLevel === 'high') {
      highRiskAreas.push(`High interest rate risk with duration gap of ${interestRateRisk.durationGap.toFixed(2)} years`);
      recommendations.push('Consider interest rate swaps or duration matching strategies');
    }
  }

  if (creditRisk) {
    totalRiskExposure += creditRisk.unexpectedCreditLoss;

    if (creditRisk.riskLevel === 'high') {
      highRiskAreas.push(`High credit risk with expected loss of ${creditRisk.expectedCreditLoss.toFixed(2)}`);
      recommendations.push('Review credit policies and consider credit insurance for high-risk counterparties');
    }

    if (creditRisk.concentrationRisk > 50) {
      highRiskAreas.push(`High concentration risk: ${creditRisk.concentrationRisk.toFixed(1)}% in top 10 counterparties`);
      recommendations.push('Diversify customer base to reduce concentration risk');
    }
  }

  if (highRiskAreas.length === 0) {
    highRiskAreas.push('No significant risk areas identified');
    recommendations.push('Continue monitoring risk exposures regularly');
  }

  const report: RiskReport = {
    reportId,
    reportDate,
    reportType,
    currency,
    currencyRisk,
    interestRateRisk,
    creditRisk,
    summary: {
      totalRiskExposure,
      highRiskAreas,
      recommendations,
    },
    generatedBy,
    createdAt: reportDate,
  };

  // Store report in database (using JSON storage)
  await prisma.$executeRaw`
    INSERT INTO risk_reports (id, report_date, report_type, currency, report_data, generated_by, created_at)
    VALUES (${reportId}, ${reportDate}, ${reportType}, ${currency}, ${JSON.stringify(report)}::jsonb, ${generatedBy}, ${reportDate})
    ON CONFLICT (id) DO NOTHING
  `;

  return report;
}

/**
 * Get risk reports
 */
export async function getRiskReports(filters?: {
  reportType?: string;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
}): Promise<RiskReport[]> {
  const reports = await prisma.$queryRaw<any[]>`
    SELECT * FROM risk_reports
    WHERE 
      (${filters?.reportType}::text IS NULL OR report_type = ${filters?.reportType})
      AND (${filters?.startDate}::timestamp IS NULL OR report_date >= ${filters?.startDate})
      AND (${filters?.endDate}::timestamp IS NULL OR report_date <= ${filters?.endDate})
      AND (${filters?.currency}::text IS NULL OR currency = ${filters?.currency})
    ORDER BY report_date DESC
    LIMIT 100
  `;

  return reports.map(r => r.report_data as RiskReport);
}

/**
 * Get latest risk report
 */
export async function getLatestRiskReport(
  reportType: string,
  currency: string
): Promise<RiskReport | null> {
  const reports = await prisma.$queryRaw<any[]>`
    SELECT * FROM risk_reports
    WHERE report_type = ${reportType} AND currency = ${currency}
    ORDER BY report_date DESC
    LIMIT 1
  `;

  return reports.length > 0 ? reports[0].report_data as RiskReport : null;
}
