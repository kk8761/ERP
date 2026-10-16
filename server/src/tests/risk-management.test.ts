/**
 * Risk Management Service Tests
 * 
 * Tests for financial risk management including:
 * - Currency risk exposure calculation
 * - Interest rate risk assessment
 * - Credit risk evaluation
 * - Risk reporting
 */

import * as riskService from '../services/risk-management.service';
import prisma from '../config/prisma';

describe('Risk Management Service', () => {
  // ============================================================================
  // Currency Risk Tests
  // ============================================================================

  describe('Currency Risk Exposure', () => {
    beforeEach(async () => {
      // Clean up test data
      await prisma.cashAccount.deleteMany({
        where: { accountName: { contains: 'TEST' } },
      });
      await prisma.investment.deleteMany({
        where: { investmentName: { contains: 'TEST' } },
      });
      await prisma.loan.deleteMany({
        where: { loanName: { contains: 'TEST' } },
      });
    });

    it('should calculate currency risk exposure for foreign currency cash accounts', async () => {
      // Create test cash accounts in foreign currencies
      await prisma.cashAccount.create({
        data: {
          accountNumber: 'TEST-EUR-001',
          accountName: 'TEST EUR Account',
          bankName: 'Test Bank',
          accountType: 'checking',
          currency: 'EUR',
          currentBalance: 100000,
          availableBalance: 100000,
          openDate: new Date(),
        },
      });

      await prisma.cashAccount.create({
        data: {
          accountNumber: 'TEST-GBP-001',
          accountName: 'TEST GBP Account',
          bankName: 'Test Bank',
          accountType: 'checking',
          currency: 'GBP',
          currentBalance: 50000,
          availableBalance: 50000,
          openDate: new Date(),
        },
      });

      const exposures = await riskService.calculateCurrencyRiskExposure('USD');

      expect(exposures).toBeDefined();
      expect(Array.isArray(exposures)).toBe(true);
      
      const eurExposure = exposures.find(e => e.currency === 'EUR');
      expect(eurExposure).toBeDefined();
      expect(eurExposure?.assetExposure).toBe(100000);
      expect(eurExposure?.netExposure).toBe(100000);
      expect(eurExposure?.valueAtRisk).toBeGreaterThan(0);

      const gbpExposure = exposures.find(e => e.currency === 'GBP');
      expect(gbpExposure).toBeDefined();
      expect(gbpExposure?.assetExposure).toBe(50000);
    });

    it('should calculate net exposure considering both assets and liabilities', async () => {
      // Create EUR asset (cash account)
      await prisma.cashAccount.create({
        data: {
          accountNumber: 'TEST-EUR-002',
          accountName: 'TEST EUR Asset',
          bankName: 'Test Bank',
          accountType: 'checking',
          currency: 'EUR',
          currentBalance: 100000,
          availableBalance: 100000,
          openDate: new Date(),
        },
      });

      // Create EUR liability (loan payable)
      await prisma.loan.create({
        data: {
          loanNumber: 'TEST-LOAN-EUR-001',
          loanName: 'TEST EUR Loan',
          loanType: 'term_loan',
          direction: 'borrowed',
          lender: 'Test Lender',
          principalAmount: 60000,
          outstandingBalance: 60000,
          currency: 'EUR',
          interestRate: 5.0,
          interestType: 'fixed',
          originationDate: new Date(),
          maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          paymentFrequency: 'monthly',
        },
      });

      const exposures = await riskService.calculateCurrencyRiskExposure('USD');

      const eurExposure = exposures.find(e => e.currency === 'EUR');
      expect(eurExposure).toBeDefined();
      expect(eurExposure?.assetExposure).toBe(100000);
      expect(eurExposure?.liabilityExposure).toBe(60000);
      expect(eurExposure?.netExposure).toBe(40000); // 100000 - 60000
    });

    it('should calculate Value at Risk (VaR) for currency exposure', async () => {
      await prisma.cashAccount.create({
        data: {
          accountNumber: 'TEST-JPY-001',
          accountName: 'TEST JPY Account',
          bankName: 'Test Bank',
          accountType: 'checking',
          currency: 'JPY',
          currentBalance: 10000000, // 10M JPY
          availableBalance: 10000000,
          openDate: new Date(),
        },
      });

      const exposures = await riskService.calculateCurrencyRiskExposure('USD');

      const jpyExposure = exposures.find(e => e.currency === 'JPY');
      expect(jpyExposure).toBeDefined();
      expect(jpyExposure?.valueAtRisk).toBeGreaterThan(0);
      expect(jpyExposure?.potentialLoss).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Interest Rate Risk Tests
  // ============================================================================

  describe('Interest Rate Risk', () => {
    beforeEach(async () => {
      await prisma.investment.deleteMany({
        where: { investmentName: { contains: 'TEST' } },
      });
      await prisma.loan.deleteMany({
        where: { loanName: { contains: 'TEST' } },
      });
    });

    it('should calculate interest rate risk for interest-bearing positions', async () => {
      // Create interest-bearing asset (investment)
      await prisma.investment.create({
        data: {
          investmentNumber: 'TEST-INV-001',
          investmentName: 'TEST Bond Investment',
          investmentType: 'bond',
          principalAmount: 1000000,
          currentValue: 1000000,
          currency: 'USD',
          purchaseDate: new Date(),
          maturityDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
          interestRate: 4.5,
          yieldRate: 4.5,
        },
      });

      // Create interest-bearing liability (loan)
      await prisma.loan.create({
        data: {
          loanNumber: 'TEST-LOAN-002',
          loanName: 'TEST Term Loan',
          loanType: 'term_loan',
          direction: 'borrowed',
          lender: 'Test Bank',
          principalAmount: 500000,
          outstandingBalance: 500000,
          currency: 'USD',
          interestRate: 6.0,
          interestType: 'fixed',
          originationDate: new Date(),
          maturityDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
          paymentFrequency: 'monthly',
        },
      });

      const riskMetrics = await riskService.calculateInterestRateRisk('USD');

      expect(riskMetrics).toBeDefined();
      expect(riskMetrics.totalInterestBearingAssets).toBe(1000000);
      expect(riskMetrics.totalInterestBearingLiabilities).toBe(500000);
      expect(riskMetrics.netInterestPosition).toBe(500000);
      expect(riskMetrics.averageAssetRate).toBeCloseTo(4.5, 1);
      expect(riskMetrics.averageLiabilityRate).toBeCloseTo(6.0, 1);
      expect(riskMetrics.durationGap).toBeGreaterThan(0);
      expect(riskMetrics.basisPointValue).toBeGreaterThan(0);
      expect(riskMetrics.valueAtRisk).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(riskMetrics.riskLevel);
    });

    it('should calculate duration gap correctly', async () => {
      // Create short-term asset
      await prisma.investment.create({
        data: {
          investmentNumber: 'TEST-INV-SHORT',
          investmentName: 'TEST Short-term Bond',
          investmentType: 'bond',
          principalAmount: 500000,
          currentValue: 500000,
          currency: 'USD',
          purchaseDate: new Date(),
          maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          interestRate: 3.0,
        },
      });

      // Create long-term liability
      await prisma.loan.create({
        data: {
          loanNumber: 'TEST-LOAN-LONG',
          loanName: 'TEST Long-term Loan',
          loanType: 'term_loan',
          direction: 'borrowed',
          lender: 'Test Bank',
          principalAmount: 500000,
          outstandingBalance: 500000,
          currency: 'USD',
          interestRate: 5.0,
          interestType: 'fixed',
          originationDate: new Date(),
          maturityDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
          paymentFrequency: 'monthly',
        },
      });

      const riskMetrics = await riskService.calculateInterestRateRisk('USD');

      // Duration gap should be negative (assets mature before liabilities)
      expect(riskMetrics.durationGap).toBeLessThan(0);
      expect(riskMetrics.riskLevel).toBe('high'); // Large duration gap = high risk
    });

    it('should assess risk level based on duration gap', async () => {
      // Create matched duration positions (low risk)
      await prisma.investment.create({
        data: {
          investmentNumber: 'TEST-INV-MATCHED',
          investmentName: 'TEST Matched Bond',
          investmentType: 'bond',
          principalAmount: 1000000,
          currentValue: 1000000,
          currency: 'USD',
          purchaseDate: new Date(),
          maturityDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          interestRate: 4.0,
        },
      });

      await prisma.loan.create({
        data: {
          loanNumber: 'TEST-LOAN-MATCHED',
          loanName: 'TEST Matched Loan',
          loanType: 'term_loan',
          direction: 'borrowed',
          lender: 'Test Bank',
          principalAmount: 1000000,
          outstandingBalance: 1000000,
          currency: 'USD',
          interestRate: 5.0,
          interestType: 'fixed',
          originationDate: new Date(),
          maturityDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          paymentFrequency: 'monthly',
        },
      });

      const riskMetrics = await riskService.calculateInterestRateRisk('USD');

      // Matched durations should result in low risk
      expect(Math.abs(riskMetrics.durationGap)).toBeLessThan(1);
      expect(riskMetrics.riskLevel).toBe('low');
    });
  });

  // ============================================================================
  // Credit Risk Tests
  // ============================================================================

  describe('Credit Risk Exposure', () => {
    beforeEach(async () => {
      await prisma.invoice.deleteMany({
        where: { invoiceNumber: { contains: 'TEST' } },
      });
      await prisma.loan.deleteMany({
        where: { loanName: { contains: 'TEST' } },
      });
    });

    it('should calculate total credit exposure from AR and loans receivable', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          customerNumber: 'TEST-CUST-001',
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '555-0100',
          type: 'business',
        },
      });

      // Create AR invoice
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'TEST-INV-001',
          customerId: customer.id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          subtotal: 10000,
          taxAmount: 1000,
          totalAmount: 11000,
          paidAmount: 0,
          status: 'pending',
          lineItems: [],
        },
      });

      // Create loan receivable
      await prisma.loan.create({
        data: {
          loanNumber: 'TEST-LOAN-REC-001',
          loanName: 'TEST Loan Receivable',
          loanType: 'term_loan',
          direction: 'lent',
          borrower: 'Test Borrower',
          principalAmount: 50000,
          outstandingBalance: 50000,
          currency: 'USD',
          interestRate: 7.0,
          interestType: 'fixed',
          originationDate: new Date(),
          maturityDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
          paymentFrequency: 'monthly',
        },
      });

      const creditRisk = await riskService.calculateCreditRiskExposure('USD');

      expect(creditRisk).toBeDefined();
      expect(creditRisk.totalCreditExposure).toBe(61000); // 11000 + 50000
      expect(creditRisk.exposureByCounterparty.length).toBeGreaterThan(0);
      expect(creditRisk.expectedCreditLoss).toBeGreaterThan(0);
      expect(creditRisk.unexpectedCreditLoss).toBeGreaterThan(0);
    });

    it('should calculate concentration risk for top counterparties', async () => {
      // Create multiple customers with varying exposures
      const customers = [];
      for (let i = 1; i <= 15; i++) {
        const customer = await prisma.customer.create({
          data: {
            customerNumber: `TEST-CUST-${i.toString().padStart(3, '0')}`,
            name: `Test Customer ${i}`,
            email: `test${i}@example.com`,
            phone: `555-${i.toString().padStart(4, '0')}`,
            type: 'business',
          },
        });
        customers.push(customer);

        // Create invoice with decreasing amounts
        await prisma.invoice.create({
          data: {
            invoiceNumber: `TEST-INV-${i.toString().padStart(3, '0')}`,
            customerId: customer.id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            currency: 'USD',
            subtotal: 10000 / i,
            taxAmount: 1000 / i,
            totalAmount: 11000 / i,
            paidAmount: 0,
            status: 'pending',
            lineItems: [],
          },
        });
      }

      const creditRisk = await riskService.calculateCreditRiskExposure('USD');

      expect(creditRisk.concentrationRisk).toBeGreaterThan(0);
      expect(creditRisk.concentrationRisk).toBeLessThanOrEqual(100);
      expect(creditRisk.exposureByCounterparty.length).toBe(15);
      
      // Top counterparty should have highest exposure
      const topCounterparty = creditRisk.exposureByCounterparty[0];
      expect(topCounterparty.exposure).toBeGreaterThan(
        creditRisk.exposureByCounterparty[1].exposure
      );
    });

    it('should assess credit risk level based on expected loss ratio', async () => {
      const customer = await prisma.customer.create({
        data: {
          customerNumber: 'TEST-CUST-RISK',
          name: 'Test Risky Customer',
          email: 'risky@example.com',
          phone: '555-9999',
          type: 'business',
        },
      });

      // Create overdue invoice (higher risk)
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'TEST-INV-OVERDUE',
          customerId: customer.id,
          invoiceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          subtotal: 100000,
          taxAmount: 10000,
          totalAmount: 110000,
          paidAmount: 0,
          status: 'overdue',
          lineItems: [],
        },
      });

      const creditRisk = await riskService.calculateCreditRiskExposure('USD');

      expect(['low', 'medium', 'high']).toContain(creditRisk.riskLevel);
      
      // Find the risky customer
      const riskyCounterparty = creditRisk.exposureByCounterparty.find(
        cp => cp.counterpartyId === customer.id
      );
      expect(riskyCounterparty).toBeDefined();
      expect(riskyCounterparty?.probabilityOfDefault).toBeGreaterThan(0);
      expect(riskyCounterparty?.expectedLoss).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Risk Reporting Tests
  // ============================================================================

  describe('Risk Reporting', () => {
    it('should generate comprehensive risk report', async () => {
      const report = await riskService.generateRiskReport(
        'comprehensive',
        'USD',
        'test-user-id'
      );

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe('comprehensive');
      expect(report.currency).toBe('USD');
      expect(report.summary).toBeDefined();
      expect(report.summary.totalRiskExposure).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.summary.highRiskAreas)).toBe(true);
      expect(Array.isArray(report.summary.recommendations)).toBe(true);
    });

    it('should generate currency-specific risk report', async () => {
      const report = await riskService.generateRiskReport(
        'currency',
        'USD',
        'test-user-id'
      );

      expect(report.reportType).toBe('currency');
      expect(report.currencyRisk).toBeDefined();
      expect(report.interestRateRisk).toBeUndefined();
      expect(report.creditRisk).toBeUndefined();
    });

    it('should generate interest rate risk report', async () => {
      const report = await riskService.generateRiskReport(
        'interest_rate',
        'USD',
        'test-user-id'
      );

      expect(report.reportType).toBe('interest_rate');
      expect(report.interestRateRisk).toBeDefined();
      expect(report.currencyRisk).toBeUndefined();
      expect(report.creditRisk).toBeUndefined();
    });

    it('should generate credit risk report', async () => {
      const report = await riskService.generateRiskReport(
        'credit',
        'USD',
        'test-user-id'
      );

      expect(report.reportType).toBe('credit');
      expect(report.creditRisk).toBeDefined();
      expect(report.currencyRisk).toBeUndefined();
      expect(report.interestRateRisk).toBeUndefined();
    });

    it('should provide actionable recommendations in report', async () => {
      // Create high-risk scenario
      await prisma.cashAccount.create({
        data: {
          accountNumber: 'TEST-HIGH-RISK-EUR',
          accountName: 'TEST High Risk EUR',
          bankName: 'Test Bank',
          accountType: 'checking',
          currency: 'EUR',
          currentBalance: 5000000, // Large exposure
          availableBalance: 5000000,
          openDate: new Date(),
        },
      });

      const report = await riskService.generateRiskReport(
        'comprehensive',
        'USD',
        'test-user-id'
      );

      expect(report.summary.recommendations.length).toBeGreaterThan(0);
      expect(report.summary.highRiskAreas.length).toBeGreaterThan(0);
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up all test data
    await prisma.cashAccount.deleteMany({
      where: { accountName: { contains: 'TEST' } },
    });
    await prisma.investment.deleteMany({
      where: { investmentName: { contains: 'TEST' } },
    });
    await prisma.loan.deleteMany({
      where: { loanName: { contains: 'TEST' } },
    });
    await prisma.invoice.deleteMany({
      where: { invoiceNumber: { contains: 'TEST' } },
    });
    await prisma.customer.deleteMany({
      where: { customerNumber: { contains: 'TEST' } },
    });
    await prisma.$disconnect();
  });
});
