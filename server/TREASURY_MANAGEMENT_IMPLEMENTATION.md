# Treasury Management Implementation

## Overview

The Treasury Management module provides comprehensive treasury operations for managing cash positions, investments, loans, and cash flow forecasting. This implementation supports enterprise-grade treasury management with multi-currency capabilities, automated forecasting, and detailed position reporting.

## Features Implemented

### 1. Cash Account Management
- **Cash Account Entity Model**: Track cash accounts across multiple banks and currencies
- **Account Types**: Support for checking, savings, money market, and petty cash accounts
- **Balance Tracking**: Current balance and available balance (after pending transactions)
- **Bank Details**: SWIFT codes, IBAN, routing numbers for international operations
- **GL Integration**: Link to general ledger accounts for accounting integration

### 2. Cash Transaction Tracking
- **Transaction Types**: Deposits, withdrawals, transfers, interest, and fees
- **Value Dating**: Track both transaction date and value date (when funds are available)
- **Categorization**: Operating, investing, and financing categories
- **Status Workflow**: Pending → Cleared → Reconciled
- **Source Document Linking**: Link to invoices, payments, or journal entries

### 3. Investment Portfolio Management
- **Investment Types**: Bonds, stocks, mutual funds, CDs, treasury bills, money market
- **Security Identifiers**: CUSIP and ISIN support for international securities
- **Valuation**: Track principal amount, current value, and yield rates
- **Transaction History**: Purchase, sale, interest, dividend, redemption, and valuation transactions
- **Maturity Tracking**: Monitor investment maturity dates

### 4. Loan Management
- **Loan Types**: Term loans, lines of credit, mortgages, bonds, notes payable/receivable
- **Bidirectional**: Track both borrowed and lent loans
- **Interest Calculation**: Fixed and variable interest rates
- **Payment Schedules**: Monthly, quarterly, semi-annual, and annual frequencies
- **Amortization**: Automatic payment schedule generation with principal/interest breakdown
- **Collateral Tracking**: Record secured loans with collateral descriptions

### 5. Cash Flow Forecasting
- **Forecast Methods**: Direct, indirect, statistical, and machine learning approaches
- **Forecast Frequencies**: Daily, weekly, and monthly forecasts
- **Historical Analysis**: Generate forecasts based on historical transaction patterns
- **Accuracy Tracking**: Compare forecasts to actuals and calculate accuracy metrics
- **Scenario Planning**: Support for multiple forecast scenarios

### 6. Treasury Position Reporting
- **Snapshot Generation**: Create point-in-time treasury position snapshots
- **Comprehensive View**: Cash, investments, and loans in a single report
- **Liquidity Metrics**: Total liquidity (cash + liquid investments)
- **Debt Metrics**: Net debt position (loans payable - loans receivable)
- **Currency Exposure**: Track foreign currency exposure by currency
- **Trend Analysis**: Historical position tracking for trend analysis

## Database Schema

### Core Models

#### CashAccount
```typescript
{
  id: UUID
  accountNumber: string (unique)
  accountName: string
  bankName: string
  bankBranch: string (optional)
  accountType: 'checking' | 'savings' | 'money_market' | 'petty_cash'
  currency: string (ISO 4217)
  currentBalance: number
  availableBalance: number
  swiftCode: string (optional)
  iban: string (optional)
  routingNumber: string (optional)
  isActive: boolean
  openDate: Date
  closeDate: Date (optional)
  glAccountId: string (optional)
}
```

#### CashTransaction
```typescript
{
  id: UUID
  transactionNumber: string (unique)
  cashAccountId: UUID
  transactionDate: Date
  valueDate: Date
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'interest' | 'fee'
  amount: number
  currency: string
  description: string
  reference: string (optional)
  counterparty: string (optional)
  category: string (optional)
  subcategory: string (optional)
  status: 'pending' | 'cleared' | 'reconciled' | 'cancelled'
  sourceDocumentType: string (optional)
  sourceDocumentId: string (optional)
}
```

#### Investment
```typescript
{
  id: UUID
  investmentNumber: string (unique)
  investmentName: string
  investmentType: 'bond' | 'stock' | 'mutual_fund' | 'cd' | 'treasury_bill' | 'money_market'
  issuer: string (optional)
  cusip: string (optional)
  isin: string (optional)
  principalAmount: number
  currentValue: number
  currency: string
  purchaseDate: Date
  maturityDate: Date (optional)
  interestRate: number (optional)
  yieldRate: number (optional)
  status: 'active' | 'matured' | 'sold' | 'redeemed'
  glAccountId: string (optional)
}
```

