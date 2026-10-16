/**
 * Treasury Management Service
 * 
 * Handles treasury operations including:
 * - Cash account management and tracking
 * - Investment portfolio management
 * - Loan tracking (borrowed and lent)
 * - Cash flow forecasting
 * - Treasury position reporting
 */

import prisma from '../config/prisma';

// ============================================================================
// Cash Account Management
// ============================================================================

export interface CashAccountInput {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankBranch?: string;
  accountType: 'checking' | 'savings' | 'money_market' | 'petty_cash';
  currency: string;
  currentBalance?: number;
  availableBalance?: number;
  swiftCode?: string;
  iban?: string;
  routingNumber?: string;
  openDate: Date;
  glAccountId?: string;
}

/**
 * Create a new cash account
 */
export async function createCashAccount(data: CashAccountInput) {
  return await prisma.cashAccount.create({
    data: {
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      bankName: data.bankName,
      bankBranch: data.bankBranch,
      accountType: data.accountType,
      currency: data.currency,
      currentBalance: data.currentBalance || 0,
      availableBalance: data.availableBalance || 0,
      swiftCode: data.swiftCode,
      iban: data.iban,
      routingNumber: data.routingNumber,
      openDate: data.openDate,
      glAccountId: data.glAccountId,
    },
  });
}

/**
 * Get all cash accounts
 */
export async function getCashAccounts(filters?: {
  isActive?: boolean;
  currency?: string;
  accountType?: string;
}) {
  return await prisma.cashAccount.findMany({
    where: {
      isActive: filters?.isActive,
      currency: filters?.currency,
      accountType: filters?.accountType,
    },
    orderBy: {
      accountName: 'asc',
    },
  });
}

/**
 * Get cash account by ID
 */
export async function getCashAccountById(id: string) {
  return await prisma.cashAccount.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
        take: 50,
      },
    },
  });
}

/**
 * Update cash account balance
 */
export async function updateCashAccountBalance(
  accountId: string,
  currentBalance: number,
  availableBalance: number
) {
  return await prisma.cashAccount.update({
    where: { id: accountId },
    data: {
      currentBalance,
      availableBalance,
    },
  });
}

/**
 * Close cash account
 */
export async function closeCashAccount(accountId: string, closeDate: Date) {
  return await prisma.cashAccount.update({
    where: { id: accountId },
    data: {
      isActive: false,
      closeDate,
    },
  });
}

// ============================================================================
// Cash Transaction Management
// ============================================================================

export interface CashTransactionInput {
  transactionNumber: string;
  cashAccountId: string;
  transactionDate: Date;
  valueDate: Date;
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'interest' | 'fee';
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  counterparty?: string;
  category?: string;
  subcategory?: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
}

/**
 * Create a cash transaction
 */
export async function createCashTransaction(data: CashTransactionInput) {
  const transaction = await prisma.cashTransaction.create({
    data: {
      transactionNumber: data.transactionNumber,
      cashAccountId: data.cashAccountId,
      transactionDate: data.transactionDate,
      valueDate: data.valueDate,
      transactionType: data.transactionType,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      reference: data.reference,
      counterparty: data.counterparty,
      category: data.category,
      subcategory: data.subcategory,
      sourceDocumentType: data.sourceDocumentType,
      sourceDocumentId: data.sourceDocumentId,
    },
  });

  // Update account balance
  const account = await prisma.cashAccount.findUnique({
    where: { id: data.cashAccountId },
  });

  if (account) {
    const balanceChange =
      data.transactionType === 'deposit' ? data.amount : -data.amount;
    await updateCashAccountBalance(
      data.cashAccountId,
      account.currentBalance + balanceChange,
      account.availableBalance + balanceChange
    );
  }

  return transaction;
}

/**
 * Get cash transactions
 */
