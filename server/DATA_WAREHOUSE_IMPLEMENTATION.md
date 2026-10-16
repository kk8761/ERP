# Data Warehouse and Analytics Implementation

## Overview

This document describes the implementation of Task 29: Data Warehouse and Analytics for the NexaERP system. The implementation provides enterprise-grade business intelligence capabilities including:

- **Data Warehouse Infrastructure** with dimensional modeling (star schema)
- **ETL Pipeline** for automated data extraction, transformation, and loading
- **BI Dashboard Framework** with drag-and-drop widgets
- **KPI Tracking** with actual vs target comparison and trend analysis
- **Report Builder** with parameterized templates and scheduling
- **Report Export** to PDF, Excel, CSV, and Word formats

## Architecture

### Data Warehouse Design

The data warehouse follows a **star schema** design with:

#### Dimension Tables (SCD Type 2)
- **DimDate**: Date dimension with fiscal calendar support
- **DimProduct**: Product dimension with category hierarchy
- **DimCustomer**: Customer dimension with segmentation
- **DimSupplier**: Supplier dimension with ratings
- **DimWarehouse**: Warehouse dimension with location data
- **DimEmployee**: Employee dimension with department hierarchy

#### Fact Tables
- **FactSales**: Sales transactions with revenue and profit metrics
- **FactInventory**: Daily inventory snapshots with stock status
- **FactPurchase**: Purchase transactions with supplier data
- **FactProduction**: Production orders with efficiency metrics
- **FactFinancial**: Financial transactions with GL account data
- **FactHR**: HR events (hires, promotions, reviews)

### ETL Pipeline

The ETL service (`etl.service.ts`) provides:

1. **Dimension Loading**
   - Slowly Changing Dimensions (SCD Type 2) support
   - Automatic change detection and versioning
   - Effective date tracking

2. **Fact Loading**
   - Incremental loading (daily)
   - Full historical loading (initial setup)
   - Data quality validation

3. **Job Tracking**
   - ETL job execution logs
   - Success/failure tracking
   - Performance metrics

### Analytics Service

The analytics service (`analytics.service.ts`) provides:

1. **KPI Calculations**
   - Sales KPIs (revenue, profit margin, growth)
   - Inventory KPIs (turnover, stock-out rate)
   - Financial KPIs (net income, ROA)

2. **Dashboard Data**
   - Real-time widget data
   - Customizable layouts
   - Multiple visualization types

3. **Analytics Queries**
   - Sales trends
   - Top products
   - Customer segmentation

### Report Service

The report service (`report.service.ts`) provides:

1. **Report Templates**
   - Parameterized SQL queries
   - Column definitions with types
   - Filters, sorting, and grouping

2. **Report Execution**
   - Dynamic parameter substitution
   - Filter application
   - Grouping and aggregation

3. **Export Formats**
   - **Excel**: Full formatting with column widths
   - **CSV**: Simple comma-separated values
   - **PDF**: Custom layouts with headers/footers
   - **Word**: (Future enhancement)

4. **Scheduled Reports**
   - Cron-based scheduling
   - Email delivery
   - Multiple recipients

5. **Secure Links**
   - Time-limited access
   - Token-based authentication

## Database Schema

### Dimension Tables

```sql
-- Date Dimension
CREATE TABLE "DimDate" (
  "dateKey" VARCHAR(8) PRIMARY KEY,
  "fullDate" DATE,
  "year" INTEGER,
  "quarter" INTEGER,
  "month" INTEGER,
  "monthName" VARCHAR(20),
  "week" INTEGER,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "dayName" VARCHAR(20),
  "isWeekend" BOOLEAN,
  "isHoliday" BOOLEAN,
  "fiscalYear" INTEGER,
  "fiscalQuarter" INTEGER,
  "fiscalPeriod" VARCHAR(20)
);

-- Product Dimension (SCD Type 2)
CREATE TABLE "DimProduct" (
  "productKey" UUID PRIMARY KEY,
  "productId" VARCHAR(100),
  "productName" VARCHAR(255),
  "sku" VARCHAR(100),
  "category" VARCHAR(255),
  "categoryHierarchy" VARCHAR(500),
  "brand" VARCHAR(100),
  "unit" VARCHAR(20),
  "trackingType" VARCHAR(20),
  "isActive" BOOLEAN,
  "effectiveDate" TIMESTAMP,
  "expiryDate" TIMESTAMP
);
```

### Fact Tables

```sql
-- Sales Fact
CREATE TABLE "FactSales" (
  "salesKey" UUID PRIMARY KEY,
  "dateKey" VARCHAR(8) REFERENCES "DimDate"("dateKey"),
  "productKey" UUID REFERENCES "DimProduct"("productKey"),
  "customerKey" UUID REFERENCES "DimCustomer"("customerKey"),
  "warehouseKey" UUID REFERENCES "DimWarehouse"("warehouseKey"),
  "employeeKey" UUID REFERENCES "DimEmployee"("employeeKey"),
  "orderId" VARCHAR(100),
  "orderNumber" VARCHAR(100),
  "quantity" FLOAT,
  "unitPrice" FLOAT,
  "discount" FLOAT,
  "taxAmount" FLOAT,
  "totalAmount" FLOAT,
  "costAmount" FLOAT,
  "profitAmount" FLOAT,
  "profitMargin" FLOAT,
  "paymentMode" VARCHAR(50),
  "orderStatus" VARCHAR(50),
  "createdAt" TIMESTAMP
);
```

