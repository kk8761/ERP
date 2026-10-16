/**
 * Multi-Currency Service
 * 
 * Handles multi-currency support including:
 * - Currency management
 * - Exchange rate management
 * - Currency conversion
 * - Currency gains/losses calculation
 * 
 * Requirements: 10.3, 18.7
 */

import prisma from '../config/prisma';

// ============================================================================
// Currency Management
// ============================================================================

export interface CurrencyInput {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  isBaseCurrency?: boolean;
}

/**
 * Create a new currency
 */
export async function createCurrency(data: CurrencyInput) {
  // If this is being set as base currency, unset any existing base currency
  if (data.isBaseCurrency) {
    await prisma.currency.updateMany({
      where: { isBaseCurrency: true },
      data: { isBaseCurrency: false },
    });
  }

  return await prisma.currency.create({
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      symbol: data.symbol,
      decimalPlaces: data.decimalPlaces || 2,
      isBaseCurrency: data.isBaseCurrency || false,
    },
  });
}

/**
 * Get all currencies
 */
export async function getCurrencies(filters?: { isActive?: boolean }) {
  return await prisma.currency.findMany({
    where: {
      isActive: filters?.isActive,
    },
    orderBy: {
      code: 'asc',
    },
  });
}

/**
 * Get currency by code
 */
export async function getCurrencyByCode(code: string) {
  return await prisma.currency.findUnique({
    where: { code: code.toUpperCase() },
  });
}

/**
 * Get base currency
 */
export async function getBaseCurrency() {
  return await prisma.currency.findFirst({
    where: { isBaseCurrency: true, isActive: true },
  });
}

/**
 * Update currency
 */
export async function updateCurrency(id: string, data: Partial<CurrencyInput>) {
  // If setting as base currency, unset any existing base currency
  if (data.isBaseCurrency) {
    await prisma.currency.updateMany({
      where: { 
        isBaseCurrency: true,
        id: { not: id },
      },
      data: { isBaseCurrency: false },
    });
  }

  return await prisma.currency.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code.toUpperCase() }),
      ...(data.name && { name: data.name }),
      ...(data.symbol && { symbol: data.symbol }),
      ...(data.decimalPlaces !== undefined && { decimalPlaces: data.decimalPlaces }),
      ...(data.isBaseCurrency !== undefined && { isBaseCurrency: data.isBaseCurrency }),
    },
  });
}

/**
 * Deactivate currency
 */
export async function deactivateCurrency(id: string) {
  const currency = await prisma.currency.findUnique({ where: { id } });
  
  if (currency?.isBaseCurrency) {
    throw new Error('Cannot deactivate base currency');
  }

  return await prisma.currency.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// Exchange Rate Management
// ============================================================================

export interface ExchangeRateInput {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  effectiveDate: Date;
  expiryDate?: Date;
  source?: string;
}

/**
 * Create or update exchange rate
 */
export async function setExchangeRate(data: ExchangeRateInput) {
  // Get currency IDs
  const fromCurrency = await getCurrencyByCode(data.fromCurrencyCode);
  const toCurrency = await getCurrencyByCode(data.toCurrencyCode);

  if (!fromCurrency || !toCurrency) {
    throw new Error('Invalid currency code');
  }

  // Check if rate already exists for this date
  const existing = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrencyId_toCurrencyId_effectiveDate: {
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        effectiveDate: data.effectiveDate,
      },
    },
  });

  if (existing) {
    // Update existing rate
    return await prisma.exchangeRate.update({
      where: { id: existing.id },
      data: {
        rate: data.rate,
        expiryDate: data.expiryDate,
        source: data.source || 'manual',
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });
  }

  // Create new rate
  return await prisma.exchangeRate.create({
    data: {
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id,
      rate: data.rate,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      source: data.source || 'manual',
    },
    include: {
      fromCurrency: true,
      toCurrency: true,
    },
  });
}

/**
 * Get exchange rate for a specific date
 */
export async function getExchangeRate(
  fromCurrencyCode: string,
  toCurrencyCode: string,
  date: Date
): Promise<number> {
  // If same currency, return 1
  if (fromCurrencyCode === toCurrencyCode) {
    return 1;
  }

  const fromCurrency = await getCurrencyByCode(fromCurrencyCode);
  const toCurrency = await getCurrencyByCode(toCurrencyCode);

  if (!fromCurrency || !toCurrency) {
    throw new Error('Invalid currency code');
  }

  // Find the most recent rate on or before the given date
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id,
      effectiveDate: { lte: date },
      isActive: true,
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: date } },
      ],
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  });

  if (!rate) {
    throw new Error(
      `No exchange rate found for ${fromCurrencyCode} to ${toCurrencyCode} on ${date.toISOString()}`
    );
  }

  return rate.rate;
}

