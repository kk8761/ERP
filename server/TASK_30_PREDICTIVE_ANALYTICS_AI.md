# Task 30: Predictive Analytics and AI Implementation

## Overview

This document describes the implementation of Task 30 - Predictive Analytics and AI for the NexaERP platform. This task adds advanced ML/AI capabilities including demand forecasting, predictive maintenance, what-if simulation, and natural language query interfaces.

## Implementation Summary

### Subtasks Completed

#### 30.1 Create ML Model Training Pipeline ✅
- **File**: `server/src/services/ml/MLModelTrainer.ts`
- **Features**:
  - TensorFlow.js-based ML infrastructure
  - Model training with configurable architectures
  - Support for regression, classification, and time series models
  - Feature normalization (min-max scaling)
  - Model persistence and loading
  - Model validation and evaluation
  - Batch prediction capabilities
- **Requirements**: 16.5

#### 30.2 Implement Demand Forecasting ML Models ✅
- **File**: `server/src/services/ml/DemandForecastingService.ts`
- **Features**:
  - Time series forecasting for product demand
  - Historical data aggregation from order history
  - Confidence intervals (95% confidence level)
  - Forecast accuracy metrics (MAPE, RMSE, MAE)
  - Batch forecasting for multiple products
  - Automatic model training and reuse
- **Requirements**: 16.5, 16.6

#### 30.3 Implement Predictive Maintenance ML Models ✅
- **File**: `server/src/services/ml/PredictiveMaintenanceService.ts`
- **Features**:
  - Equipment failure prediction
  - Health score calculation (0-100)
  - Remaining useful life (RUL) estimation
  - Predicted failure date calculation
  - Sensor data integration (temperature, vibration, pressure, humidity)
  - Automated maintenance recommendations
  - Health trend analysis over time
  - Batch prediction for multiple assets
- **Requirements**: 9.3, 9.4

#### 30.4 Implement What-If Simulation ✅
- **File**: `server/src/services/ml/WhatIfSimulationService.ts`
- **Features**:
  - Scenario modeling engine
  - Business impact simulation (revenue, cost, profit, margin)
  - Multiple scenario types (pricing, demand, cost, capacity)
  - Impact analysis with risk assessment
  - Scenario comparison and ranking
  - Predefined scenario templates
  - Automated recommendations
- **Requirements**: 16.7

#### 30.5 Implement Natural Language Query ✅
- **File**: `server/src/services/ml/NaturalLanguageQueryService.ts`
- **Features**:
  - Natural language query understanding
  - Intent extraction (count, sum, average, list, find, compare)
  - Entity recognition (orders, customers, products)
  - Filter extraction (time-based, status, value ranges)
  - SQL query generation
  - Natural language response formatting
  - Query examples and suggestions
  - Confidence scoring
- **Requirements**: 16.8

### API Routes

**File**: `server/src/routes/analytics.ts`

All ML/AI features are exposed through RESTful API endpoints:

#### Demand Forecasting
- `POST /api/analytics/demand-forecast` - Forecast demand for a single product
- `POST /api/analytics/demand-forecast/batch` - Batch forecast for multiple products

#### Predictive Maintenance
- `POST /api/analytics/predictive-maintenance` - Predict maintenance for an asset
- `POST /api/analytics/predictive-maintenance/batch` - Batch predict for multiple assets
- `GET /api/analytics/asset-health-trend/:assetId` - Get health trend over time

#### What-If Simulation
- `POST /api/analytics/what-if-simulation` - Run a scenario simulation
- `POST /api/analytics/what-if-simulation/compare` - Compare multiple scenarios
- `GET /api/analytics/scenario-templates` - Get predefined templates

#### Natural Language Query
- `POST /api/analytics/nl-query` - Process natural language query
- `GET /api/analytics/nl-query/examples` - Get example queries

#### Model Management
- `GET /api/analytics/models` - List all trained models
- `DELETE /api/analytics/models/:modelId` - Delete a model
- `POST /api/analytics/train-model` - Train a custom model

## Technical Architecture

### ML Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                   ML Services Layer                      │
├─────────────────────────────────────────────────────────┤
│  DemandForecasting  │  PredictiveMaintenance  │  NLQuery│
│  WhatIfSimulation   │                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              MLModelTrainer (Core Engine)                │
├─────────────────────────────────────────────────────────┤
│  • Model Building (TensorFlow.js)                        │
│  • Training Pipeline                                     │
│  • Feature Normalization                                 │
│  • Model Persistence                                     │
│  • Prediction Engine                                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Sources                            │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Historical Data  │  Sensor Data          │
└─────────────────────────────────────────────────────────┘
```

### Model Types

1. **Time Series Forecasting** (Demand Forecasting)
   - Architecture: Dense layers with dropout
   - Input: Historical demand data (lookback window)
   - Output: Future demand predictions
   - Loss: Mean Squared Error

2. **Binary Classification** (Predictive Maintenance)
   - Architecture: Deep neural network with dropout
   - Input: Sensor readings (6 features)
   - Output: Failure probability (0-1)
   - Loss: Binary Cross-Entropy

3. **Simulation Models** (What-If Analysis)
   - Rule-based simulation engine
   - Parameter-driven scenario modeling
   - Business metrics calculation

4. **NLP Models** (Natural Language Query)
   - Intent classification
   - Entity recognition
   - Query-to-SQL translation

## Dependencies

### New Dependencies Added
```json
{
  "@tensorflow/tfjs-node": "^4.x",
  "natural": "^6.x",
  "compromise": "^14.x"
}
```

## Usage Examples

### 1. Demand Forecasting

```typescript
// Forecast demand for a product
POST /api/analytics/demand-forecast
{
  "productId": "prod_123",
  "historicalPeriods": 30,
  "forecastPeriods": 30
}