#### Loan
```typescript
{
  id: UUID
  loanNumber: string (unique)
  loanName: string
  loanType: 'term_loan' | 'line_of_credit' | 'mortgage' | 'bond' | 'note_payable' | 'note_receivable'
  direction: 'borrowed' | 'lent'
  lender: string (optional)
  borrower: string (optional)
  principalAmount: number
  outstandingBalance: number
  currency: string
  interestRate: number
  interestType: 'fixed' | 'variable'
  originationDate: Date
  maturityDate: Date
  firstPaymentDate: Date (optional)
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  paymentAmount: number (optional)
  isSecured: boolean
  collateralDescription: string (optional)
  status: 'active' | 'paid_off' | 'defaulted' | 'refinanced'
  glAccountId: string (optional)
}
```

#### CashFlowForecast
```typescript
{
  id: UUID
  forecastNumber: string (unique)
  forecastName: string
  startDate: Date
  endDate: Date
  frequency: 'daily' | 'weekly' | 'monthly'
  cashAccountId: UUID (optional)
  currency: string
  forecastData: JSON // Array of forecast periods
  actualData: JSON (optional)
  accuracy: number (optional)
  method: 'direct' | 'indirect' | 'statistical' | 'ml'
  assumptions: string (optional)
  status: 'draft' | 'published' | 'archived'
  createdBy: string
  approvedBy: string (optional)
  approvedAt: DateTime (optional)
}
```

#### TreasuryPosition
```typescript
{
  id: UUID
  snapshotDate: Date
  currency: string
  totalCash: number
  cashByAccount: JSON // Array of {accountId, accountName, balance}
  totalInvestments: number
  investmentsByType: JSON // Array of {type, count, totalValue}
  totalLoansReceivable: number
  totalLoansPayable: number
  loansByType: JSON // Array of {type, direction, count, totalBalance}
  totalLiquidity: number
  netDebtPosition: number
  currencyExposure: JSON (optional)
  interestRateRisk: number (optional)
  generatedBy: string
  notes: string (optional)
}
```

## API Endpoints

### Cash Account Management
- `POST /api/treasury/cash-accounts` - Create cash account
- `GET /api/treasury/cash-accounts` - List cash accounts
- `GET /api/treasury/cash-accounts/:id` - Get cash account details
- `PUT /api/treasury/cash-accounts/:id/balance` - Update account balance
- `POST /api/treasury/cash-accounts/:id/close` - Close cash account

### Cash Transaction Management
- `POST /api/treasury/cash-transactions` - Create cash transaction
- `GET /api/treasury/cash-transactions` - List cash transactions
- `PUT /api/treasury/cash-transactions/:id/status` - Update transaction status

### Investment Management
- `POST /api/treasury/investments` - Create investment
- `GET /api/treasury/investments` - List investments
- `GET /api/treasury/investments/:id` - Get investment details
- `PUT /api/treasury/investments/:id/value` - Update investment value
- `POST /api/treasury/investments/transactions` - Record investment transaction
- `POST /api/treasury/investments/:id/close` - Close investment

### Loan Management
- `POST /api/treasury/loans` - Create loan
- `GET /api/treasury/loans` - List loans
- `GET /api/treasury/loans/:id` - Get loan details
- `POST /api/treasury/loans/payments` - Record loan payment
- `GET /api/treasury/loans/:id/payment-schedule` - Generate payment schedule
- `POST /api/treasury/loans/:id/close` - Close loan

### Cash Flow Forecasting
- `POST /api/treasury/cash-flow-forecasts` - Create forecast
- `POST /api/treasury/cash-flow-forecasts/generate` - Generate forecast from historical data
- `GET /api/treasury/cash-flow-forecasts` - List forecasts
- `POST /api/treasury/cash-flow-forecasts/:id/publish` - Publish forecast
- `PUT /api/treasury/cash-flow-forecasts/:id/actuals` - Update with actual data