/**
 * Get all exchange rates for a currency pair
 */
export async function getExchangeRateHistory(
  fromCurrencyCode: string,
  toCurrencyCode: string,
  startDate?: Date,
  endDate?: Date
) {
  const fromCurrency = await getCurrencyByCode(fromCurrencyCode);
  const toCurrency = await getCurrencyByCode(toCurrencyCode);

  if (!fromCurrency || !toCurrency) {
    throw new Error('Invalid currency code');
  }

  return await prisma.exchangeRate.findMany({
    where: {
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id,
      ...(startDate && { effectiveDate: { gte: startDate } }),
      ...(endDate && { effectiveDate: { lte: endDate } }),
    },
    include: {
      fromCurrency: true,
      toCurrency: true,
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  });
}

/**
 * Get latest exchange rates for all currency pairs
 */
export async function getLatestExchangeRates() {
  const currencies = await getCurrencies({ isActive: true });
  const rates: any[] = [];

  for (const fromCurrency of currencies) {
    for (const toCurrency of currencies) {
      if (fromCurrency.id !== toCurrency.id) {
        const rate = await prisma.exchangeRate.findFirst({
          where: {
            fromCurrencyId: fromCurrency.id,
            toCurrencyId: toCurrency.id,
            isActive: true,
          },
          orderBy: {
            effectiveDate: 'desc',
          },
          include: {
            fromCurrency: true,
            toCurrency: true,
          },
        });

        if (rate) {
          rates.push(rate);
        }
      }
    }
  }

  return rates;
}

/**
 * Deactivate exchange rate
 */
export async function deactivateExchangeRate(id: string) {
  return await prisma.exchangeRate.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string,
  date: Date = new Date()
): Promise<number> {
  if (fromCurrencyCode === toCurrencyCode) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrencyCode, toCurrencyCode, date);
  return amount * rate;
}

/**
 * Convert amount to base currency
 */
export async function convertToBaseCurrency(
  amount: number,
  fromCurrencyCode: string,
  date: Date = new Date()
): Promise<number> {
  const baseCurrency = await getBaseCurrency();
  
  if (!baseCurrency) {
    throw new Error('No base currency configured');
  }

  return await convertCurrency(amount, fromCurrencyCode, baseCurrency.code, date);
}

/**
 * Convert amount from base currency
 */
export async function convertFromBaseCurrency(
  amount: number,
  toCurrencyCode: string,
  date: Date = new Date()
): Promise<number> {
  const baseCurrency = await getBaseCurrency();
  
  if (!baseCurrency) {
    throw new Error('No base currency configured');
  }

  return await convertCurrency(amount, baseCurrency.code, toCurrencyCode, date);
}

// ============================================================================
// Currency Gains/Losses
// ============================================================================

export interface CurrencyGainLossInput {
  transactionType: string;
  transactionId: string;
  currencyCode: string;
  originalAmount: number;
  originalRate: number;
  settlementAmount?: number;
  settlementRate?: number;
  transactionDate: Date;
  settlementDate?: Date;
  fiscalPeriod: string;
  glAccountId?: string;
}

/**
 * Calculate and record currency gain/loss
 */
export async function recordCurrencyGainLoss(data: CurrencyGainLossInput) {
  const currency = await getCurrencyByCode(data.currencyCode);
  
  if (!currency) {
    throw new Error('Invalid currency code');
  }

  // Calculate gain/loss
  let gainLossAmount = 0;
  let gainLossType = 'unrealized';

  if (data.settlementAmount && data.settlementRate) {
    // Realized gain/loss
    const originalBaseAmount = data.originalAmount * data.originalRate;
    const settlementBaseAmount = data.settlementAmount * data.settlementRate;
    gainLossAmount = settlementBaseAmount - originalBaseAmount;
    gainLossType = 'realized';
  } else {
    // Unrealized gain/loss (revaluation)
    const currentRate = await getExchangeRate(
      data.currencyCode,
      (await getBaseCurrency())!.code,
      new Date()
    );
    const originalBaseAmount = data.originalAmount * data.originalRate;
    const currentBaseAmount = data.originalAmount * currentRate;
    gainLossAmount = currentBaseAmount - originalBaseAmount;
  }

  return await prisma.currencyGainLoss.create({
    data: {
      transactionType: data.transactionType,
      transactionId: data.transactionId,
      currencyId: currency.id,
      originalAmount: data.originalAmount,
      originalRate: data.originalRate,
      settlementAmount: data.settlementAmount,
      settlementRate: data.settlementRate,
      gainLossAmount,
      gainLossType,
      transactionDate: data.transactionDate,
      settlementDate: data.settlementDate,
      fiscalPeriod: data.fiscalPeriod,
      glAccountId: data.glAccountId,
    },
    include: {
      currency: true,
    },
  });
}

