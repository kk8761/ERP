/**
 * Multi-Currency Support Tests
 * 
 * Tests for Requirements 10.3 and 18.7:
 * - Currency management
 * - Exchange rate management
 * - Currency conversion
 * - Currency gains/losses calculation
 */

import * as multiCurrencyService from '../services/multi-currency.service';
import prisma from '../config/prisma';

describe('Multi-Currency Support', () => {
  let usdCurrency: any;
  let eurCurrency: any;
  let gbpCurrency: any;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.currencyGainLoss.deleteMany({});
    await prisma.exchangeRate.deleteMany({});
    await prisma.currency.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.currencyGainLoss.deleteMany({});
    await prisma.exchangeRate.deleteMany({});
    await prisma.currency.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Currency Management', () => {
    test('should create a new currency', async () => {
      usdCurrency = await multiCurrencyService.createCurrency({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isBaseCurrency: true,
      });

      expect(usdCurrency).toBeDefined();
      expect(usdCurrency.code).toBe('USD');
      expect(usdCurrency.name).toBe('US Dollar');
      expect(usdCurrency.symbol).toBe('$');
      expect(usdCurrency.decimalPlaces).toBe(2);
      expect(usdCurrency.isBaseCurrency).toBe(true);
      expect(usdCurrency.isActive).toBe(true);
    });

    test('should create additional currencies', async () => {
      eurCurrency = await multiCurrencyService.createCurrency({
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
      });

      gbpCurrency = await multiCurrencyService.createCurrency({
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
      });

      expect(eurCurrency.code).toBe('EUR');
      expect(gbpCurrency.code).toBe('GBP');
      expect(eurCurrency.isBaseCurrency).toBe(false);
      expect(gbpCurrency.isBaseCurrency).toBe(false);
    });

    test('should get all currencies', async () => {
      const currencies = await multiCurrencyService.getCurrencies();
      
      expect(currencies).toBeDefined();
      expect(currencies.length).toBeGreaterThanOrEqual(3);
      expect(currencies.some(c => c.code === 'USD')).toBe(true);
      expect(currencies.some(c => c.code === 'EUR')).toBe(true);
      expect(currencies.some(c => c.code === 'GBP')).toBe(true);
    });

    test('should get currency by code', async () => {
      const currency = await multiCurrencyService.getCurrencyByCode('USD');
      
      expect(currency).toBeDefined();
      expect(currency?.code).toBe('USD');
      expect(currency?.name).toBe('US Dollar');
    });

    test('should get base currency', async () => {
      const baseCurrency = await multiCurrencyService.getBaseCurrency();
      
      expect(baseCurrency).toBeDefined();
      expect(baseCurrency?.code).toBe('USD');
      expect(baseCurrency?.isBaseCurrency).toBe(true);
    });

    test('should update currency', async () => {
      const updated = await multiCurrencyService.updateCurrency(eurCurrency.id, {
        name: 'European Euro',
      });

      expect(updated.name).toBe('European Euro');
      expect(updated.code).toBe('EUR');
    });

    test('should only allow one base currency', async () => {
      // Try to set EUR as base currency
      await multiCurrencyService.updateCurrency(eurCurrency.id, {
        isBaseCurrency: true,
      });

      // Check that USD is no longer base currency
      const usd = await multiCurrencyService.getCurrencyByCode('USD');
      const eur = await multiCurrencyService.getCurrencyByCode('EUR');

      expect(usd?.isBaseCurrency).toBe(false);
      expect(eur?.isBaseCurrency).toBe(true);

      // Set USD back as base currency
      await multiCurrencyService.updateCurrency(usdCurrency.id, {
        isBaseCurrency: true,
      });
    });

    test('should deactivate currency', async () => {
      // Create a test currency to deactivate
      const testCurrency = await multiCurrencyService.createCurrency({
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
      });

      const deactivated = await multiCurrencyService.deactivateCurrency(testCurrency.id);
      
      expect(deactivated.isActive).toBe(false);
    });

    test('should not deactivate base currency', async () => {
      await expect(
        multiCurrencyService.deactivateCurrency(usdCurrency.id)
      ).rejects.toThrow('Cannot deactivate base currency');
    });
  });

  describe('Exchange Rate Management', () => {
    test('should set exchange rate', async () => {
      const rate = await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'EUR',
        rate: 0.85,
        effectiveDate: new Date('2024-01-01'),
      });

      expect(rate).toBeDefined();
      expect(rate.rate).toBe(0.85);
      expect(rate.fromCurrency.code).toBe('USD');
      expect(rate.toCurrency.code).toBe('EUR');
    });

    test('should set multiple exchange rates', async () => {
      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'GBP',
        rate: 0.73,
        effectiveDate: new Date('2024-01-01'),
      });

      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'EUR',
        toCurrencyCode: 'GBP',
        rate: 0.86,
        effectiveDate: new Date('2024-01-01'),
      });

      const rates = await multiCurrencyService.getLatestExchangeRates();
      expect(rates.length).toBeGreaterThanOrEqual(3);
    });

    test('should update existing exchange rate', async () => {
      // Set a new rate for the same date
      const updated = await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'EUR',
        rate: 0.87,
        effectiveDate: new Date('2024-01-01'),
      });

      expect(updated.rate).toBe(0.87);
    });

    test('should get exchange rate for specific date', async () => {
      const rate = await multiCurrencyService.getExchangeRate(
        'USD',
        'EUR',
        new Date('2024-01-15')
      );

      expect(rate).toBe(0.87);
    });

    test('should return 1 for same currency', async () => {
      const rate = await multiCurrencyService.getExchangeRate(
        'USD',
        'USD',
        new Date()
      );

      expect(rate).toBe(1);
    });

    test('should get exchange rate history', async () => {
      // Add another rate for a different date
      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'EUR',
        rate: 0.88,
        effectiveDate: new Date('2024-02-01'),
      });

      const history = await multiCurrencyService.getExchangeRateHistory(
        'USD',
        'EUR',
        new Date('2024-01-01'),
        new Date('2024-02-28')
      );

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].rate).toBeDefined();
    });

    test('should throw error for missing exchange rate', async () => {
      await expect(
        multiCurrencyService.getExchangeRate(
          'USD',
          'EUR',
          new Date('2020-01-01') // Date before any rates
        )
      ).rejects.toThrow('No exchange rate found');
    });
  });

  describe('Currency Conversion', () => {
    test('should convert currency', async () => {
      const converted = await multiCurrencyService.convertCurrency(
        100,
        'USD',
        'EUR',
        new Date('2024-01-15')
      );

      expect(converted).toBeCloseTo(87, 1); // 100 * 0.87
    });

    test('should convert to base currency', async () => {
      const converted = await multiCurrencyService.convertToBaseCurrency(
        100,
        'EUR',
        new Date('2024-01-15')
      );

      // Need to set EUR to USD rate first
      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'EUR',
        toCurrencyCode: 'USD',
        rate: 1.15,
        effectiveDate: new Date('2024-01-01'),
      });

      const converted2 = await multiCurrencyService.convertToBaseCurrency(
        100,
        'EUR',
        new Date('2024-01-15')
      );

      expect(converted2).toBeCloseTo(115, 1); // 100 * 1.15
    });

    test('should convert from base currency', async () => {
      const converted = await multiCurrencyService.convertFromBaseCurrency(
        100,
        'EUR',
        new Date('2024-01-15')
      );

      expect(converted).toBeCloseTo(87, 1); // 100 * 0.87
    });

    test('should return same amount for same currency', async () => {
      const converted = await multiCurrencyService.convertCurrency(
        100,
        'USD',
        'USD',
        new Date()
      );

      expect(converted).toBe(100);
    });
  });

  describe('Currency Gains/Losses', () => {
    test('should record realized currency gain/loss', async () => {
      const gainLoss = await multiCurrencyService.recordCurrencyGainLoss({
        transactionType: 'invoice',
        transactionId: 'INV-001',
        currencyCode: 'EUR',
        originalAmount: 1000,
        originalRate: 1.10,
        settlementAmount: 1000,
        settlementRate: 1.15,
        transactionDate: new Date('2024-01-01'),
        settlementDate: new Date('2024-02-01'),
        fiscalPeriod: '2024-01',
      });

      expect(gainLoss).toBeDefined();
      expect(gainLoss.gainLossType).toBe('realized');
      expect(gainLoss.gainLossAmount).toBeCloseTo(50, 1); // (1000 * 1.15) - (1000 * 1.10)
      expect(gainLoss.transactionType).toBe('invoice');
    });

    test('should record unrealized currency gain/loss', async () => {
      const gainLoss = await multiCurrencyService.recordCurrencyGainLoss({
        transactionType: 'revaluation',
        transactionId: 'ACC-001',
        currencyCode: 'EUR',
        originalAmount: 1000,
        originalRate: 1.10,
        transactionDate: new Date('2024-01-01'),
        fiscalPeriod: '2024-01',
      });

      expect(gainLoss).toBeDefined();
      expect(gainLoss.gainLossType).toBe('unrealized');
      expect(gainLoss.gainLossAmount).toBeDefined();
    });

    test('should get currency gains/losses', async () => {
      const gainsLosses = await multiCurrencyService.getCurrencyGainsLosses({
        fiscalPeriod: '2024-01',
      });

      expect(gainsLosses.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter gains/losses by type', async () => {
      const realized = await multiCurrencyService.getCurrencyGainsLosses({
        fiscalPeriod: '2024-01',
        gainLossType: 'realized',
      });

      const unrealized = await multiCurrencyService.getCurrencyGainsLosses({
        fiscalPeriod: '2024-01',
        gainLossType: 'unrealized',
      });

      expect(realized.every(gl => gl.gainLossType === 'realized')).toBe(true);
      expect(unrealized.every(gl => gl.gainLossType === 'unrealized')).toBe(true);
    });

    test('should calculate total gains/losses', async () => {
      const total = await multiCurrencyService.calculateTotalGainsLosses('2024-01');

      expect(total).toBeDefined();
      expect(total.fiscalPeriod).toBe('2024-01');
      expect(total.totalGainLoss).toBeDefined();
      expect(total.count).toBeGreaterThanOrEqual(2);
    });

    test('should calculate total realized gains/losses', async () => {
      const total = await multiCurrencyService.calculateTotalGainsLosses(
        '2024-01',
        'realized'
      );

      expect(total.gainLossType).toBe('realized');
      expect(total.totalGainLoss).toBeCloseTo(50, 1);
    });
  });

  describe('Foreign Currency Revaluation', () => {
    beforeAll(async () => {
      // Create test accounts with foreign currency balances
      await prisma.account.create({
        data: {
          accountCode: 'TEST-EUR-001',
          name: 'EUR Bank Account',
          type: 'Asset',
          currency: 'EUR',
          balance: 10000,
        },
      });

      await prisma.account.create({
        data: {
          accountCode: 'TEST-GBP-001',
          name: 'GBP Bank Account',
          type: 'Asset',
          currency: 'GBP',
          balance: 5000,
        },
      });
    });

    afterAll(async () => {
      await prisma.account.deleteMany({
        where: {
          accountCode: {
            startsWith: 'TEST-',
          },
        },
      });
    });

    test('should revalue foreign currency balances', async () => {
      // Set exchange rates for revaluation
      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'EUR',
        toCurrencyCode: 'USD',
        rate: 1.12,
        effectiveDate: new Date('2024-03-01'),
      });

      await multiCurrencyService.setExchangeRate({
        fromCurrencyCode: 'GBP',
        toCurrencyCode: 'USD',
        rate: 1.28,
        effectiveDate: new Date('2024-03-01'),
      });

      const result = await multiCurrencyService.revalueForeignCurrencyBalances(
        new Date('2024-03-01'),
        '2024-03'
      );

      expect(result).toBeDefined();
      expect(result.accountsRevalued).toBeGreaterThanOrEqual(2);
      expect(result.totalGainLoss).toBeDefined();
      expect(result.revaluations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Financial Transactions', () => {
    test('should handle multi-currency invoice scenario', async () => {
      // Scenario: Create an invoice in EUR, convert to USD
      const invoiceAmount = 1000; // EUR
      const invoiceDate = new Date('2024-01-15');

      // Convert to base currency (USD) at invoice date
      const usdAmount = await multiCurrencyService.convertToBaseCurrency(
        invoiceAmount,
        'EUR',
        invoiceDate
      );

      expect(usdAmount).toBeGreaterThan(0);

      // Record the transaction
      const gainLoss = await multiCurrencyService.recordCurrencyGainLoss({
        transactionType: 'invoice',
        transactionId: 'INV-EUR-001',
        currencyCode: 'EUR',
        originalAmount: invoiceAmount,
        originalRate: await multiCurrencyService.getExchangeRate('EUR', 'USD', invoiceDate),
        transactionDate: invoiceDate,
        fiscalPeriod: '2024-01',
      });

      expect(gainLoss).toBeDefined();
    });

    test('should handle payment in different currency', async () => {
      // Scenario: Invoice in EUR, payment in USD
      const invoiceAmount = 1000; // EUR
      const invoiceDate = new Date('2024-01-15');
      const paymentDate = new Date('2024-02-15');

      const invoiceRate = await multiCurrencyService.getExchangeRate('EUR', 'USD', invoiceDate);
      const paymentRate = await multiCurrencyService.getExchangeRate('EUR', 'USD', paymentDate);

      // Record realized gain/loss
      const gainLoss = await multiCurrencyService.recordCurrencyGainLoss({
        transactionType: 'payment',
        transactionId: 'PAY-EUR-001',
        currencyCode: 'EUR',
        originalAmount: invoiceAmount,
        originalRate: invoiceRate,
        settlementAmount: invoiceAmount,
        settlementRate: paymentRate,
        transactionDate: invoiceDate,
        settlementDate: paymentDate,
        fiscalPeriod: '2024-02',
      });

      expect(gainLoss.gainLossType).toBe('realized');
      expect(gainLoss.gainLossAmount).toBeDefined();
    });
  });
});

// Run the tests
console.log('🧪 Running Multi-Currency Tests...\n');

