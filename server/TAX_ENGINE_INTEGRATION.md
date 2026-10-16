# Tax Engine Integration

## Overview

The Tax Engine Integration module provides automated tax calculation for transactions using external tax engines (Avalara, Vertex) or internal tax rules. This implementation supports global tax types including VAT, GST, and sales tax.

**Requirements Implemented:**
- Requirement 10.6: THE System SHALL integrate with tax engines for automated tax calculation
- Requirement 18.2: WHEN taxes are calculated, THE System SHALL integrate with global tax engines
- Requirement 18.4: THE System SHALL support VAT, GST, sales tax, and other tax types

## Features

### 1. Multi-Provider Support
- **Avalara**: Industry-leading tax calculation engine with global coverage
- **Vertex**: Enterprise tax solution for complex tax scenarios
- **Internal**: Fallback calculation using database-stored tax rules

### 2. Tax Types Supported
- **VAT** (Value Added Tax): European and international VAT
- **GST** (Goods and Services Tax): India, Australia, Canada, etc.
- **Sales Tax**: US state and local sales tax
- **Excise Tax**: Special taxes on specific goods
- **Customs Duty**: Import/export taxes
- **Other**: Extensible for additional tax types

### 3. Key Capabilities
- Automatic tax calculation for invoices, orders, and quotes
- Real-time integration with external tax engines
- Fallback to internal calculation if external service unavailable
- Tax calculation audit trail
- Support for tax exemptions
- Configurable tax rules by jurisdiction
- Multi-currency support

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   Tax Engine Service                     │
├─────────────────────────────────────────────────────────┤
│  - Tax Calculation Logic                                │
│  - Provider Routing (Avalara/Vertex/Internal)           │
│  - Request Validation                                   │
│  - Response Transformation                              │
│  - Audit Trail Management                               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Avalara    │  │    Vertex    │  │   Internal   │
│   Provider   │  │   Provider   │  │   Provider   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Database Models

#### TaxRule
Stores internal tax calculation rules:
- Geographic scope (country, state, city, postal code)
- Tax type and rate
- Effective dates
- Priority for rule application

#### TaxCalculation
Audit trail for all tax calculations:
- Transaction reference
- Tax engine provider used
- Calculation results
- Request/response data
- Geographic information

#### TaxConfiguration
Stores tax engine configuration:
- Provider settings
- API credentials (encrypted)
- Feature flags

#### TaxExemption
Manages tax-exempt entities:
- Customer/product exemptions
- Certificate tracking
- Validity periods

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Tax Engine Configuration
TAX_ENGINE_ENABLED=true
TAX_ENGINE_PROVIDER=internal  # avalara, vertex, or internal
TAX_ENGINE_TEST_MODE=true

# Avalara Configuration (if using Avalara)
TAX_ENGINE_API_KEY=your_avalara_api_key
TAX_ENGINE_API_URL=https://rest.avatax.com/api/v2
TAX_ENGINE_ACCOUNT_ID=your_avalara_account_id
TAX_ENGINE_COMPANY_CODE=your_company_code

# Vertex Configuration (if using Vertex)
# TAX_ENGINE_API_KEY=your_vertex_api_key
# TAX_ENGINE_API_URL=https://api.vertexsmb.com/vertex-ws/services/CalculateTax70
# TAX_ENGINE_COMPANY_CODE=your_company_code

# Company Address (for tax calculation)
COMPANY_ADDRESS_LINE1=456 Company Ave
COMPANY_CITY=Seattle
COMPANY_STATE=WA
COMPANY_POSTAL_CODE=98101
COMPANY_COUNTRY=US
```

### Database Migration

Run Prisma migration to create tax-related tables:

```bash
cd server
npx prisma db push
npx prisma generate
```

## API Endpoints

### Tax Calculation

#### Calculate Tax
```http
POST /api/tax/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionType": "invoice",
  "customerAddress": {
    "line1": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "country": "US"
  },
  "sellerAddress": {
    "line1": "456 Seller Ave",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "country": "US"
  },
  "lineItems": [
    {
      "description": "Product A",
      "quantity": 2,
      "amount": 100.00,
      "taxCode": "P0000000"
    }
  ],
  "currency": "USD"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "totalTax": 10.00,
    "taxableAmount": 100.00,
    "exemptAmount": 0,
    "taxDate": "2024-01-15T10:30:00Z",
    "taxEngineProvider": "internal",
    "taxByType": [
      {
        "taxType": "sales_tax",
        "taxName": "WA State Sales Tax",
        "rate": 10.0,
        "taxableAmount": 100.00,
        "taxAmount": 10.00,
        "jurisdiction": "Washington State"
      }
    ],
    "lineItemTaxes": [
      {
        "lineNumber": 1,
        "taxAmount": 10.00,
        "taxBreakdown": [...]
      }
    ]
  }
}
```

#### Calculate Tax for Invoice
```http
POST /api/tax/calculate-invoice/:invoiceId
Authorization: Bearer <token>
Content-Type: application/json

