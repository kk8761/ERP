# Multi-Currency Support Implementation

## Overview

The Multi-Currency Support module provides comprehensive multi-currency capabilities for global operations, including currency management, exchange rate management, automatic currency conversion, and currency gains/losses calculation.

## Features Implemented

### 1. Currency Management
- **Currency Entity Model**: ISO 4217 currency codes with full metadata
- **Base Currency**: Designate one currency as the base/functional currency
- **Currency Attributes**: Code, name, symbol, decimal places
- **Active/Inactive Status**: Enable or disable currencies
- **Multiple Currencies**: Support for unlimited currencies

### 2. Exchange Rate Management
- **Rate Storage**: Store exchange rates with effective dates
- **Historical Rates**: Maintain complete history of exchange rate changes
- **Rate Sources**: Track whether rates are manual, API-sourced, or system-generated
- **Expiry Dates**: Optional expiry dates for temporary rates
- **Bidirectional Rates**: Store rates in both directions (USD→EUR and EUR→USD)
- **Rate Lookup**: Find the most recent applicable rate for any date

### 3. Currency Conversion
- **Automatic Conversion**: Convert amounts between any two currencies
- **Date-Specific Conversion**: Use exchange rates valid for specific dates
- **Base Currency Conversion**: Convert to/from base currency
- **Same Currency Handling**: Optimize for same-currency conversions (rate = 1)

### 4. Currency Gains/Losses
- **Realized Gains/Losses**: Calculate gains/losses when transactions are settled
- **Unrealized Gains/Losses**: Calculate gains/losses from revaluation
- **Transaction Tracking**: Link gains/losses to original transactions
- **GL Integration**: Track GL accounts for posting gains/losses
- **Fiscal Period Tracking**: Organize gains/losses by fiscal period
- **Reporting**: Generate gains/losses reports by period, currency, or type

### 5. Foreign Currency Revaluation
- **Automatic Revaluation**: Revalue all foreign currency account balances
- **Period-End Processing**: Run revaluation at period-end
- **Unrealized Gain/Loss Calculation**: Calculate unrealized gains/losses
- **Account-Level Tracking**: Track revaluation by account

## Database Schema