## API Endpoints

### Report Templates

```
POST   /api/bi/templates                    Create report template
GET    /api/bi/templates                    List report templates
POST   /api/bi/reports/:id/execute          Execute report
```

### Report Export

```
POST   /api/bi/reports/:id/export/excel     Export to Excel
POST   /api/bi/reports/:id/export/csv       Export to CSV
POST   /api/bi/reports/:id/export/pdf       Export to PDF
```

### Scheduled Reports

```
POST   /api/bi/scheduled-reports            Schedule report
GET    /api/bi/scheduled-reports            List scheduled reports
POST   /api/bi/reports/:id/secure-link      Generate secure link
```

### KPIs

```
GET    /api/bi/kpis/sales                   Get sales KPIs
GET    /api/bi/kpis/inventory               Get inventory KPIs
GET    /api/bi/kpis/financial               Get financial KPIs
POST   /api/bi/kpis/definitions             Create KPI definition
GET    /api/bi/kpis/definitions             List KPI definitions
GET    /api/bi/kpis/:kpiId/values           Get KPI values
```

### Dashboards

```
GET    /api/bi/dashboard                    Get dashboard data
POST   /api/bi/dashboard/widgets            Create widget
PUT    /api/bi/dashboard/widgets/:id        Update widget
DELETE /api/bi/dashboard/widgets/:id        Delete widget
```

### Analytics

```
GET    /api/bi/analytics/sales-trend        Get sales trend
GET    /api/bi/analytics/top-products       Get top products
GET    /api/bi/analytics/customer-segmentation  Get customer segments
```

### ETL Management

```
POST   /api/bi/etl/full                     Run full ETL
POST   /api/bi/etl/incremental              Run incremental ETL
GET    /api/bi/etl/jobs                     List ETL jobs
GET    /api/bi/etl/jobs/:jobId/logs         Get ETL job logs
```

## Setup Instructions

### 1. Database Migration

Run Prisma migration to create data warehouse tables:

```bash
cd server
npm run prisma:push
```

### 2. Install Dependencies

Install required packages:

```bash
npm install xlsx date-fns
```

### 3. Initialize Data Warehouse

Run the setup script to initialize dimensions and load initial data:

```bash
npm run setup:warehouse
```

This script will:
- Generate date dimensions for 3 years
- Load product, customer, warehouse, and employee dimensions
- Load sales and inventory facts for the last 90 days
- Create default KPI definitions
- Create sample report templates

### 4. Verify Setup

Check that the data warehouse is populated:

```sql
-- Check dimension counts
SELECT 'DimDate' as table, COUNT(*) as count FROM "DimDate"
UNION ALL
SELECT 'DimProduct', COUNT(*) FROM "DimProduct"
UNION ALL
SELECT 'DimCustomer', COUNT(*) FROM "DimCustomer"
UNION ALL
SELECT 'DimWarehouse', COUNT(*) FROM "DimWarehouse"
UNION ALL
SELECT 'DimEmployee', COUNT(*) FROM "DimEmployee";

-- Check fact counts
SELECT 'FactSales' as table, COUNT(*) as count FROM "FactSales"
UNION ALL
SELECT 'FactInventory', COUNT(*) FROM "FactInventory";
```

## Automated Scheduling

The analytics scheduler runs automatically:

### ETL Jobs
- **Schedule**: Daily at 2:00 AM
- **Type**: Incremental ETL
- **Actions**:
  - Update dimensions (new/changed records)
  - Load yesterday's sales facts
  - Create today's inventory snapshot

### KPI Calculations
- **Schedule**: Daily at 3:00 AM
- **Actions**:
  - Calculate all active KPIs
  - Store values with actual vs target comparison
  - Determine status (good/warning/critical)

### Scheduled Reports
- **Schedule**: Hourly check
- **Actions**:
  - Check for due reports
  - Generate reports in specified format
  - Send to recipients via email

## Usage Examples

### Creating a Report Template

```typescript
POST /api/bi/templates
{
  "name": "Monthly Sales Report",
  "module": "sales",
  "sqlQuery": "SELECT d.fullDate, p.productName, SUM(f.totalAmount) as revenue FROM FactSales f JOIN DimDate d ON f.dateKey = d.dateKey JOIN DimProduct p ON f.productKey = p.productKey WHERE d.dateKey >= '{{startDate}}' AND d.dateKey <= '{{endDate}}' GROUP BY d.fullDate, p.productName ORDER BY d.fullDate DESC",
  "columns": [
    { "field": "fullDate", "header": "Date", "type": "date", "width": 15 },
    { "field": "productName", "header": "Product", "type": "string", "width": 30 },
    { "field": "revenue", "header": "Revenue", "type": "currency", "width": 15 }
  ]
}
```

