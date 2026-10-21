/**
 * Treasury Management Tests
 * 
 * Tests for treasury management functionality including:
 * - Cash account management
 * - Investment tracking
 * - Loan management
 * - Cash flow forecasting
 * - Treasury position reporting
 */

import * as treasuryService from '../services/treasury.service';

// Test data
const testUserId = 'test-user-123';
const testCurrency = 'USD';

async function runTests() {
  console.log('🧪 Starting Treasury Management Tests...\n');

  try {
    // ========================================================================
    // Test 1: Cash Account Management
    // ========================================================================
    console.log('📝 Test 1: Cash Account Management');
    
    const cashAccount = await treasuryService.createCashAccount({
      accountNumber: 'CA-001',
      accountName: 'Main Operating Account',
      bankName: 'First National Bank',
      bankBranch: 'Downtown Branch',
      accountType: 'checking',
      currency: testCurrency,
      currentBalance: 100000,
      availableBalance: 95000,
      swiftCode: 'FNBAUS33',
      iban: 'US12345678901234567890',
      routingNumber: '123456789',
      openDate: new Date('2024-01-01'),
      glAccountId: 'GL-1010',
    });
    console.log('✅ Created cash account:', cashAccount.accountNumber);

    // Create cash transaction
    const transaction = await treasuryService.createCashTransaction({
      transactionNumber: 'CT-001',
      cashAccountId: cashAccount.id,
      transactionDate: new Date('2024-06-15'),
      valueDate: new Date('2024-06-15'),
      transactionType: 'deposit',
      amount: 50000,
      currency: testCurrency,
      description: 'Customer payment received',
      reference: 'INV-12345',
      counterparty: 'ABC Corporation',
      category: 'operating',
      subcategory: 'revenue',
    });
    console.log('✅ Created cash transaction:', transaction.transactionNumber);

    // Get cash accounts
    const accounts = await treasuryService.getCashAccounts({ isActive: true });
    console.log(`✅ Retrieved ${accounts.length} cash account(s)\n`);

    // ========================================================================
    // Test 2: Investment Management
    // ========================================================================
    console.log('📝 Test 2: Investment Management');

    const investment = await treasuryService.createInvestment({
      investmentNumber: 'INV-001',
      investmentName: 'US Treasury Bond 2034',
      investmentType: 'bond',
      issuer: 'US Treasury',
      cusip: '912828XG0',
      principalAmount: 100000,
      currentValue: 102000,
      currency: testCurrency,
      purchaseDate: new Date('2024-01-15'),
      maturityDate: new Date('2034-01-15'),
      interestRate: 4.5,
      yieldRate: 4.3,
      glAccountId: 'GL-1200',
    });
    console.log('✅ Created investment:', investment.investmentNumber);

    // Record investment transaction
    const invTransaction = await treasuryService.recordInvestmentTransaction({
      investmentId: investment.id,
      transactionDate: new Date('2024-06-30'),
      transactionType: 'interest',
      amount: 2250,
      currency: testCurrency,
      description: 'Semi-annual interest payment',
    });
    console.log('✅ Recorded investment transaction');

    // Get investments
    const investments = await treasuryService.getInvestments({ status: 'active' });
    console.log(`✅ Retrieved ${investments.length} investment(s)\n`);

    // ========================================================================
    // Test 3: Loan Management
    // ========================================================================
    console.log('📝 Test 3: Loan Management');

    const loan = await treasuryService.createLoan({
      loanNumber: 'LOAN-001',
      loanName: 'Term Loan for Equipment',
      loanType: 'term_loan',
      direction: 'borrowed',
      lender: 'Commercial Bank',
      borrower: 'NexaERP Inc.',
      principalAmount: 500000,
      outstandingBalance: 500000,
      currency: testCurrency,
      interestRate: 6.5,
      interestType: 'fixed',
      originationDate: new Date('2024-01-01'),
      maturityDate: new Date('2029-01-01'),
      firstPaymentDate: new Date('2024-02-01'),
      paymentFrequency: 'monthly',
      paymentAmount: 9750,
      isSecured: true,
      collateralDescription: 'Manufacturing equipment',
      glAccountId: 'GL-2100',
    });
    console.log('✅ Created loan:', loan.loanNumber);

    // Generate payment schedule
    const paymentSchedule = await treasuryService.generateLoanPaymentSchedule(loan.id);
    console.log(`✅ Generated payment schedule with ${paymentSchedule.length} payments`);

    // Record loan payment
    const payment = await treasuryService.recordLoanPayment({
      loanId: loan.id,
      paymentDate: new Date('2024-02-01'),
      dueDate: new Date('2024-02-01'),
      paymentAmount: 9750,
      principalAmount: 7041.67,
      interestAmount: 2708.33,
      feesAmount: 0,
      currency: testCurrency,
      paymentReference: 'PMT-001',
    });
    console.log('✅ Recorded loan payment');

    // Get loans
    const loans = await treasuryService.getLoans({ status: 'active' });
    console.log(`✅ Retrieved ${loans.length} loan(s)\n`);

    // ========================================================================
    // Test 4: Cash Flow Forecasting
    // ========================================================================
    console.log('📝 Test 4: Cash Flow Forecasting');

    // Generate forecast data
    const forecastData = await treasuryService.generateCashFlowForecast(
      new Date('2024-07-01'),
      new Date('2024-12-31'),
      'monthly',
      cashAccount.id
    );
    console.log(`✅ Generated forecast with ${forecastData.length} periods`);

    // Create forecast
    const forecast = await treasuryService.createCashFlowForecast(
      {
        forecastNumber: 'FCT-001',
        forecastName: 'H2 2024 Cash Flow Forecast',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31'),
        frequency: 'monthly',
        cashAccountId: cashAccount.id,
        currency: testCurrency,
        method: 'statistical',
        assumptions: 'Based on 6-month historical average',
        createdBy: testUserId,
      },
      forecastData
    );
    console.log('✅ Created cash flow forecast:', forecast.forecastNumber);

    // Publish forecast
    await treasuryService.publishCashFlowForecast(forecast.id);
    console.log('✅ Published cash flow forecast\n');

    // ========================================================================
    // Test 5: Treasury Position Reporting
    // ========================================================================
    console.log('📝 Test 5: Treasury Position Reporting');

    const treasuryPosition = await treasuryService.generateTreasuryPosition(
      new Date('2024-06-30'),
      testCurrency,
      testUserId
    );
    console.log('✅ Generated treasury position snapshot');
    console.log(`   Total Cash: $${treasuryPosition.totalCash.toLocaleString()}`);
    console.log(`   Total Investments: $${treasuryPosition.totalInvestments.toLocaleString()}`);
    console.log(`   Total Liquidity: $${treasuryPosition.totalLiquidity.toLocaleString()}`);
    console.log(`   Net Debt Position: $${treasuryPosition.netDebtPosition.toLocaleString()}`);

    // Get latest position
    const latestPosition = await treasuryService.getLatestTreasuryPosition(testCurrency);
    console.log('✅ Retrieved latest treasury position\n');

    // ========================================================================
    // Test Summary
    // ========================================================================
    console.log('✅ All Treasury Management Tests Passed!\n');
    console.log('Summary:');
    console.log('- Cash Account Management: ✅');
    console.log('- Investment Management: ✅');
    console.log('- Loan Management: ✅');
    console.log('- Cash Flow Forecasting: ✅');
    console.log('- Treasury Position Reporting: ✅');

    return {
      success: true,
      cashAccount,
      investment,
      loan,
      forecast,
      treasuryPosition,
    };
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Treasury Management implementation validated successfully!');
        process.exit(0);
      } else {
        console.error('\n❌ Treasury Management tests failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export { runTests };