export async function getCashTransactions(filters?: {
  cashAccountId?: string;
  startDate?: Date;
  endDate?: Date;
  transactionType?: string;
  status?: string;
}) {
  return await prisma.cashTransaction.findMany({
    where: {
      cashAccountId: filters?.cashAccountId,
      transactionDate: {
        gte: filters?.startDate,
        lte: filters?.endDate,
      },
      transactionType: filters?.transactionType,
      status: filters?.status,
    },
    include: {
      cashAccount: true,
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'pending' | 'cleared' | 'reconciled' | 'cancelled'
) {
  return await prisma.cashTransaction.update({
    where: { id: transactionId },
    data: { status },
  });
}

// ============================================================================
// Investment Management
// ============================================================================

export interface InvestmentInput {
  investmentNumber: string;
  investmentName: string;
  investmentType: 'bond' | 'stock' | 'mutual_fund' | 'cd' | 'treasury_bill' | 'money_market';
  issuer?: string;
  cusip?: string;
  isin?: string;
  principalAmount: number;
  currentValue: number;
  currency: string;
  purchaseDate: Date;
  maturityDate?: Date;
  interestRate?: number;
  yieldRate?: number;
  glAccountId?: string;
}

/**
 * Create a new investment
 */
export async function createInvestment(data: InvestmentInput) {
  return await prisma.investment.create({
    data: {
      investmentNumber: data.investmentNumber,
      investmentName: data.investmentName,
      investmentType: data.investmentType,
      issuer: data.issuer,
      cusip: data.cusip,
      isin: data.isin,
      principalAmount: data.principalAmount,
      currentValue: data.currentValue,
      currency: data.currency,
      purchaseDate: data.purchaseDate,
      maturityDate: data.maturityDate,
      interestRate: data.interestRate,
      yieldRate: data.yieldRate,
      glAccountId: data.glAccountId,
    },
  });
}

/**
 * Get all investments
 */
export async function getInvestments(filters?: {
  investmentType?: string;
  status?: string;
}) {
  return await prisma.investment.findMany({
    where: {
      investmentType: filters?.investmentType,
      status: filters?.status,
    },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
        take: 10,
      },
    },
    orderBy: {
      investmentName: 'asc',
    },
  });
}

/**
 * Get investment by ID
 */
export async function getInvestmentById(id: string) {
  return await prisma.investment.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
      },
    },
  });
}

/**
 * Update investment value
 */
export async function updateInvestmentValue(
  investmentId: string,
  currentValue: number,
  yieldRate?: number
) {
  return await prisma.investment.update({
    where: { id: investmentId },
    data: {
      currentValue,
      yieldRate,
    },
  });
}

/**
 * Record investment transaction
 */
export async function recordInvestmentTransaction(data: {
  investmentId: string;
  transactionDate: Date;
  transactionType: 'purchase' | 'sale' | 'interest' | 'dividend' | 'redemption' | 'valuation';
  amount: number;
  units?: number;
  pricePerUnit?: number;
  currency: string;
  description?: string;
}) {
  return await prisma.investmentTransaction.create({
    data: {
      investmentId: data.investmentId,
      transactionDate: data.transactionDate,
      transactionType: data.transactionType,
      amount: data.amount,
      units: data.units,
      pricePerUnit: data.pricePerUnit,
      currency: data.currency,
      description: data.description,
    },
  });
}

/**
 * Mature or sell investment
 */
export async function closeInvestment(
  investmentId: string,
  status: 'matured' | 'sold' | 'redeemed'
) {
  return await prisma.investment.update({
    where: { id: investmentId },
    data: { status },
  });
}

// ============================================================================
// Loan Management
// ============================================================================

export interface LoanInput {
  loanNumber: string;
  loanName: string;
  loanType: 'term_loan' | 'line_of_credit' | 'mortgage' | 'bond' | 'note_payable' | 'note_receivable';
  direction: 'borrowed' | 'lent';
  lender?: string;
  borrower?: string;
  principalAmount: number;
  outstandingBalance: number;
  currency: string;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  originationDate: Date;
  maturityDate: Date;
  firstPaymentDate?: Date;
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  paymentAmount?: number;
  isSecured?: boolean;
  collateralDescription?: string;
  glAccountId?: string;
}

/**
 * Create a new loan
 */