### Executing a Report

```typescript
POST /api/bi/reports/:id/execute
{
  "parameters": {
    "startDate": "20240101",
    "endDate": "20240131"
  },
  "filters": [
    { "field": "revenue", "operator": "greater_than", "value": 1000 }
  ],
  "sorting": [
    { "field": "revenue", "direction": "desc" }
  ]
}
```

### Exporting to PDF

```typescript
POST /api/bi/reports/:id/export/pdf
{
  "parameters": {
    "startDate": "20240101",
    "endDate": "20240131"
  },
  "customLayout": {
    "title": "Monthly Sales Report - January 2024",
    "orientation": "landscape",
    "pageSize": "A4",
    "includeHeader": true,
    "includeFooter": true
  }
}
```

### Scheduling a Report

```typescript
POST /api/bi/scheduled-reports
{
  "reportTemplateId": "uuid",
  "name": "Weekly Sales Report",
  "schedule": "0 9 * * 1",  // Every Monday at 9:00 AM
  "recipients": ["manager@company.com", "ceo@company.com"],
  "format": "pdf",
  "parameters": {
    "startDate": "{{lastWeekStart}}",
    "endDate": "{{lastWeekEnd}}"
  }
}
```

### Creating a Dashboard Widget

```typescript
POST /api/bi/dashboard/widgets
{
  "title": "Monthly Sales KPIs",
  "type": "metric",
  "dataSource": "sales_kpis_monthly",
  "positionX": 0,
  "positionY": 0,
  "width": 4,
  "height": 2
}
```

### Getting Sales Trend

```typescript
GET /api/bi/analytics/sales-trend?startDate=2024-01-01&endDate=2024-01-31&groupBy=day

Response:
{
  "success": true,
  "trend": [
    {
      "period": "20240101",
      "revenue": 15000,
      "profit": 3000,
      "orders": 45,
      "avgOrderValue": 333.33
    },
    ...
  ]
}
```

## Performance Considerations

### Indexing

The data warehouse includes indexes on:
- All foreign keys (dimension keys in fact tables)
- Date keys for time-based queries
- Frequently filtered columns (status, category, etc.)

### Query Optimization

- Use date key ranges instead of date comparisons
- Pre-aggregate data in fact tables
- Use materialized views for complex calculations (future enhancement)

### ETL Performance

- Batch inserts for large datasets
- Parallel dimension loading
- Incremental loading to minimize data transfer

## Security

### Access Control

All endpoints require appropriate permissions:
- `read:report` - View and execute reports
- `create:report_template` - Create report templates
- `execute:etl` - Run ETL jobs
- `read:kpi` - View KPIs
- `create:kpi` - Create KPI definitions
- `read:dashboard` - View dashboards
- `create:dashboard` - Create/modify dashboards

### Data Security

- SQL injection prevention through parameterized queries
- Audit logging for all report executions
- Secure report links with expiration
- Row-level security (future enhancement)

## Monitoring

### ETL Job Monitoring

Monitor ETL jobs through:
- `GET /api/bi/etl/jobs` - View job history
- `GET /api/bi/etl/jobs/:jobId/logs` - View detailed logs
- Database table: `ETLJob` and `ETLJobLog`

### Data Quality

Track data quality metrics:
- Completeness: Percentage of non-null values
- Accuracy: Data validation rules
- Consistency: Cross-table validation
- Timeliness: ETL job completion time

## Troubleshooting

### ETL Job Failures

Check ETL job logs:
```sql
SELECT * FROM "ETLJob" WHERE status = 'failed' ORDER BY "startTime" DESC LIMIT 10;
SELECT * FROM "ETLJobLog" WHERE "jobId" = 'failed-job-id' ORDER BY timestamp DESC;
```

### Missing Data

Verify dimension loading:
```sql
-- Check for products without dimension records
SELECT p.id, p.name 
FROM "Product" p 
LEFT JOIN "DimProduct" dp ON p.id = dp."productId" AND dp."expiryDate" IS NULL
WHERE dp."productKey" IS NULL;
```

### Performance Issues

Analyze slow queries:
```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE nexaerp SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

## Future Enhancements

1. **Real-time Analytics**
   - Stream processing for real-time KPIs
   - WebSocket updates for dashboards

2. **Advanced Analytics**
   - Machine learning integration
   - Predictive analytics
   - Anomaly detection

3. **Data Governance**
   - Data lineage tracking
   - Data catalog
   - Metadata management

4. **Performance Optimization**
   - Materialized views
   - Columnar storage
   - Query caching

5. **Additional Export Formats**
   - Word documents
   - PowerPoint presentations
   - Interactive HTML reports

## Support

For issues or questions:
- Check the ETL job logs
- Review the API documentation
- Contact the development team

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Star Schema Design](https://en.wikipedia.org/wiki/Star_schema)
- [Slowly Changing Dimensions](https://en.wikipedia.org/wiki/Slowly_changing_dimension)
- [ETL Best Practices](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/)
