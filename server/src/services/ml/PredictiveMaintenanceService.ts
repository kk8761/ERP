/**
 * Predictive Maintenance ML Service
 * Predicts equipment failures and calculates remaining useful life
 * Requirements: 9.3, 9.4
 */

import MLModelTrainer, { TrainingData, ModelConfig } from './MLModelTrainer';


import prisma from '../../config/prisma';

export interface MaintenancePredictionInput {
  assetId: string;
  sensorData?: SensorReading[];
  useHistoricalData?: boolean;
}

export interface SensorReading {
  timestamp: Date;
  temperature?: number;
  vibration?: number;
  pressure?: number;
  humidity?: number;
  operatingHours?: number;
  cycleCount?: number;
}

export interface MaintenancePredictionResult {
  assetId: string;
  healthScore: number; // 0-100
  failureProbability: number; // 0-1
  predictedFailureDate: Date | null;
  remainingUsefulLife: number; // in days
  recommendedActions: string[];
  confidence: number;
  modelId: string;
}

export interface AssetHealthData {
  assetId: string;
  timestamp: Date;
  temperature: number;
  vibration: number;
  pressure: number;
  humidity: number;
  operatingHours: number;
  cycleCount: number;
  failureOccurred: boolean;
}

export class PredictiveMaintenanceService {
  private mlTrainer: MLModelTrainer;

  constructor() {
    this.mlTrainer = new MLModelTrainer();
  }

  /**
   * Fetch historical maintenance and sensor data for an asset
   */
  private async fetchAssetHealthData(
    assetId: string,
    limit: number = 1000
  ): Promise<AssetHealthData[]> {
    // Fetch maintenance history
    const maintenanceTasks = await prisma.maintenanceTask.findMany({
      where: { assetId },
      orderBy: { scheduledDate: 'desc' },
      take: limit,
    });

    // Simulate sensor data (in production, this would come from IoT devices)
    const healthData: AssetHealthData[] = [];

    for (const task of maintenanceTasks) {
      // Generate synthetic sensor readings based on maintenance history
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(task.scheduledDate);
        timestamp.setDate(timestamp.getDate() - i);

        // Simulate degrading sensor values as failure approaches
        const degradationFactor = task.taskType === 'breakdown' ? i / 30 : 0;

        healthData.push({
          assetId,
          timestamp,
          temperature: 70 + degradationFactor * 30 + Math.random() * 5,
          vibration: 0.5 + degradationFactor * 2 + Math.random() * 0.2,
          pressure: 100 - degradationFactor * 20 + Math.random() * 5,
          humidity: 50 + Math.random() * 10,
          operatingHours: 1000 + i * 24,
          cycleCount: 5000 + i * 100,
          failureOccurred: task.taskType === 'breakdown' && i === 0,
        });
      }
    }