export async function createLoan(data: LoanInput) {
  return await prisma.loan.create({
    data: {
      loanNumber: data.loanNumber,
      loanName: data.loanName,
      loanType: data.loanType,
      direction: data.direction,
      lender: data.lender,
      borrower: data.borrower,
      principalAmount: data.principalAmount,
      outstandingBalance: data.outstandingBalance,
      currency: data.currency,
      interestRate: data.interestRate,
      interestType: data.interestType,
      originationDate: data.originationDate,
      maturityDate: data.maturityDate,
      firstPaymentDate: data.firstPaymentDate,
      paymentFrequency: data.paymentFrequency,
      paymentAmount: data.paymentAmount,
      isSecured: data.isSecured || false,
      collateralDescription: data.collateralDescription,
      glAccountId: data.glAccountId,
    },
  });
}

/**
 * Get all loans
 */
export async function getLoans(filters?: {
  loanType?: string;
  direction?: string;
  status?: string;
}) {
  return await prisma.loan.findMany({
    where: {
      loanType: filters?.loanType,
      direction: filters?.direction,
      status: filters?.status,
    },
    include: {
      payments: {
        orderBy: { dueDate: 'desc' },
        take: 12,
      },
    },
    orderBy: {
      loanName: 'asc',
    },
  });
}

/**
 * Get loan by ID
 */
export async function getLoanById(id: string) {
  return await prisma.loan.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });
}

/**
 * Record loan payment
 */
export async function recordLoanPayment(data: {
  loanId: string;
  paymentDate: Date;
  dueDate: Date;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  feesAmount?: number;
  currency: string;
  paymentReference?: string;
  journalEntryId?: string;
}) {
  const payment = await prisma.loanPayment.create({
    data: {
      loanId: data.loanId,
      paymentDate: data.paymentDate,
      dueDate: data.dueDate,
      paymentAmount: data.paymentAmount,
      principalAmount: data.principalAmount,
      interestAmount: data.interestAmount,
      feesAmount: data.feesAmount || 0,
      currency: data.currency,
      status: 'paid',
      paymentReference: data.paymentReference,
      journalEntryId: data.journalEntryId,
    },
  });

  // Update loan outstanding balance
  const loan = await prisma.loan.findUnique({
    where: { id: data.loanId },
  });

  if (loan) {
    await prisma.loan.update({
      where: { id: data.loanId },
      data: {
        outstandingBalance: loan.outstandingBalance - data.principalAmount,
      },
    });
  }

  return payment;
}

/**
 * Generate loan payment schedule
 */
export async function generateLoanPaymentSchedule(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  const schedule: any[] = [];
  let balance = loan.outstandingBalance;
  let currentDate = loan.firstPaymentDate || loan.originationDate;
  const maturityDate = loan.maturityDate;

  // Calculate number of payments based on frequency
  const monthsPerPayment =
    loan.paymentFrequency === 'monthly'
      ? 1
      : loan.paymentFrequency === 'quarterly'
      ? 3
      : loan.paymentFrequency === 'semi_annual'
      ? 6
      : 12;

  let paymentNumber = 1;

  while (currentDate <= maturityDate && balance > 0.01) {
    // Calculate interest for this period
    const periodsPerYear = 12 / monthsPerPayment;
    const periodInterestRate = loan.interestRate / 100 / periodsPerYear;
    const interestAmount = balance * periodInterestRate;

    // Calculate principal payment
    const paymentAmount = loan.paymentAmount || 0;
    const principalAmount = Math.min(paymentAmount - interestAmount, balance);

    schedule.push({
      paymentNumber,
      dueDate: currentDate,
      paymentAmount: principalAmount + interestAmount,
      principalAmount,
      interestAmount,
      remainingBalance: balance - principalAmount,
    });

    balance -= principalAmount;
    paymentNumber++;

    // Move to next payment date
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + monthsPerPayment);
  }

  return schedule;
}

/**
 * Close loan (paid off or refinanced)
 */
export async function closeLoan(
  loanId: string,
  status: 'paid_off' | 'defaulted' | 'refinanced'
) {
  return await prisma.loan.update({
    where: { id: loanId },
    data: { status },
  });
}

// ============================================================================
// Cash Flow Forecasting
// ============================================================================

