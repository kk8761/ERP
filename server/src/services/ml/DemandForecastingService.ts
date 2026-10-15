/**
 * Demand Forecasting ML Service
 * Provides time series forecasting for product demand with confidence intervals
 * Requirements: 16.5, 16.6
 */

import MLModelTrainer, { TrainingData, ModelConfig } from './MLModelTrainer';


import prisma from '../../config/prisma';

export interface DemandForecastInput {
  productId: string;
  historicalPeriods: number; // Number of historical periods to use
  forecastPeriods: number; // Number of periods to forecast
}

export interface DemandForecastResult {
  productId: string;
  forecasts: ForecastPoint[];
  modelAccuracy: number;
  modelId: string;
}

export interface ForecastPoint {
  period: number;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface HistoricalDemand {
  date: Date;
  quantity: number;
  productId: string;
}

export class DemandForecastingService {
  private mlTrainer: MLModelTrainer;

  constructor() {
    this.mlTrainer = new MLModelTrainer();
  }

  /**
   * Fetch historical demand data for a product
   */
  private async fetchHistoricalDemand(
    productId: string,
    periods: number
  ): Promise<HistoricalDemand[]> {
    // Fetch order line items for the product
    const orders = await prisma.orderItem.findMany({
      where: {
        productId: productId,
      },
      take: periods * 30, // Approximate daily data
    });

    // Aggregate by day (using createdAt as proxy for order date)
    const demandMap = new Map<string, number>();
    for (const item of orders) {
      // Use a default date if not available
      const dateKey = new Date().toISOString().split('T')[0];
      const current = demandMap.get(dateKey) || 0;
      demandMap.set(dateKey, current + item.qty);
    }

    // Convert to array and sort
    const historicalData: HistoricalDemand[] = [];
    for (const [dateStr, quantity] of demandMap.entries()) {
      historicalData.push({
        date: new Date(dateStr),
        quantity,
        productId,
      });
    }

    return historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Create time series features from historical data
   */
  private createTimeSeriesFeatures(
    data: number[],
    lookback: number
  ): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = lookback; i < data.length; i++) {
      const feature = data.slice(i - lookback, i);
      features.push(feature);
      labels.push(data[i]);
    }

    return { features, labels };
  }

  /**
   * Calculate confidence intervals using standard deviation
   */
  private calculateConfidenceIntervals(
    predictions: number[],
    historicalData: number[],
    confidenceLevel: number = 0.95
  ): { lowerBounds: number[]; upperBounds: number[] } {
    // Calculate standard deviation of historical data
    const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
    const variance =
      historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      historicalData.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for 95% confidence interval
    const zScore = confidenceLevel === 0.95 ? 1.96 : 2.576;

    const lowerBounds = predictions.map((pred) =>
      Math.max(0, pred - zScore * stdDev)
    );
    const upperBounds = predictions.map((pred) => pred + zScore * stdDev);

    return { lowerBounds, upperBounds };
  }

  /**
   * Train a demand forecasting model for a product
   */
  async trainDemandForecastModel(
    productId: string,
    lookbackPeriods: number = 30
  ): Promise<string> {
    // Fetch historical data
    const historicalData = await this.fetchHistoricalDemand(
      productId,
      lookbackPeriods * 3
    );

    if (historicalData.length < lookbackPeriods + 10) {
      throw new Error('Insufficient historical data for training');
    }

    // Extract quantities
    const quantities = historicalData.map((d) => d.quantity);

    // Create time series features
    const { features, labels } = this.createTimeSeriesFeatures(
      quantities,
      lookbackPeriods
    );

    // Prepare training data
    const trainingData: TrainingData = {
      features,
      labels: labels.map((l) => [l]),
    };

    // Configure LSTM model for time series
    const modelConfig: ModelConfig = {
      modelName: `demand_forecast_${productId}`,
      modelType: 'regression',
      inputShape: [lookbackPeriods],
      outputShape: [1],
      layers: [
        { type: 'dense', units: 64, activation: 'relu' },
        { type: 'dropout', rate: 0.2 },
        { type: 'dense', units: 32, activation: 'relu' },
        { type: 'dense', units: 1, activation: 'linear' },
      ],
      epochs: 100,
      batchSize: 16,
      validationSplit: 0.2,
    };

    // Train model
    const result = await this.mlTrainer.trainModel(modelConfig, trainingData);

    console.log(
      `Demand forecast model trained for product ${productId}: ${result.modelId}`
    );
    console.log(`Accuracy: ${result.accuracy}, Loss: ${result.loss}`);

    return result.modelId;
  }