// Response
{
  "success": true,
  "data": {
    "productId": "prod_123",
    "forecasts": [
      {
        "period": 1,
        "predictedDemand": 150,
        "lowerBound": 120,
        "upperBound": 180,
        "confidence": 0.95
      },
      // ... more periods
    ],
    "modelAccuracy": 0.87,
    "modelId": "demand_forecast_prod_123_1234567890"
  }
}
```

### 2. Predictive Maintenance

```typescript
// Predict maintenance for an asset
POST /api/analytics/predictive-maintenance
{
  "assetId": "asset_456",
  "useHistoricalData": true
}

// Response
{
  "success": true,
  "data": {
    "assetId": "asset_456",
    "healthScore": 72,
    "failureProbability": 0.35,
    "predictedFailureDate": "2024-06-15T00:00:00.000Z",
    "remainingUsefulLife": 45,
    "recommendedActions": [
      "Schedule routine maintenance",
      "Monitor sensor readings weekly"
    ],
    "confidence": 0.85,
    "modelId": "predictive_maintenance_asset_456_1234567890"
  }
}
```

### 3. What-If Simulation

```typescript
// Run a price increase scenario
POST /api/analytics/what-if-simulation
{
  "scenarioName": "Price Increase 10%",
  "scenarioType": "pricing",
  "baselineDate": "2024-01-01",
  "parameters": [
    {
      "entity": "product",
      "attribute": "price",
      "changeType": "percentage",
      "changeValue": 10
    }
  ],
  "duration": 90
}

// Response
{
  "success": true,
  "data": {
    "scenarioId": "scenario_1234567890",
    "scenarioName": "Price Increase 10%",
    "baselineMetrics": {
      "revenue": 100000,
      "cost": 60000,
      "profit": 40000,
      "margin": 40,
      "volume": 1000
    },
    "simulatedMetrics": {
      "revenue": 107500,
      "cost": 58500,
      "profit": 49000,
      "margin": 45.6,
      "volume": 975
    },
    "impact": {
      "revenueChange": 7500,
      "revenueChangePercent": 7.5,
      "profitChange": 9000,
      "profitChangePercent": 22.5,
      "riskLevel": "low"
    },
    "recommendations": [
      "RECOMMENDED: Proceed with this scenario",
      "Expected positive impact on profitability"
    ]
  }
}
```

### 4. Natural Language Query

```typescript
// Ask a natural language question
POST /api/analytics/nl-query
{
  "query": "How many orders do we have this month?"
}

// Response
{
  "success": true,
  "data": {
    "originalQuery": "How many orders do we have this month?",
    "interpretation": "I understand you want to count orders with filters.",
    "sqlQuery": "SELECT * FROM order WHERE date greater ...",
    "results": [{ "count": 245 }],
    "naturalLanguageResponse": "There are 245 orders matching your query.",
    "confidence": 0.9,
    "suggestions": [
      "Show me orders from this month",
      "What is the total value of completed orders?",
      "How many pending orders do we have?"
    ]
  }
}
```

## Model Storage

Trained models are stored in the file system:
- **Location**: `server/ml_models/`
- **Structure**:
  ```
  ml_models/
  ├── demand_forecast_prod_123_1234567890/
  │   ├── model.json
  │   ├── weights.bin
  │   └── normalization.json
  ├── predictive_maintenance_asset_456_1234567890/
  │   ├── model.json
  │   ├── weights.bin
  │   └── normalization.json
  └── ...
  ```

## Performance Considerations

1. **Model Training**:
   - Training is performed asynchronously
   - Models are cached and reused
   - Training data is limited to prevent memory issues

2. **Predictions**:
   - Models are loaded on-demand
   - Predictions are fast (< 100ms)
   - Batch predictions are supported

3. **Data Processing**:
   - Historical data is aggregated efficiently
   - Feature normalization is cached
   - Database queries are optimized

## Future Enhancements

1. **Advanced ML Models**:
   - LSTM networks for time series
   - Ensemble methods for better accuracy
   - Transfer learning for faster training

2. **Real-time Predictions**:
   - Streaming data processing
   - Online learning
   - Model retraining automation

3. **Enhanced NLP**:
   - More complex query understanding
   - Multi-entity queries
   - Query history and learning

4. **Model Monitoring**:
   - Model performance tracking
   - Drift detection
   - Automated retraining triggers

## Testing

To test the ML services:

```bash
# Build the project
npm run build --prefix server

# Start the server
npm start --prefix server

# Test demand forecasting
curl -X POST http://localhost:5000/api/analytics/demand-forecast \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_123","historicalPeriods":30,"forecastPeriods":30}'

# Test natural language query
curl -X POST http://localhost:5000/api/analytics/nl-query \
  -H "Content-Type: application/json" \
  -d '{"query":"How many orders do we have this month?"}'
```

## Conclusion

Task 30 successfully implements comprehensive ML/AI capabilities for the NexaERP platform, providing:
- Demand forecasting with confidence intervals
- Predictive maintenance with failure prediction
- What-if simulation for scenario analysis
- Natural language query interface

All subtasks (30.1 through 30.5) have been completed and integrated into the main application with RESTful API endpoints.