### Treasury Position Reporting
- `POST /api/treasury/treasury-positions` - Generate treasury position
- `GET /api/treasury/treasury-positions` - List treasury positions
- `GET /api/treasury/treasury-positions/latest/:currency` - Get latest position
- `GET /api/treasury/treasury-positions/total-liquidity` - Calculate total liquidity

## Usage Examples

### 1. Create Cash Account

```typescript
const cashAccount = await createCashAccount({
  accountNumber: 'CA-001',
  accountName: 'Main Operating Account',
  bankName: 'First National Bank',
  accountType: 'checking',
  currency: 'USD',
  currentBalance: 100000,
  availableBalance: 95000,
  swiftCode: 'FNBAUS33',
  openDate: new Date('2024-01-01'),
  glAccountId: 'GL-1010',
});
```

### 2. Record Cash Transaction

```typescript
const transaction = await createCashTransaction({
  transactionNumber: 'CT-001',
  cashAccountId: cashAccount.id,
  transactionDate: new Date('2024-06-15'),
  valueDate: new Date('2024-06-15'),
  transactionType: 'deposit',
  amount: 50000,
  currency: 'USD',
  description: 'Customer payment received',
  reference: 'INV-12345',
  category: 'operating',
});
```

### 3. Create Investment

```typescript
const investment = await createInvestment({
  investmentNumber: 'INV-001',
  investmentName: 'US Treasury Bond 2034',
  investmentType: 'bond',
  issuer: 'US Treasury',
  principalAmount: 100000,
  currentValue: 102000,
  currency: 'USD',
  purchaseDate: new Date('2024-01-15'),
  maturityDate: new Date('2034-01-15'),
  interestRate: 4.5,
  yieldRate: 4.3,
});
```

### 4. Create Loan

```typescript
const loan = await createLoan({
  loanNumber: 'LOAN-001',
  loanName: 'Term Loan for Equipment',
  loanType: 'term_loan',
  direction: 'borrowed',
  lender: 'Commercial Bank',
  principalAmount: 500000,
  outstandingBalance: 500000,
  currency: 'USD',
  interestRate: 6.5,
  interestType: 'fixed',
  originationDate: new Date('2024-01-01'),
  maturityDate: new Date('2029-01-01'),
  paymentFrequency: 'monthly',
  paymentAmount: 9750,
  isSecured: true,
  collateralDescription: 'Manufacturing equipment',
});
```

### 5. Generate Cash Flow Forecast

```typescript
// Generate forecast data from historical transactions
const forecastData = await generateCashFlowForecast(
  new Date('2024-07-01'),
  new Date('2024-12-31'),
  'monthly',
  cashAccountId
);

// Create forecast
const forecast = await createCashFlowForecast(
  {
    forecastNumber: 'FCT-001',
    forecastName: 'H2 2024 Cash Flow Forecast',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-12-31'),
    frequency: 'monthly',
    currency: 'USD',
    method: 'statistical',
    createdBy: userId,
  },
  forecastData
);
```

### 6. Generate Treasury Position

```typescript
const position = await generateTreasuryPosition(
  new Date('2024-06-30'),
  'USD',
  userId
);

console.log('Total Cash:', position.totalCash);
console.log('Total Investments:', position.totalInvestments);
console.log('Total Liquidity:', position.totalLiquidity);
console.log('Net Debt Position:', position.netDebtPosition);
```

## Integration with Other Modules

### Multi-Currency Support
- **Currency Conversion**: Automatic conversion for multi-currency treasury operations
- **Exchange Rate Integration**: Use exchange rates from multi-currency module
- **Foreign Currency Exposure**: Calculate and report FX exposure

### Accounting Module
- **GL Integration**: Link cash accounts, investments, and loans to GL accounts
- **Journal Entry Generation**: Automatic journal entries for treasury transactions
- **Financial Statement Impact**: Treasury positions reflected in balance sheet

### Financial Consolidation
- **Multi-Entity Treasury**: Consolidate treasury positions across entities
- **Intercompany Loans**: Track and eliminate intercompany loans
- **Group Liquidity**: Calculate group-wide liquidity positions

## Cash Flow Forecasting Methods

### Statistical Method
Uses historical transaction patterns to forecast future cash flows:
1. Analyze historical transactions by category
2. Calculate average inflows and outflows
3. Project future periods based on historical averages
4. Adjust for seasonality and trends