export interface CashFlowForecastInput {
  forecastNumber: string;
  forecastName: string;
  startDate: Date;
  endDate: Date;
  frequency: 'daily' | 'weekly' | 'monthly';
  cashAccountId?: string;
  currency: string;
  method: 'direct' | 'indirect' | 'statistical' | 'ml';
  assumptions?: string;
  createdBy: string;
}

/**
 * Create cash flow forecast
 */
export async function createCashFlowForecast(
  data: CashFlowForecastInput,
  forecastData: any[]
) {
  return await prisma.cashFlowForecast.create({
    data: {
      forecastNumber: data.forecastNumber,
      forecastName: data.forecastName,
      startDate: data.startDate,
      endDate: data.endDate,
      frequency: data.frequency,
      cashAccountId: data.cashAccountId,
      currency: data.currency,
      forecastData: forecastData,
      method: data.method,
      assumptions: data.assumptions,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Generate cash flow forecast based on historical data
 */
export async function generateCashFlowForecast(
  startDate: Date,
  endDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  cashAccountId?: string
) {
  // Get historical transactions
  const historicalStartDate = new Date(startDate);
  historicalStartDate.setMonth(historicalStartDate.getMonth() - 6); // Look back 6 months

  const transactions = await prisma.cashTransaction.findMany({
    where: {
      cashAccountId: cashAccountId,
      transactionDate: {
        gte: historicalStartDate,
        lt: startDate,
      },
      status: 'cleared',
    },
    orderBy: {
      transactionDate: 'asc',
    },
  });

  // Calculate average inflows and outflows by category
  const categoryAverages: Record<string, { inflow: number; outflow: number; count: number }> = {};

  transactions.forEach((tx) => {
    const category = tx.category || 'uncategorized';
    if (!categoryAverages[category]) {
      categoryAverages[category] = { inflow: 0, outflow: 0, count: 0 };
    }

    if (tx.transactionType === 'deposit') {
      categoryAverages[category].inflow += tx.amount;
    } else {
      categoryAverages[category].outflow += tx.amount;
    }
    categoryAverages[category].count++;
  });

  // Generate forecast periods
  const forecastData: any[] = [];
  let currentDate = new Date(startDate);
  let runningBalance = 0;

  // Get current balance
  if (cashAccountId) {
    const account = await prisma.cashAccount.findUnique({
      where: { id: cashAccountId },
    });
    runningBalance = account?.currentBalance || 0;
  } else {
    const accounts = await prisma.cashAccount.findMany({
      where: { isActive: true },
    });
    runningBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }

  while (currentDate <= endDate) {
    // Calculate expected inflows and outflows based on historical averages
    let expectedInflows = 0;
    let expectedOutflows = 0;

    Object.values(categoryAverages).forEach((avg) => {
      expectedInflows += avg.inflow / avg.count;
      expectedOutflows += avg.outflow / avg.count;
    });

    const netCashFlow = expectedInflows - expectedOutflows;
    runningBalance += netCashFlow;

    forecastData.push({
      date: new Date(currentDate),
      expectedInflows,
      expectedOutflows,
      netCashFlow,
      projectedBalance: runningBalance,
    });

    // Move to next period
    if (frequency === 'daily') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === 'weekly') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return forecastData;
}

/**
 * Get cash flow forecasts
 */
export async function getCashFlowForecasts(filters?: {
  status?: string;
  currency?: string;
}) {
  return await prisma.cashFlowForecast.findMany({
    where: {
      status: filters?.status,
      currency: filters?.currency,
    },
    include: {
      cashAccount: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Publish cash flow forecast
 */
export async function publishCashFlowForecast(forecastId: string) {
  return await prisma.cashFlowForecast.update({
    where: { id: forecastId },
    data: { status: 'published' },
  });
}

/**
 * Update forecast with actual data
 */
export async function updateForecastWithActuals(
  forecastId: string,
  actualData: any[]
) {
  const forecast = await prisma.cashFlowForecast.findUnique({
    where: { id: forecastId },
  });

  if (!forecast) {
    throw new Error('Forecast not found');
  }

  // Calculate accuracy
  const forecastData = forecast.forecastData as any[];
  let totalError = 0;
  let count = 0;

  forecastData.forEach((period, index) => {
    if (actualData[index]) {
      const error = Math.abs(
        period.projectedBalance - actualData[index].actualBalance
      );
      totalError += error / Math.abs(actualData[index].actualBalance);
      count++;
    }
  });

  const accuracy = count > 0 ? (1 - totalError / count) * 100 : 0;

  return await prisma.cashFlowForecast.update({
    where: { id: forecastId },
    data: {
      actualData,
      accuracy,
    },
  });
}

// ============================================================================
// Treasury Position Management
// ============================================================================

/**
 * Generate treasury position snapshot
 */
export async function generateTreasuryPosition(
  snapshotDate: Date,
  currency: string,
  generatedBy: string
) {
  // Get all cash accounts
  const cashAccounts = await prisma.cashAccount.findMany({
    where: {
      isActive: true,
      currency: currency,
    },
  });

  const totalCash = cashAccounts.reduce(
    (sum, acc) => sum + acc.currentBalance,
    0
  );

  const cashByAccount = cashAccounts.map((acc) => ({
    accountId: acc.id,
    accountName: acc.accountName,
    balance: acc.currentBalance,
  }));

  // Get all investments
  const investments = await prisma.investment.findMany({
    where: {
      status: 'active',
      currency: currency,
    },
  });

  const totalInvestments = investments.reduce(
    (sum, inv) => sum + inv.currentValue,
    0
  );

  const investmentsByType: Record<string, { count: number; totalValue: number }> = {};
  investments.forEach((inv) => {
    if (!investmentsByType[inv.investmentType]) {
      investmentsByType[inv.investmentType] = { count: 0, totalValue: 0 };
    }
    investmentsByType[inv.investmentType].count++;
    investmentsByType[inv.investmentType].totalValue += inv.currentValue;
  });

  // Get all loans
  const loans = await prisma.loan.findMany({
    where: {
      status: 'active',
      currency: currency,
    },
  });

  let totalLoansReceivable = 0;
  let totalLoansPayable = 0;
  const loansByType: Record<string, any> = {};

  loans.forEach((loan) => {
    if (loan.direction === 'lent') {
      totalLoansReceivable += loan.outstandingBalance;
    } else {
      totalLoansPayable += loan.outstandingBalance;
    }

    const key = `${loan.loanType}_${loan.direction}`;
    if (!loansByType[key]) {
      loansByType[key] = {
        type: loan.loanType,
        direction: loan.direction,
        count: 0,
        totalBalance: 0,
      };
    }
    loansByType[key].count++;
    loansByType[key].totalBalance += loan.outstandingBalance;
  });

  // Calculate liquidity and net debt
  const totalLiquidity = totalCash + totalInvestments;
  const netDebtPosition = totalLoansPayable - totalLoansReceivable;

  // Create treasury position snapshot
  return await prisma.treasuryPosition.create({
    data: {
      snapshotDate,
      currency,
      totalCash,
      cashByAccount,
      totalInvestments,
      investmentsByType: Object.values(investmentsByType),
      totalLoansReceivable,
      totalLoansPayable,
      loansByType: Object.values(loansByType),
      totalLiquidity,
      netDebtPosition,
      generatedBy,
    },
  });
}

/**
 * Get treasury positions
 */
export async function getTreasuryPositions(filters?: {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
}) {
  return await prisma.treasuryPosition.findMany({
    where: {
      snapshotDate: {
        gte: filters?.startDate,
        lte: filters?.endDate,
      },
      currency: filters?.currency,
    },
    orderBy: {
      snapshotDate: 'desc',
    },
  });
}

/**
 * Get latest treasury position
 */
export async function getLatestTreasuryPosition(currency: string) {
  return await prisma.treasuryPosition.findFirst({
    where: { currency },
    orderBy: {
      snapshotDate: 'desc',
    },
  });
}

/**
 * Calculate total liquidity across all currencies
 */
export async function calculateTotalLiquidity() {
  const positions = await prisma.treasuryPosition.findMany({
    orderBy: {
      snapshotDate: 'desc',
    },
    distinct: ['currency'],
  });

  return positions.reduce((sum, pos) => sum + pos.totalLiquidity, 0);
}