{
  "updateInvoice": true
}
```

#### Get Tax Calculation History
```http
GET /api/tax/history/:transactionId
Authorization: Bearer <token>
```

### Tax Configuration

#### Get Configuration
```http
GET /api/tax/config
Authorization: Bearer <token>
```

#### Update Configuration
```http
PUT /api/tax/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "avalara",
  "enabled": true,
  "testMode": false
}
```

#### Test Connection
```http
POST /api/tax/test-connection
Authorization: Bearer <token>
```

### Tax Rules

#### Create Tax Rule
```http
POST /api/tax/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "WA State Sales Tax",
  "country": "US",
  "state": "WA",
  "taxType": "sales_tax",
  "rate": 10.0,
  "jurisdiction": "Washington State",
  "priority": 1,
  "effectiveFrom": "2024-01-01"
}
```

#### Get Tax Rules
```http
GET /api/tax/rules?country=US&state=WA&isActive=true
Authorization: Bearer <token>
```

#### Update Tax Rule
```http
PUT /api/tax/rules/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "rate": 10.5,
  "isActive": true
}
```

#### Delete Tax Rule
```http
DELETE /api/tax/rules/:id
Authorization: Bearer <token>
```

### Tax Exemptions

#### Create Tax Exemption
```http
POST /api/tax/exemptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "exemptionType": "customer",
  "entityId": "customer-123",
  "entityType": "customer",
  "certificateNumber": "EXEMPT-001",
  "certificateType": "Resale Certificate",
  "country": "US",
  "state": "WA",
  "taxTypes": ["sales_tax"],
  "effectiveFrom": "2024-01-01"
}
```

#### Get Tax Exemptions
```http
GET /api/tax/exemptions?entityId=customer-123&isActive=true
Authorization: Bearer <token>
```

## Usage Examples

### Example 1: Calculate Tax for US Sales

```typescript
import { taxEngineService } from './services/tax-engine.service';

const taxRequest = {
  transactionType: 'invoice',
  customerAddress: {
    line1: '123 Main St',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'US',
  },
  sellerAddress: {
    line1: '456 Seller Ave',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'US',
  },
  lineItems: [
    {
      description: 'Widget',
      quantity: 5,
      amount: 250.00,
    },
  ],
  currency: 'USD',
};

const result = await taxEngineService.calculateTax(taxRequest);
console.log(`Total tax: $${result.totalTax}`);
```

### Example 2: Calculate VAT for UK Transaction

```typescript
const taxRequest = {
  transactionType: 'invoice',
  customerAddress: {
    line1: '10 Downing Street',
    city: 'London',
    postalCode: 'SW1A 2AA',
    country: 'GB',
  },
  sellerAddress: {
    line1: '123 Business Park',
    city: 'London',
    postalCode: 'E1 6AN',
    country: 'GB',
  },
  lineItems: [
    {
      description: 'Consulting Services',
      quantity: 1,
      amount: 1000.00,
    },
  ],
  currency: 'GBP',
};

const result = await taxEngineService.calculateTax(taxRequest);
console.log(`VAT: £${result.totalTax}`);
```

### Example 3: Calculate GST for India

```typescript
const taxRequest = {
  transactionType: 'invoice',
  customerAddress: {
    line1: 'MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'IN',
  },
  sellerAddress: {
    line1: 'Tech Park',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'IN',
  },
  lineItems: [
    {
      description: 'Software License',
      quantity: 1,
      amount: 10000.00,
    },
  ],
  currency: 'INR',
};

const result = await taxEngineService.calculateTax(taxRequest);
console.log(`GST: ₹${result.totalTax}`);
```

## Testing

Run the tax engine tests:

```bash
cd server
npm test -- tax-engine.test.ts
```

## Integration with Existing Modules

### Invoice Module Integration

The tax engine automatically integrates with the invoice module. When creating or updating invoices, you can:

1. Calculate tax automatically:
```typescript
const taxResult = await taxEngineService.calculateTax({
  transactionId: invoice.id,
  transactionType: 'invoice',
  // ... addresses and line items
});

