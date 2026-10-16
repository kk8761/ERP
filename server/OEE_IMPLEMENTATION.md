# OEE (Overall Equipment Effectiveness) Implementation

## Overview

This document describes the implementation of OEE (Overall Equipment Effectiveness) calculation for Task 31.5 of the comprehensive ERP enhancement project. OEE is a key manufacturing metric that measures equipment productivity by combining three factors: Availability, Performance, and Quality.

## OEE Formula

**OEE = Availability × Performance × Quality**

### Component Metrics

1. **Availability** = (Actual Production Time / Planned Production Time) × 100
   - Measures the percentage of scheduled time that the equipment is actually running
   - Accounts for downtime (breakdowns, changeovers, maintenance)

2. **Performance** = (Ideal Cycle Time × Total Units Produced / Actual Production Time) × 100
   - Measures how fast the equipment is running compared to its ideal speed
   - Accounts for speed losses and minor stoppages

3. **Quality** = (Good Units / Total Units Produced) × 100
   - Measures the percentage of units that meet quality standards
   - Accounts for defects and rework

## Implementation Details

### Models

**OEEMetrics Model** (`server/src/models/Industry40.ts`)
- Stores calculated OEE metrics for a specific time period
- Includes all component metrics (availability, performance, quality)
- Links to work center and optionally to asset
- Provides static calculation methods

### Services

**OEECalculationService** (`server/src/services/industry40.service.ts`)

Key methods:
- `calculateOEE()` - Calculate OEE from shop floor operations
- `calculateOEEWithProductionData()` - Calculate OEE with actual production data
- `getOEEMetricsByWorkCenter()` - Retrieve historical OEE metrics
- `getOEEMetricsByAsset()` - Retrieve OEE metrics for specific asset
- `getOEETrend()` - Generate trend data (daily/weekly/monthly)
- `generateOEEReport()` - Generate comprehensive OEE report
- `compareOEEAcrossWorkCenters()` - Compare OEE across multiple work centers
- `getOEEInsights()` - Generate insights and recommendations

### Controllers

**OEE Controllers** (`server/src/controllers/industry40.controller.ts`)

Endpoints:
- `POST /api/industry40/oee/calculate` - Calculate OEE metrics
- `POST /api/industry40/oee/calculate-with-data` - Calculate with production data
- `GET /api/industry40/oee/metrics/:id` - Get specific OEE metrics
- `GET /api/industry40/oee/work-centers/:workCenterId/metrics` - Get metrics by work center
- `GET /api/industry40/oee/assets/:assetId/metrics` - Get metrics by asset
- `GET /api/industry40/oee/work-centers/:workCenterId/trend` - Get trend data
- `GET /api/industry40/oee/work-centers/:workCenterId/report` - Generate report
- `POST /api/industry40/oee/compare` - Compare across work centers
- `GET /api/industry40/oee/work-centers/:workCenterId/insights` - Get insights

## API Usage Examples

### 1. Calculate OEE for a Work Center

```bash
POST /api/industry40/oee/calculate
Content-Type: application/json

{
  "workCenterId": "WC-001",
  "assetId": "ASSET-001",
  "startDate": "2024-01-01T08:00:00Z",
  "endDate": "2024-01-01T16:00:00Z",
  "idealCycleTime": 5
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workCenterId": "WC-001",
    "assetId": "ASSET-001",
    "startDate": "2024-01-01T08:00:00Z",
    "endDate": "2024-01-01T16:00:00Z",
    "plannedProductionTime": 480,
    "actualProductionTime": 400,
    "downtime": 80,
    "availability": 83,
    "idealCycleTime": 5,
    "totalUnitsProduced": 80,
    "performanceRate": 100,
    "goodUnits": 76,
    "defectiveUnits": 4,
    "qualityRate": 95,
    "oee": 79,
    "calculatedAt": "2024-01-01T16:00:00Z"
  }
}
```

### 2. Calculate OEE with Actual Production Data

```bash
POST /api/industry40/oee/calculate-with-data
Content-Type: application/json

{
  "workCenterId": "WC-001",
  "startDate": "2024-01-01T08:00:00Z",
  "endDate": "2024-01-01T16:00:00Z",
  "idealCycleTime": 5,
  "totalUnitsProduced": 100,
  "goodUnits": 95,
  "defectiveUnits": 5
}
```

### 3. Get OEE Trend Data

```bash
GET /api/industry40/oee/work-centers/WC-001/trend?startDate=2024-01-01&endDate=2024-01-31&interval=daily
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "period": "2024-01-01",
      "availability": 83,
      "performance": 100,
      "quality": 95,
      "oee": 79,
      "count": 3
    },
    {
      "period": "2024-01-02",
      "availability": 85,
      "performance": 98,
      "quality": 97,
      "oee": 81,
      "count": 3
    }
  ]
}
```

### 4. Generate OEE Report