/**
 * Get currency gains/losses for a period
 */
export async function getCurrencyGainsLosses(filters: {
  fiscalPeriod?: string;
  currencyCode?: string;
  gainLossType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const currency = filters.currencyCode
    ? await getCurrencyByCode(filters.currencyCode)
    : undefined;

  return await prisma.currencyGainLoss.findMany({
    where: {
      ...(filters.fiscalPeriod && { fiscalPeriod: filters.fiscalPeriod }),
      ...(currency && { currencyId: currency.id }),
      ...(filters.gainLossType && { gainLossType: filters.gainLossType }),
      ...(filters.startDate && { transactionDate: { gte: filters.startDate } }),
      ...(filters.endDate && { transactionDate: { lte: filters.endDate } }),
    },
    include: {
      currency: true,
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });
}

/**
 * Calculate total currency gains/losses for a period
 */
export async function calculateTotalGainsLosses(
  fiscalPeriod: string,
  gainLossType?: 'realized' | 'unrealized'
) {
  const gainsLosses = await getCurrencyGainsLosses({
    fiscalPeriod,
    gainLossType,
  });

  const total = gainsLosses.reduce((sum, gl) => sum + gl.gainLossAmount, 0);

  return {
    fiscalPeriod,
    gainLossType: gainLossType || 'all',
    totalGainLoss: total,
    count: gainsLosses.length,
    details: gainsLosses,
  };
}

/**
 * Revalue foreign currency balances
 */
export async function revalueForeignCurrencyBalances(
  asOfDate: Date,
  fiscalPeriod: string
) {
  const baseCurrency = await getBaseCurrency();
  
  if (!baseCurrency) {
    throw new Error('No base currency configured');
  }

  // Get all accounts with foreign currency balances
  const accounts = await prisma.account.findMany({
    where: {
      currency: { not: baseCurrency.code },
      isActive: true,
      balance: { not: 0 },
    },
  });

  const revaluations = [];

  for (const account of accounts) {
    // Get current exchange rate
    const currentRate = await getExchangeRate(
      account.currency,
      baseCurrency.code,
      asOfDate
    );

    // Get original rate (simplified - in production, track original rates per transaction)
    const originalRate = await getExchangeRate(
      account.currency,
      baseCurrency.code,
      new Date(asOfDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    );

    // Calculate unrealized gain/loss
    const originalBaseAmount = account.balance * originalRate;
    const currentBaseAmount = account.balance * currentRate;
    const gainLossAmount = currentBaseAmount - originalBaseAmount;

    if (Math.abs(gainLossAmount) > 0.01) {
      // Only record if significant
      const gainLoss = await prisma.currencyGainLoss.create({
        data: {
          transactionType: 'revaluation',
          transactionId: account.id,
          currencyId: (await getCurrencyByCode(account.currency))!.id,
          originalAmount: account.balance,
          originalRate,
          gainLossAmount,
          gainLossType: 'unrealized',
          transactionDate: asOfDate,
          fiscalPeriod,
          glAccountId: account.id,
        },
        include: {
          currency: true,
        },
      });

      revaluations.push(gainLoss);
    }
  }

  return {
    asOfDate,
    fiscalPeriod,
    accountsRevalued: accounts.length,
    totalGainLoss: revaluations.reduce((sum, r) => sum + r.gainLossAmount, 0),
    revaluations,
  };
}

export default {
  // Currency management
  createCurrency,
  getCurrencies,
  getCurrencyByCode,
  getBaseCurrency,
  updateCurrency,
  deactivateCurrency,

  // Exchange rate management
  setExchangeRate,
  getExchangeRate,
  getExchangeRateHistory,
  getLatestExchangeRates,
  deactivateExchangeRate,

  // Currency conversion
  convertCurrency,
  convertToBaseCurrency,
  convertFromBaseCurrency,

  // Currency gains/losses
  recordCurrencyGainLoss,
  getCurrencyGainsLosses,
  calculateTotalGainsLosses,
  revalueForeignCurrencyBalances,
};
