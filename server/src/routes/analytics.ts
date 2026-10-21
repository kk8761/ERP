/**
 * Analytics and AI Routes
 * Provides endpoints for ML-powered analytics including demand forecasting,
 * predictive maintenance, what-if simulation, and natural language queries
 */

import express, { Request, Response } from 'express';
import DemandForecastingService from '../services/ml/DemandForecastingService';
import PredictiveMaintenanceService from '../services/ml/PredictiveMaintenanceService';
import WhatIfSimulationService from '../services/ml/WhatIfSimulationService';
import NaturalLanguageQueryService from '../services/ml/NaturalLanguageQueryService';
import MLModelTrainer from '../services/ml/MLModelTrainer';

const router = express.Router();

// Initialize services
const demandForecastingService = new DemandForecastingService();
const predictiveMaintenanceService = new PredictiveMaintenanceService();
const whatIfSimulationService = new WhatIfSimulationService();
const nlQueryService = new NaturalLanguageQueryService();
const mlTrainer = new MLModelTrainer();

/**
 * POST /api/analytics/demand-forecast
 * Forecast future demand for a product
 */
router.post('/demand-forecast', async (req: Request, res: Response) => {
  try {
    const { productId, historicalPeriods = 30, forecastPeriods = 30 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const forecast = await demandForecastingService.forecastDemand({
      productId,
      historicalPeriods,
      forecastPeriods,
    });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error: any) {
    console.error('Demand forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate demand forecast',
    });
  }
});

/**
 * POST /api/analytics/demand-forecast/batch
 * Batch forecast for multiple products
 */
router.post('/demand-forecast/batch', async (req: Request, res: Response) => {
  try {
    const { productIds, historicalPeriods = 30, forecastPeriods = 30 } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    const forecasts = await demandForecastingService.batchForecastDemand(
      productIds,
      historicalPeriods,
      forecastPeriods
    );

    res.json({
      success: true,
      data: forecasts,
    });
  } catch (error: any) {
    console.error('Batch demand forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate batch demand forecasts',
    });
  }
});

/**
 * POST /api/analytics/predictive-maintenance
 * Predict maintenance needs for an asset
 */
router.post('/predictive-maintenance', async (req: Request, res: Response) => {
  try {
    const { assetId, sensorData, useHistoricalData = true } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const prediction = await predictiveMaintenanceService.predictMaintenance({
      assetId,
      sensorData,
      useHistoricalData,
    });

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Predictive maintenance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to predict maintenance',
    });
  }
});

/**
 * POST /api/analytics/predictive-maintenance/batch
 * Batch predict maintenance for multiple assets
 */
router.post('/predictive-maintenance/batch', async (req: Request, res: Response) => {
  try {
    const { assetIds } = req.body;

    if (!assetIds || !Array.isArray(assetIds)) {
      return res.status(400).json({ error: 'Asset IDs array is required' });
    }

    const predictions = await predictiveMaintenanceService.batchPredictMaintenance(
      assetIds
    );

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error: any) {
    console.error('Batch predictive maintenance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to predict maintenance for assets',
    });
  }
});

/**
 * GET /api/analytics/asset-health-trend/:assetId
 * Get health trend for an asset
 */
router.get('/asset-health-trend/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { days = 30 } = req.query;

    const trend = await predictiveMaintenanceService.getHealthTrend(
      assetId,
      Number(days)
    );

    res.json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    console.error('Asset health trend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get asset health trend',
    });
  }
});

/**
 * POST /api/analytics/what-if-simulation
 * Run a what-if scenario simulation
 */
router.post('/what-if-simulation', async (req: Request, res: Response) => {
  try {
    const { scenarioName, scenarioType, baselineDate, parameters, duration } =
      req.body;

    if (!scenarioName || !scenarioType || !baselineDate || !parameters) {
      return res.status(400).json({
        error: 'Scenario name, type, baseline date, and parameters are required',
      });
    }

    const result = await whatIfSimulationService.runSimulation({
      scenarioName,
      scenarioType,
      baselineDate: new Date(baselineDate),
      parameters,
      duration: duration || 90,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('What-if simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run simulation',
    });
  }
});

/**
 * POST /api/analytics/what-if-simulation/compare
 * Compare multiple scenarios
 */
router.post('/what-if-simulation/compare', async (req: Request, res: Response) => {
  try {
    const { scenarios } = req.body;

    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({ error: 'Scenarios array is required' });
    }

    // Convert baseline dates to Date objects
    const scenariosWithDates = scenarios.map((s) => ({
      ...s,
      baselineDate: new Date(s.baselineDate),
    }));

    const comparison = await whatIfSimulationService.compareScenarios(
      scenariosWithDates
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error('Scenario comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare scenarios',
    });
  }
});

/**
 * GET /api/analytics/scenario-templates
 * Get predefined scenario templates
 */
router.get('/scenario-templates', (req: Request, res: Response) => {
  try {
    const templates = [
      whatIfSimulationService.createScenarioTemplate('price_increase'),
      whatIfSimulationService.createScenarioTemplate('cost_reduction'),
      whatIfSimulationService.createScenarioTemplate('volume_growth'),
      whatIfSimulationService.createScenarioTemplate('market_expansion'),
    ];

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('Scenario templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scenario templates',
    });
  }
});

/**
 * POST /api/analytics/nl-query
 * Process natural language query
 */
router.post('/nl-query', async (req: Request, res: Response) => {
  try {
    const { query, userId, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await nlQueryService.processQuery({
      query,
      userId,
      context,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Natural language query error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process query',
    });
  }
});

/**
 * GET /api/analytics/nl-query/examples
 * Get example natural language queries
 */
router.get('/nl-query/examples', (req: Request, res: Response) => {
  try {
    const examples = nlQueryService.getQueryExamples();

    res.json({
      success: true,
      data: examples,
    });
  } catch (error: any) {
    console.error('Query examples error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get query examples',
    });
  }
});

/**
 * GET /api/analytics/models
 * List all trained ML models
 */
router.get('/models', (req: Request, res: Response) => {
  try {
    const models = mlTrainer.listModels();

    res.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    console.error('List models error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list models',
    });
  }
});

/**
 * DELETE /api/analytics/models/:modelId
 * Delete a trained model
 */
router.delete('/models/:modelId', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;

    mlTrainer.deleteModel(modelId);

    res.json({
      success: true,
      message: 'Model deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete model error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete model',
    });
  }
});

/**
 * POST /api/analytics/train-model
 * Train a custom ML model
 */
router.post('/train-model', async (req: Request, res: Response) => {
  try {
    const { modelConfig, trainingData } = req.body;

    if (!modelConfig || !trainingData) {
      return res.status(400).json({
        error: 'Model configuration and training data are required',
      });
    }

    const result = await mlTrainer.trainModel(modelConfig, trainingData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Train model error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to train model',
    });
  }
});

export default router;