### Currency Model
```typescript
{
  id: UUID
  code: string (unique, ISO 4217)
  name: string
  symbol: string
  decimalPlaces: number (default: 2)
  isActive: boolean
  isBaseCurrency: boolean (only one can be true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### ExchangeRate Model
```typescript
{
  id: UUID
  fromCurrencyId: UUID
  toCurrencyId: UUID
  rate: number
  effectiveDate: Date
  expiryDate: Date (optional)
  source: string (manual, api, system)
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### CurrencyGainLoss Model
```typescript
{
  id: UUID
  transactionType: string (invoice, payment, revaluation)
  transactionId: string
  currencyId: UUID
  originalAmount: number
  originalRate: number
  settlementAmount: number (optional)
  settlementRate: number (optional)
  gainLossAmount: number
  gainLossType: string (realized, unrealized)
  transactionDate: DateTime
  settlementDate: DateTime (optional)
  glAccountId: string (optional)
  journalEntryId: string (optional)
  fiscalPeriod: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

## API Endpoints

### Currency Management
- `POST /api/multi-currency/api/currencies` - Create currency
- `GET /api/multi-currency/api/currencies` - List all currencies
- `GET /api/multi-currency/api/currencies/base` - Get base currency
- `GET /api/multi-currency/api/currencies/:code` - Get currency by code
- `PUT /api/multi-currency/api/currencies/:id` - Update currency
- `DELETE /api/multi-currency/api/currencies/:id` - Deactivate currency

### Exchange Rate Management
- `POST /api/multi-currency/api/exchange-rates` - Set exchange rate
- `GET /api/multi-currency/api/exchange-rates` - Get latest rates for all pairs
- `GET /api/multi-currency/api/exchange-rates/:fromCurrency/:toCurrency` - Get rate for specific pair
- `GET /api/multi-currency/api/exchange-rates/:fromCurrency/:toCurrency/history` - Get rate history
- `DELETE /api/multi-currency/api/exchange-rates/:id` - Deactivate exchange rate

### Currency Conversion
- `POST /api/multi-currency/api/convert` - Convert amount between currencies
- `POST /api/multi-currency/api/convert/to-base` - Convert to base currency

### Currency Gains/Losses
- `POST /api/multi-currency/api/gains-losses` - Record currency gain/loss
- `GET /api/multi-currency/api/gains-losses` - Get gains/losses with filters
- `GET /api/multi-currency/api/gains-losses/:fiscalPeriod/total` - Calculate total for period
- `POST /api/multi-currency/api/revalue` - Revalue foreign currency balances

### UI Pages
- `GET /api/multi-currency/currencies` - Currency management page
- `GET /api/multi-currency/exchange-rates` - Exchange rate management page
- `GET /api/multi-currency/gains-losses` - Gains/losses reporting page

## Usage Examples

### 1. Set Up Currencies

```typescript
// Create base currency
const usd = await createCurrency({
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  decimalPlaces: 2,
  isBaseCurrency: true,
});

// Create additional currencies
const eur = await createCurrency({
  code: 'EUR',
  name: 'Euro',
  symbol: '€',
  decimalPlaces: 2,
});

const gbp = await createCurrency({
  code: 'GBP',
  name: 'British Pound',
  symbol: '£',
  decimalPlaces: 2,
});
```

### 2. Set Exchange Rates

```typescript
// Set USD to EUR rate
await setExchangeRate({
  fromCurrencyCode: 'USD',
  toCurrencyCode: 'EUR',
  rate: 0.85,
  effectiveDate: new Date('2024-01-01'),
  source: 'manual',
});

// Set EUR to USD rate (reverse)
await setExchangeRate({
  fromCurrencyCode: 'EUR',
  toCurrencyCode: 'USD',
  rate: 1.18,
  effectiveDate: new Date('2024-01-01'),
  source: 'manual',
});
```

### 3. Convert Currency

```typescript
// Convert 1000 USD to EUR
const eurAmount = await convertCurrency(
  1000,
  'USD',
  'EUR',
  new Date('2024-01-15')
);
// Result: 850 EUR (1000 * 0.85)

// Convert to base currency
const baseAmount = await convertToBaseCurrency(
  1000,
  'EUR',
  new Date('2024-01-15')
);
// Result: 1180 USD (1000 * 1.18)
```

### 4. Record Currency Gain/Loss

```typescript
// Realized gain/loss (invoice paid)
const gainLoss = await recordCurrencyGainLoss({
  transactionType: 'invoice',
  transactionId: 'INV-001',
  currencyCode: 'EUR',
  originalAmount: 1000,
  originalRate: 1.10, // Rate at invoice date
  settlementAmount: 1000,
  settlementRate: 1.15, // Rate at payment date
  transactionDate: new Date('2024-01-01'),
  settlementDate: new Date('2024-02-01'),
  fiscalPeriod: '2024-01',
  glAccountId: 'ACC-FX-GAIN',
});
// Result: Realized gain of 50 USD ((1000 * 1.15) - (1000 * 1.10))
```

### 5. Revalue Foreign Currency Balances

```typescript
// Revalue all foreign currency accounts at period-end
const revaluation = await revalueForeignCurrencyBalances(
  new Date('2024-01-31'),
  '2024-01'
);

console.log(`Revalued ${revaluation.accountsRevalued} accounts`);
console.log(`Total unrealized gain/loss: ${revaluation.totalGainLoss}`);
```

## Integration with Other Modules

### Accounting Module
- **Journal Entries**: Multi-currency journal entries with automatic conversion
- **Accounts**: Accounts can have different currencies
- **Financial Statements**: Consolidated statements in base currency

### Accounts Receivable
- **Invoices**: Create invoices in customer's currency
- **Payments**: Record payments in any currency
- **Realized Gains/Losses**: Automatic calculation when payment differs from invoice rate

### Accounts Payable
- **Vendor Invoices**: Record invoices in vendor's currency
- **Payments**: Pay in any currency
- **Realized Gains/Losses**: Automatic calculation on payment

### Financial Consolidation
- **Multi-Entity**: Each entity can have its own functional currency
- **Consolidation**: Automatic conversion to parent company's currency
- **Elimination Entries**: Handle multi-currency intercompany transactions

### Treasury Management
- **Cash Accounts**: Track cash in multiple currencies
- **FX Exposure**: Calculate foreign exchange exposure
- **Hedging**: Track hedging instruments and their effectiveness

## Calculation Methods

### Realized Gain/Loss
```
Realized Gain/Loss = (Settlement Amount × Settlement Rate) - (Original Amount × Original Rate)
```

Example:
- Invoice: 1000 EUR at rate 1.10 = 1100 USD
- Payment: 1000 EUR at rate 1.15 = 1150 USD
- Realized Gain: 1150 - 1100 = 50 USD

### Unrealized Gain/Loss (Revaluation)
```
Unrealized Gain/Loss = (Current Amount × Current Rate) - (Original Amount × Original Rate)
```

Example:
- Account Balance: 10000 EUR at original rate 1.10 = 11000 USD
- Current Rate: 1.12
- Current Value: 10000 EUR × 1.12 = 11200 USD
- Unrealized Gain: 11200 - 11000 = 200 USD

## Best Practices

### 1. Exchange Rate Management
- **Update Regularly**: Update exchange rates daily or as needed
- **Use API Sources**: Consider integrating with exchange rate APIs for automatic updates
- **Historical Accuracy**: Never delete or modify historical rates
- **Bidirectional Rates**: Always maintain rates in both directions

### 2. Base Currency Selection
- **Stability**: Choose a stable currency as base (typically reporting currency)
- **Consistency**: Never change base currency after going live
- **Single Base**: Only one currency should be marked as base

### 3. Gains/Losses
- **Timely Recording**: Record realized gains/losses when transactions settle
- **Period-End Revaluation**: Run revaluation at each period-end
- **GL Accounts**: Set up dedicated GL accounts for FX gains and losses
- **Separate Realized/Unrealized**: Keep realized and unrealized gains/losses separate

### 4. Reporting
- **Base Currency Reports**: Always show consolidated reports in base currency
- **Original Currency**: Show transaction details in original currency
- **Dual Display**: Consider showing both original and base currency amounts

### 5. Performance
- **Index Optimization**: Ensure proper indexes on currency and exchange rate tables
- **Caching**: Cache frequently used exchange rates
- **Batch Processing**: Process revaluations in batches for large datasets

## Testing

### Unit Tests
Run the comprehensive test suite:

```bash
npm run test -- multi-currency.test.ts
```

The test suite covers:
1. Currency creation and management
2. Base currency handling
3. Exchange rate management
4. Currency conversion
5. Realized gains/losses
6. Unrealized gains/losses
7. Foreign currency revaluation
8. Integration scenarios

### Manual Testing Checklist

- [ ] Create currencies (USD, EUR, GBP)
- [ ] Set USD as base currency
- [ ] Add exchange rates for all pairs
- [ ] Convert 1000 USD to EUR
- [ ] Create invoice in EUR
- [ ] Record payment in USD
- [ ] Verify realized gain/loss calculation
- [ ] Create account with EUR balance
- [ ] Run period-end revaluation
- [ ] Verify unrealized gain/loss calculation
- [ ] Generate gains/losses report

## Requirements Validation

### Requirement 10.3: Multi-currency transactions with exchange rates
✅ **Implemented**
- Currency management with ISO 4217 codes
- Exchange rate management with historical tracking
- Automatic currency conversion
- Date-specific exchange rates
- Bidirectional rate storage

### Requirement 18.7: Real-time exchange rates for currency conversion
✅ **Implemented**
- Exchange rate lookup by date
- Latest rate retrieval
- Support for API-sourced rates (infrastructure ready)
- Automatic rate application in conversions
- Rate history tracking

### Additional Features Implemented
✅ Currency gains/losses calculation (realized and unrealized)
✅ Foreign currency revaluation
✅ Integration with accounting module
✅ Fiscal period tracking
✅ GL account linking
✅ Comprehensive reporting

## Future Enhancements

1. **Exchange Rate API Integration**
   - Integrate with external APIs (e.g., Open Exchange Rates, Fixer.io)
   - Automatic daily rate updates
   - Multiple rate sources with fallback

2. **Advanced Hedging**
   - Forward contracts
   - Currency options
   - Hedge accounting
   - Effectiveness testing

3. **Multi-Currency Budgeting**
   - Budgets in multiple currencies
   - Budget vs actual with FX variance
   - Budget rate vs actual rate analysis

4. **Enhanced Reporting**
   - FX exposure reports
   - Currency position reports
   - Sensitivity analysis
   - What-if scenarios

5. **Workflow Automation**
   - Automatic revaluation scheduling
   - Rate update notifications
   - Threshold-based alerts
   - Approval workflows for manual rates

6. **Mobile Support**
   - Currency converter mobile app
   - Rate notifications
   - Quick conversions

## Architecture Notes

- **Monolithic Design**: Follows NexaERP monolithic architecture
- **TypeScript**: Fully typed service and controller layers
- **Prisma ORM**: Database access through Prisma with PostgreSQL
- **RESTful API**: Standard REST endpoints for all operations
- **Transaction Safety**: Uses Prisma transactions for data consistency
- **Audit Trail**: All operations logged with user and timestamp

## Performance Considerations

- **Indexed Queries**: Database indexes on frequently queried fields
- **Rate Caching**: Consider caching frequently used rates
- **Batch Revaluation**: Efficient handling of large account sets
- **Lazy Loading**: Related data loaded only when needed

## Security

- **Authentication**: All routes protected with authentication middleware
- **Authorization**: Role-based access control (RBAC integration)
- **Audit Trail**: All operations logged with user and timestamp
- **Data Validation**: Input validation on all endpoints
- **Rate Integrity**: Historical rates cannot be deleted

## Compliance

- **GAAP/IFRS**: Supports standard FX accounting principles
- **Audit Trail**: Complete history of all currency operations
- **Segregation of Duties**: Separate rate entry from approval
- **Documentation**: Comprehensive documentation of all processes

## Support

For questions or issues related to multi-currency support:
1. Check this documentation
2. Review the test suite for usage examples
3. Check the API documentation
4. Contact the development team