```bash
GET /api/industry40/oee/work-centers/WC-001/report?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "success": true,
  "data": {
    "workCenterId": "WC-001",
    "period": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "summary": {
      "averageOEE": 79.5,
      "averageAvailability": 83.2,
      "averagePerformance": 99.1,
      "averageQuality": 96.3,
      "totalDowntime": 2400,
      "totalUnitsProduced": 2500,
      "totalGoodUnits": 2408,
      "totalDefectiveUnits": 92
    },
    "metrics": [...],
    "trend": [...]
  }
}
```

### 5. Get OEE Insights and Recommendations

```bash
GET /api/industry40/oee/work-centers/WC-001/insights?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "success": true,
  "data": {
    "currentOEE": 79.5,
    "insights": [
      {
        "category": "availability",
        "metric": "Availability",
        "value": 83.2,
        "target": 90,
        "gap": 6.8,
        "recommendation": "Implement predictive maintenance to reduce equipment failures"
      },
      {
        "category": "quality",
        "metric": "Quality",
        "value": 96.3,
        "target": 99,
        "gap": 2.7,
        "recommendation": "Improve process controls and operator training"
      }
    ]
  }
}
```

### 6. Compare OEE Across Work Centers

```bash
POST /api/industry40/oee/compare
Content-Type: application/json

{
  "workCenterIds": ["WC-001", "WC-002", "WC-003"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "workCenterId": "WC-001",
      "averageOEE": 79.5,
      "averageAvailability": 83.2,
      "averagePerformance": 99.1,
      "averageQuality": 96.3,
      "metricsCount": 31
    },
    {
      "workCenterId": "WC-002",
      "averageOEE": 82.1,
      "averageAvailability": 85.5,
      "averagePerformance": 98.7,
      "averageQuality": 97.2,
      "metricsCount": 31
    }
  ]
}
```

## Database Schema

The OEE metrics are stored in the `OEEMetrics` table:

```sql
CREATE TABLE "OEEMetrics" (
    "id" TEXT NOT NULL,
    "workCenterId" VARCHAR(100) NOT NULL,
    "assetId" VARCHAR(100),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "plannedProductionTime" INTEGER NOT NULL,
    "actualProductionTime" INTEGER NOT NULL,
    "downtime" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "idealCycleTime" DOUBLE PRECISION NOT NULL,
    "totalUnitsProduced" INTEGER NOT NULL,
    "performanceRate" DOUBLE PRECISION NOT NULL,
    "totalUnitsProduced_quality" INTEGER NOT NULL,
    "goodUnits" INTEGER NOT NULL,
    "defectiveUnits" INTEGER NOT NULL,
    "qualityRate" DOUBLE PRECISION NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OEEMetrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OEEMetrics_workCenterId_startDate_idx" ON "OEEMetrics"("workCenterId", "startDate");
CREATE INDEX "OEEMetrics_assetId_startDate_idx" ON "OEEMetrics"("assetId", "startDate");
CREATE INDEX "OEEMetrics_calculatedAt_idx" ON "OEEMetrics"("calculatedAt");
```

## Industry Standards

### World-Class OEE Targets
- **85%** - World-class OEE target
- **90%** - Availability target
- **95%** - Performance target
- **99%** - Quality target

### OEE Interpretation
- **85%+** - World-class performance
- **60-85%** - Typical manufacturing performance
- **40-60%** - Low performance, significant improvement opportunity
- **<40%** - Very low performance, requires immediate attention

## Integration with Other Modules

### Shop Floor Tracking (Task 31.1)
- OEE calculation uses shop floor operation data
- Actual production time comes from completed operations
- Downtime is calculated from operation gaps

### IoT Integration (Task 31.2)
- Can integrate real-time sensor data for more accurate metrics
- Equipment status affects availability calculations

### Predictive Maintenance (Task 31.3)
- Low OEE scores can trigger maintenance recommendations
- Equipment health affects OEE performance

### Production Monitoring (Task 31.6)
- OEE metrics displayed on real-time dashboards
- Alerts generated when OEE falls below thresholds

## Testing

Comprehensive tests are provided in `server/src/tests/oee-calculation.test.ts`:

- Unit tests for OEE calculation formulas
- Integration tests for service methods
- Edge case handling
- Trend analysis validation
- Report generation verification

## Future Enhancements

1. **Real-time OEE Calculation**
   - Calculate OEE in real-time as operations complete
   - WebSocket updates for live dashboards

2. **Machine Learning Integration**
   - Predict future OEE based on historical trends
   - Identify patterns leading to low OEE

3. **Automated Alerts**
   - Send notifications when OEE drops below threshold
   - Escalate to management for critical issues

4. **Benchmarking**
   - Compare OEE against industry standards
   - Track improvement over time

5. **Root Cause Analysis**
   - Automatically identify primary loss categories
   - Suggest specific improvement actions

## References

- Requirement 9.6: "WHEN OEE is calculated, THE System SHALL measure availability, performance, and quality"
- Design Document: Industry 4.0 Module - OEE Calculation
- Task 31.5: Implement OEE calculation

## Validation

✅ Calculate Overall Equipment Effectiveness
✅ Measure availability, performance, quality
✅ Generate OEE reports and trends
✅ Requirement 9.6 satisfied