await prisma.invoice.update({
  where: { id: invoice.id },
  data: {
    taxAmount: taxResult.totalTax,
    total: invoice.subtotal + taxResult.totalTax,
  },
});
```

2. Use the dedicated endpoint:
```http
POST /api/tax/calculate-invoice/:invoiceId
```

### Order Module Integration

Similar integration available for orders:

```typescript
const taxResult = await taxEngineService.calculateTax({
  transactionId: order.id,
  transactionType: 'order',
  // ... addresses and line items
});
```

## Avalara Setup

### 1. Create Avalara Account
1. Sign up at https://www.avalara.com/
2. Get your API credentials from the Avalara portal
3. Note your Account ID and License Key

### 2. Configure Environment
```bash
TAX_ENGINE_PROVIDER=avalara
TAX_ENGINE_API_KEY=your_license_key
TAX_ENGINE_ACCOUNT_ID=your_account_id
TAX_ENGINE_COMPANY_CODE=DEFAULT
```

### 3. Test Connection
```http
POST /api/tax/test-connection
```

## Vertex Setup

### 1. Create Vertex Account
1. Sign up at https://www.vertexinc.com/
2. Get your API credentials
3. Configure your company settings

### 2. Configure Environment
```bash
TAX_ENGINE_PROVIDER=vertex
TAX_ENGINE_API_KEY=your_vertex_api_key
TAX_ENGINE_COMPANY_CODE=your_company_code
```

### 3. Test Connection
```http
POST /api/tax/test-connection
```

## Internal Tax Rules Setup

For internal tax calculation without external services:

### 1. Configure Environment
```bash
TAX_ENGINE_PROVIDER=internal
TAX_ENGINE_ENABLED=true
```

### 2. Create Tax Rules

Create tax rules for your jurisdictions:

```http
POST /api/tax/rules
Content-Type: application/json

{
  "name": "California Sales Tax",
  "country": "US",
  "state": "CA",
  "taxType": "sales_tax",
  "rate": 7.25,
  "jurisdiction": "California",
  "priority": 1,
  "effectiveFrom": "2024-01-01"
}
```

## Troubleshooting

### Tax Calculation Fails

1. Check tax engine configuration:
```http
GET /api/tax/config
```

2. Test connection:
```http
POST /api/tax/test-connection
```

3. Check logs for detailed error messages

### Incorrect Tax Amounts

1. Verify addresses are complete and accurate
2. Check tax rules are active and have correct rates
3. Review tax calculation history:
```http
GET /api/tax/history/:transactionId
```

### External Service Unavailable

The system automatically falls back to internal calculation if external services are unavailable. Check logs for fallback notifications.

## Security Considerations

1. **API Keys**: Store API keys in environment variables, never in code
2. **Encryption**: Tax configuration with sensitive data is encrypted
3. **Audit Trail**: All tax calculations are logged for compliance
4. **Access Control**: Tax endpoints require authentication and appropriate permissions

## Compliance

The tax engine integration helps maintain compliance with:
- **US Sales Tax**: State and local tax calculation
- **EU VAT**: Value Added Tax for European transactions
- **GST**: Goods and Services Tax for applicable countries
- **IFRS/GAAP**: Financial reporting standards

## Performance

- Tax calculations are cached where appropriate
- Fallback to internal calculation ensures availability
- Async processing for bulk calculations
- Database indexing for fast tax rule lookups

## Future Enhancements

Potential future improvements:
- Additional tax engine providers (TaxJar, Thomson Reuters)
- Real-time tax rate updates
- Tax filing and remittance integration
- Enhanced tax exemption certificate management
- Machine learning for tax classification

## Support

For issues or questions:
1. Check the logs in `server/error.log`
2. Review the API documentation
3. Test with the `/api/tax/test-connection` endpoint
4. Contact your tax engine provider's support

## References

- [Avalara API Documentation](https://developer.avalara.com/)
- [Vertex API Documentation](https://developer.vertexinc.com/)
- [Requirements Document](.kiro/specs/comprehensive-erp-enhancement/requirements.md)
- [Design Document](.kiro/specs/comprehensive-erp-enhancement/design.md)