    return healthData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate health score from sensor readings
   */
  private calculateHealthScore(reading: SensorReading): number {
    let score = 100;

    // Temperature impact (optimal: 60-80°C)
    if (reading.temperature) {
      if (reading.temperature > 90) score -= 20;
      else if (reading.temperature > 80) score -= 10;
      else if (reading.temperature < 50) score -= 5;
    }

    // Vibration impact (optimal: < 1.0)
    if (reading.vibration) {
      if (reading.vibration > 2.5) score -= 25;
      else if (reading.vibration > 1.5) score -= 15;
      else if (reading.vibration > 1.0) score -= 5;
    }

    // Pressure impact (optimal: 90-110)
    if (reading.pressure) {
      if (reading.pressure < 70 || reading.pressure > 130) score -= 20;
      else if (reading.pressure < 80 || reading.pressure > 120) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Train a predictive maintenance model for an asset
   */
  async trainMaintenanceModel(assetId: string): Promise<string> {
    // Fetch historical data
    const healthData = await this.fetchAssetHealthData(assetId);

    if (healthData.length < 100) {
      throw new Error('Insufficient historical data for training');
    }

    // Prepare features and labels
    const features: number[][] = [];
    const labels: number[][] = [];

    for (const data of healthData) {
      features.push([
        data.temperature,
        data.vibration,
        data.pressure,
        data.humidity,
        data.operatingHours,
        data.cycleCount,
      ]);
      labels.push([data.failureOccurred ? 1 : 0]);
    }

    const trainingData: TrainingData = { features, labels };

    // Configure classification model
    const modelConfig: ModelConfig = {
      modelName: `predictive_maintenance_${assetId}`,
      modelType: 'classification',
      inputShape: [6], // 6 sensor features
      outputShape: [1],
      layers: [
        { type: 'dense', units: 128, activation: 'relu' },
        { type: 'dropout', rate: 0.3 },
        { type: 'dense', units: 64, activation: 'relu' },
        { type: 'dropout', rate: 0.2 },
        { type: 'dense', units: 32, activation: 'relu' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
      epochs: 150,
      batchSize: 32,
      validationSplit: 0.2,
    };

    // Train model
    const result = await this.mlTrainer.trainModel(modelConfig, trainingData);

    console.log(
      `Predictive maintenance model trained for asset ${assetId}: ${result.modelId}`
    );
    console.log(`Accuracy: ${result.accuracy}, Loss: ${result.loss}`);

    return result.modelId;
  }

  /**
   * Predict maintenance needs for an asset
   */
  async predictMaintenance(
    input: MaintenancePredictionInput
  ): Promise<MaintenancePredictionResult> {
    const { assetId, sensorData, useHistoricalData = true } = input;

    // Get or train model
    let modelId: string;
    const models = this.mlTrainer.listModels();
    const existingModel = models.find((m) =>
      m.startsWith(`predictive_maintenance_${assetId}`)
    );

    if (existingModel) {
      modelId = existingModel;
    } else {
      modelId = await this.trainMaintenanceModel(assetId);
    }

    // Get current sensor readings
    let currentReadings: SensorReading[];
    if (sensorData && sensorData.length > 0) {
      currentReadings = sensorData;
    } else if (useHistoricalData) {
      const healthData = await this.fetchAssetHealthData(assetId, 10);
      currentReadings = healthData.map((d) => ({
        timestamp: d.timestamp,
        temperature: d.temperature,
        vibration: d.vibration,
        pressure: d.pressure,
        humidity: d.humidity,
        operatingHours: d.operatingHours,
        cycleCount: d.cycleCount,
      }));
    } else {
      throw new Error('No sensor data provided');
    }

    // Use most recent reading
    const latestReading = currentReadings[currentReadings.length - 1];

    // Prepare features
    const features = [
      [
        latestReading.temperature || 70,
        latestReading.vibration || 0.5,
        latestReading.pressure || 100,
        latestReading.humidity || 50,
        latestReading.operatingHours || 1000,
        latestReading.cycleCount || 5000,
      ],
    ];

    // Make prediction
    const prediction = await this.mlTrainer.predict(modelId, features);
    const failureProbability = prediction.predictions[0][0];

    // Calculate health score
    const healthScore = this.calculateHealthScore(latestReading);

    // Estimate remaining useful life (RUL)
    // RUL decreases as failure probability increases
    const baseRUL = 365; // 1 year baseline
    const remainingUsefulLife = Math.round(
      baseRUL * (1 - failureProbability) * (healthScore / 100)
    );

    // Predict failure date
    let predictedFailureDate: Date | null = null;
    if (failureProbability > 0.3) {
      predictedFailureDate = new Date();
      predictedFailureDate.setDate(
        predictedFailureDate.getDate() + remainingUsefulLife
      );
    }

    // Generate recommendations
    const recommendedActions: string[] = [];
    if (failureProbability > 0.7) {
      recommendedActions.push('URGENT: Schedule immediate inspection');
      recommendedActions.push('Prepare replacement parts');
      recommendedActions.push('Plan for equipment downtime');
    } else if (failureProbability > 0.5) {
      recommendedActions.push('Schedule preventive maintenance within 2 weeks');
      recommendedActions.push('Monitor sensor readings daily');
    } else if (failureProbability > 0.3) {
      recommendedActions.push('Schedule routine maintenance');
      recommendedActions.push('Monitor sensor readings weekly');
    } else {
      recommendedActions.push('Continue normal operation');
      recommendedActions.push('Monitor sensor readings monthly');
    }

    // Add specific recommendations based on sensor values
    if (latestReading.temperature && latestReading.temperature > 85) {
      recommendedActions.push('Check cooling system - temperature elevated');
    }
    if (latestReading.vibration && latestReading.vibration > 1.5) {
      recommendedActions.push('Check alignment and bearings - vibration high');
    }
    if (latestReading.pressure && latestReading.pressure < 80) {
      recommendedActions.push('Check for leaks - pressure low');
    }

    return {
      assetId,
      healthScore: Math.round(healthScore),
      failureProbability: Math.round(failureProbability * 100) / 100,
      predictedFailureDate,
      remainingUsefulLife,
      recommendedActions,
      confidence: 0.85,
      modelId,
    };
  }

  /**
   * Batch predict maintenance for multiple assets
   */
  async batchPredictMaintenance(
    assetIds: string[]
  ): Promise<MaintenancePredictionResult[]> {
    const results: MaintenancePredictionResult[] = [];

    for (const assetId of assetIds) {
      try {
        const prediction = await this.predictMaintenance({
          assetId,
          useHistoricalData: true,
        });
        results.push(prediction);
      } catch (error) {
        console.error(
          `Failed to predict maintenance for asset ${assetId}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Get asset health trend over time
   */
  async getHealthTrend(
    assetId: string,
    days: number = 30
  ): Promise<{ date: Date; healthScore: number; failureProbability: number }[]> {
    const healthData = await this.fetchAssetHealthData(assetId, days);
    const trend: { date: Date; healthScore: number; failureProbability: number }[] =
      [];

    // Get model
    const models = this.mlTrainer.listModels();
    const modelId = models.find((m) =>
      m.startsWith(`predictive_maintenance_${assetId}`)
    );

    if (!modelId) {
      throw new Error('No trained model found for asset');
    }

    for (const data of healthData) {
      const features = [
        [
          data.temperature,
          data.vibration,
          data.pressure,
          data.humidity,
          data.operatingHours,
          data.cycleCount,
        ],
      ];

      const prediction = await this.mlTrainer.predict(modelId, features);
      const healthScore = this.calculateHealthScore({
        timestamp: data.timestamp,
        temperature: data.temperature,
        vibration: data.vibration,
        pressure: data.pressure,
        humidity: data.humidity,
        operatingHours: data.operatingHours,
        cycleCount: data.cycleCount,
      });

      trend.push({
        date: data.timestamp,
        healthScore: Math.round(healthScore),
        failureProbability: prediction.predictions[0][0],
      });
    }

    return trend;
  }
}

export default PredictiveMaintenanceService;
