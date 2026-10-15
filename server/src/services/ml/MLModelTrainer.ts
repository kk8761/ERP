/**
 * ML Model Training Pipeline
 * Provides infrastructure for training, validating, and deploying ML models
 * Requirements: 16.5
 */

import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

export interface TrainingData {
  features: number[][];
  labels: number[][];
}

export interface ModelConfig {
  modelName: string;
  modelType: 'regression' | 'classification' | 'timeseries';
  inputShape: number[];
  outputShape: number[];
  layers?: LayerConfig[];
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
}

export interface LayerConfig {
  type: 'dense' | 'lstm' | 'dropout' | 'conv1d';
  units?: number;
  activation?: string;
  rate?: number;
  filters?: number;
  kernelSize?: number;
}

export interface TrainingResult {
  modelId: string;
  accuracy: number;
  loss: number;
  validationAccuracy?: number;
  validationLoss?: number;
  trainingTime: number;
  modelPath: string;
}

export interface PredictionResult {
  predictions: number[][];
  confidence?: number[];
}

export class MLModelTrainer {
  private modelsDir: string;

  constructor() {
    this.modelsDir = path.join(__dirname, '../../../ml_models');
    this.ensureModelsDirectory();
  }

  /**
   * Ensure models directory exists
   */
  private ensureModelsDirectory(): void {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  /**
   * Prepare training data from raw data
   */
  prepareTrainingData(
    rawData: any[],
    featureKeys: string[],
    labelKey: string
  ): TrainingData {
    const features: number[][] = [];
    const labels: number[][] = [];

    for (const item of rawData) {
      const featureRow: number[] = [];
      for (const key of featureKeys) {
        featureRow.push(Number(item[key]) || 0);
      }
      features.push(featureRow);

      const label = Number(item[labelKey]) || 0;
      labels.push([label]);
    }

    return { features, labels };
  }

  /**
   * Normalize features using min-max scaling
   */
  normalizeFeatures(features: number[][]): {
    normalized: number[][];
    min: number[];
    max: number[];
  } {
    const numFeatures = features[0].length;
    const min: number[] = new Array(numFeatures).fill(Infinity);
    const max: number[] = new Array(numFeatures).fill(-Infinity);

    // Find min and max for each feature
    for (const row of features) {
      for (let i = 0; i < numFeatures; i++) {
        if (row[i] < min[i]) min[i] = row[i];
        if (row[i] > max[i]) max[i] = row[i];
      }
    }

    // Normalize
    const normalized = features.map((row) =>
      row.map((val, i) => {
        const range = max[i] - min[i];
        return range === 0 ? 0 : (val - min[i]) / range;
      })
    );

    return { normalized, min, max };
  }

  /**
   * Build a neural network model based on configuration
   */
  buildModel(config: ModelConfig): tf.Sequential {
    const model = tf.sequential();

    // Add input layer
    if (config.layers && config.layers.length > 0) {
      const firstLayer = config.layers[0];
      if (firstLayer.type === 'dense') {
        model.add(
          tf.layers.dense({
            units: firstLayer.units || 64,
            activation: (firstLayer.activation as any) || 'relu',
            inputShape: config.inputShape,
          })
        );
      } else if (firstLayer.type === 'lstm') {
        model.add(
          tf.layers.lstm({
            units: firstLayer.units || 64,
            returnSequences: config.layers.length > 2,
            inputShape: config.inputShape,
          })
        );
      }

      // Add hidden layers
      for (let i = 1; i < config.layers.length - 1; i++) {
        const layer = config.layers[i];
        if (layer.type === 'dense') {
          model.add(
            tf.layers.dense({
              units: layer.units || 64,
              activation: (layer.activation as any) || 'relu',
            })
          );
        } else if (layer.type === 'dropout') {
          model.add(tf.layers.dropout({ rate: layer.rate || 0.2 }));
        } else if (layer.type === 'lstm') {
          model.add(
            tf.layers.lstm({
              units: layer.units || 64,
              returnSequences: i < config.layers.length - 2,
            })
          );
        }
      }

      // Add output layer
      const lastLayer = config.layers[config.layers.length - 1];
      if (lastLayer.type === 'dense') {
        model.add(
          tf.layers.dense({
            units: lastLayer.units || config.outputShape[0],
            activation: (lastLayer.activation as any) || 'linear',
          })
        );
      }
    } else {
      // Default architecture
      model.add(
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: config.inputShape,
        })
      );
      model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
      model.add(
        tf.layers.dense({
          units: config.outputShape[0],
          activation: config.modelType === 'classification' ? 'softmax' : 'linear',
        })
      );
    }

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss:
        config.modelType === 'classification'
          ? 'categoricalCrossentropy'
          : 'meanSquaredError',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Train a model with the provided data
   */
  async trainModel(
    config: ModelConfig,
    trainingData: TrainingData
  ): Promise<TrainingResult> {
    const startTime = Date.now();

    // Normalize features
    const { normalized, min, max } = this.normalizeFeatures(trainingData.features);

    // Convert to tensors
    const xs = tf.tensor2d(normalized);
    const ys = tf.tensor2d(trainingData.labels);

    // Build model
    const model = this.buildModel(config);

    // Train model
    const history = await model.fit(xs, ys, {
      epochs: config.epochs || 100,
      batchSize: config.batchSize || 32,
      validationSplit: config.validationSplit || 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(
              `Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`
            );
          }
        },
      },
    });

    // Save model
    const modelId = `${config.modelName}_${Date.now()}`;
    const modelPath = path.join(this.modelsDir, modelId);
    await model.save(`file://${modelPath}`);

    // Save normalization parameters
    const normalizationPath = path.join(modelPath, 'normalization.json');
    fs.writeFileSync(
      normalizationPath,
      JSON.stringify({ min, max }, null, 2)
    );

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    const trainingTime = Date.now() - startTime;
    const finalEpoch = history.history.loss.length - 1;

    return {
      modelId,
      accuracy: (history.history.acc?.[finalEpoch] as number) || 0,
      loss: history.history.loss[finalEpoch] as number,
      validationAccuracy: (history.history.val_acc?.[finalEpoch] as number) || undefined,
      validationLoss: (history.history.val_loss?.[finalEpoch] as number) || undefined,
      trainingTime,
      modelPath,
    };
  }

  /**
   * Load a trained model
   */
  async loadModel(modelId: string): Promise<tf.LayersModel> {
    const modelPath = path.join(this.modelsDir, modelId);
    return await tf.loadLayersModel(`file://${modelPath}/model.json`);
  }

  /**
   * Load normalization parameters
   */
  loadNormalizationParams(modelId: string): { min: number[]; max: number[] } {
    const normalizationPath = path.join(
      this.modelsDir,
      modelId,
      'normalization.json'
    );
    const data = fs.readFileSync(normalizationPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Make predictions using a trained model
   */
  async predict(
    modelId: string,
    features: number[][]
  ): Promise<PredictionResult> {
    // Load model and normalization params
    const model = await this.loadModel(modelId);
    const { min, max } = this.loadNormalizationParams(modelId);

    // Normalize features
    const normalized = features.map((row) =>
      row.map((val, i) => {
        const range = max[i] - min[i];
        return range === 0 ? 0 : (val - min[i]) / range;
      })
    );

    // Convert to tensor and predict
    const xs = tf.tensor2d(normalized);
    const predictions = model.predict(xs) as tf.Tensor;
    const predictionData = await predictions.array();

    // Clean up
    xs.dispose();
    predictions.dispose();

    return {
      predictions: predictionData as number[][],
    };
  }

  /**
   * Validate model performance
   */
  async validateModel(
    modelId: string,
    validationData: TrainingData
  ): Promise<{ accuracy: number; loss: number }> {
    const model = await this.loadModel(modelId);
    const { min, max } = this.loadNormalizationParams(modelId);

    // Normalize features
    const normalized = validationData.features.map((row) =>
      row.map((val, i) => {
        const range = max[i] - min[i];
        return range === 0 ? 0 : (val - min[i]) / range;
      })
    );

    const xs = tf.tensor2d(normalized);
    const ys = tf.tensor2d(validationData.labels);

    const result = model.evaluate(xs, ys) as tf.Scalar[];
    const loss = await result[0].data();
    const accuracy = await result[1].data();

    // Clean up
    xs.dispose();
    ys.dispose();
    result[0].dispose();
    result[1].dispose();

    return {
      loss: loss[0],
      accuracy: accuracy[0],
    };
  }

  /**
   * List all trained models
   */
  listModels(): string[] {
    if (!fs.existsSync(this.modelsDir)) {
      return [];
    }
    return fs.readdirSync(this.modelsDir).filter((file) => {
      const modelPath = path.join(this.modelsDir, file);
      return fs.statSync(modelPath).isDirectory();
    });
  }

  /**
   * Delete a model
   */
  deleteModel(modelId: string): void {
    const modelPath = path.join(this.modelsDir, modelId);
    if (fs.existsSync(modelPath)) {
      fs.rmSync(modelPath, { recursive: true, force: true });
    }
  }
}

export default MLModelTrainer;