### Direct Method
Forecasts cash flows from operating activities:
- Cash receipts from customers
- Cash payments to suppliers
- Cash payments for operating expenses
- Cash payments for interest and taxes

### Indirect Method
Starts with net income and adjusts for non-cash items:
- Net income
- Add back depreciation and amortization
- Adjust for changes in working capital
- Adjust for investing and financing activities

## Loan Payment Schedule Calculation

The system automatically generates amortization schedules:

```
Payment Amount = P × [r(1 + r)^n] / [(1 + r)^n - 1]

Where:
P = Principal amount
r = Periodic interest rate (annual rate / periods per year)
n = Total number of payments
```

For each payment:
- Interest Amount = Outstanding Balance × Periodic Interest Rate
- Principal Amount = Payment Amount - Interest Amount
- Remaining Balance = Outstanding Balance - Principal Amount

## Treasury Metrics

### Liquidity Metrics
- **Total Cash**: Sum of all cash account balances
- **Total Liquidity**: Cash + liquid investments (money market, short-term bonds)
- **Quick Ratio**: Liquid assets / current liabilities
- **Cash Conversion Cycle**: Days to convert investments to cash

### Debt Metrics
- **Total Debt**: Sum of all loans payable
- **Net Debt**: Total debt - cash and cash equivalents
- **Debt-to-Equity Ratio**: Total debt / total equity
- **Interest Coverage Ratio**: EBIT / interest expense

### Investment Metrics
- **Portfolio Value**: Total current value of all investments
- **Yield**: Weighted average yield across portfolio
- **Duration**: Weighted average time to maturity
- **Return on Investment**: (Current Value - Principal) / Principal

## Testing

Run the comprehensive test suite:

```bash
npm run build
node dist/tests/treasury.test.js
```

The test suite covers:
1. Cash account creation and management
2. Cash transaction recording and tracking
3. Investment portfolio management
4. Loan creation and payment tracking
5. Cash flow forecast generation
6. Treasury position reporting

## Requirements Validation

### Requirement 10.4: Treasury positions managed with cash, investments, and loans tracking
✅ **Implemented**
- Cash account management with multi-bank support
- Investment portfolio tracking with multiple asset types
- Loan management for both borrowed and lent loans
- Comprehensive treasury position reporting
- Real-time balance tracking and updates

### Requirement 10.6: Cash flow forecasting
✅ **Implemented**
- Multiple forecasting methods (statistical, direct, indirect)
- Historical data analysis for forecast generation
- Forecast accuracy tracking
- Scenario planning support
- Forecast publication and approval workflow

## Future Enhancements

1. **Advanced Forecasting**: Machine learning models for more accurate forecasts
2. **Risk Management**: VaR (Value at Risk) calculations for investment portfolio
3. **Hedging Strategies**: Track hedging instruments and effectiveness
4. **Bank Integration**: Direct bank feed integration for automatic transaction import
5. **Payment Automation**: Automated loan payment processing
6. **Investment Analytics**: Portfolio optimization and rebalancing recommendations
7. **Cash Pooling**: Multi-entity cash pooling and netting
8. **Treasury Dashboards**: Real-time treasury dashboards with KPIs

## Architecture Notes

- **Monolithic Design**: Follows the existing NexaERP monolithic architecture
- **TypeScript**: Fully typed service and controller layers
- **Prisma ORM**: Database access through Prisma with PostgreSQL
- **RESTful API**: Standard REST endpoints for all operations
- **Transaction Safety**: Uses Prisma transactions for data consistency

## Performance Considerations

- **Indexed Queries**: Database indexes on frequently queried fields
- **Batch Processing**: Efficient handling of multiple transactions
- **Lazy Loading**: Related data loaded only when needed
- **Caching**: Consider implementing caching for frequently accessed positions

## Security

- **Authentication**: All routes protected with authentication middleware
- **Authorization**: Role-based access control (to be implemented)
- **Audit Trail**: All operations logged with user and timestamp
- **Data Isolation**: Multi-tenant support (if needed)
- **Sensitive Data**: Encryption for sensitive financial data

## Compliance

- **GAAP/IFRS**: Supports standard treasury accounting principles
- **Audit Trail**: Complete history of all treasury activities
- **Approval Workflow**: Multi-level approval for large transactions
- **Documentation**: Comprehensive documentation of treasury operations
- **Regulatory Reporting**: Support for regulatory treasury reports