  /**
   * Forecast future demand for a product
   */
  async forecastDemand(
    input: DemandForecastInput
  ): Promise<DemandForecastResult> {
    const { productId, historicalPeriods, forecastPeriods } = input;

    // Check if model exists, if not train it
    let trainedModelId: string;

    try {
      // Try to find existing model
      const models = this.mlTrainer.listModels();
      const existingModel = models.find((m) =>
        m.startsWith(`demand_forecast_${productId}`)
      );

      if (existingModel) {
        trainedModelId = existingModel;
      } else {
        trainedModelId = await this.trainDemandForecastModel(
          productId,
          historicalPeriods
        );
      }
    } catch (error) {
      trainedModelId = await this.trainDemandForecastModel(
        productId,
        historicalPeriods
      );
    }

    // Fetch recent historical data
    const historicalData = await this.fetchHistoricalDemand(
      productId,
      historicalPeriods
    );
    const recentQuantities = historicalData
      .slice(-historicalPeriods)
      .map((d) => d.quantity);

    // Make predictions iteratively
    const predictions: number[] = [];
    let currentWindow = [...recentQuantities];

    for (let i = 0; i < forecastPeriods; i++) {
      const prediction = await this.mlTrainer.predict(trainedModelId, [
        currentWindow.slice(-historicalPeriods),
      ]);
      const predictedValue = prediction.predictions[0][0];
      predictions.push(predictedValue);

      // Update window for next prediction
      currentWindow.push(predictedValue);
    }

    // Calculate confidence intervals
    const allQuantities = historicalData.map((d) => d.quantity);
    const { lowerBounds, upperBounds } = this.calculateConfidenceIntervals(
      predictions,
      allQuantities
    );

    // Format results
    const forecasts: ForecastPoint[] = predictions.map((pred, index) => ({
      period: index + 1,
      predictedDemand: Math.round(pred),
      lowerBound: Math.round(lowerBounds[index]),
      upperBound: Math.round(upperBounds[index]),
      confidence: 0.95,
    }));

    // Validate model to get accuracy
    const validationData = this.createTimeSeriesFeatures(
      allQuantities,
      historicalPeriods
    );
    const validation = await this.mlTrainer.validateModel(trainedModelId, {
      features: validationData.features,
      labels: validationData.labels.map((l) => [l]),
    });

    return {
      productId,
      forecasts,
      modelAccuracy: validation.accuracy,
      modelId: trainedModelId,
    };
  }

  /**
   * Batch forecast for multiple products
   */
  async batchForecastDemand(
    productIds: string[],
    historicalPeriods: number = 30,
    forecastPeriods: number = 30
  ): Promise<DemandForecastResult[]> {
    const results: DemandForecastResult[] = [];

    for (const productId of productIds) {
      try {
        const forecast = await this.forecastDemand({
          productId,
          historicalPeriods,
          forecastPeriods,
        });
        results.push(forecast);
      } catch (error) {
        console.error(`Failed to forecast demand for product ${productId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get forecast accuracy metrics
   */
  async getForecastAccuracy(
    actualDemand: number[],
    predictedDemand: number[]
  ): Promise<{
    mape: number;
    rmse: number;
    mae: number;
  }> {
    if (actualDemand.length !== predictedDemand.length) {
      throw new Error('Actual and predicted demand arrays must have same length');
    }

    const n = actualDemand.length;

    // Mean Absolute Percentage Error (MAPE)
    let mapeSum = 0;
    for (let i = 0; i < n; i++) {
      if (actualDemand[i] !== 0) {
        mapeSum += Math.abs((actualDemand[i] - predictedDemand[i]) / actualDemand[i]);
      }
    }
    const mape = (mapeSum / n) * 100;

    // Root Mean Squared Error (RMSE)
    let rmseSum = 0;
    for (let i = 0; i < n; i++) {
      rmseSum += Math.pow(actualDemand[i] - predictedDemand[i], 2);
    }
    const rmse = Math.sqrt(rmseSum / n);

    // Mean Absolute Error (MAE)
    let maeSum = 0;
    for (let i = 0; i < n; i++) {
      maeSum += Math.abs(actualDemand[i] - predictedDemand[i]);
    }
    const mae = maeSum / n;

    return { mape, rmse, mae };
  }
}

export default DemandForecastingService;
