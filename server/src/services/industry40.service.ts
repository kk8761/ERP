/**
 * Industry 4.0 Service
 * Handles shop floor tracking, IoT integration, predictive maintenance, digital twins, and OEE calculation
 */


import { v4 as uuidv4 } from 'uuid';
import {
  ShopFloorOperation,
  ShopFloorOperationData,
  OperationStatus,
  IoTDevice,
  IoTDeviceData,
  DeviceStatus,
  SensorMetric,
  SensorMetricData,
  DigitalTwin,
  DigitalTwinData,
  Simulation,
  SimulationData,
  OEEMetrics,
  OEEMetricsData,
} from '../models/Industry40';

import prisma from '../config/prisma';

// ============================================================================
// Shop Floor Tracking Service (Task 31.1)
// ============================================================================

export class ShopFloorTrackingService {
  /**
   * Start a shop floor operation
   */
  async startOperation(data: {
    productionOrderId: string;
    workCenterId: string;
    operationId: string;
    operationName: string;
    plannedDuration: number;
    operatorId?: string;
    operatorName?: string;
  }): Promise<ShopFloorOperation> {
    const operation = await prisma.shopFloorOperation.create({
      data: {
        id: uuidv4(),
        productionOrderId: data.productionOrderId,
        workCenterId: data.workCenterId,
        operationId: data.operationId,
        operationName: data.operationName,
        status: OperationStatus.IN_PROGRESS,
        startTime: new Date(),
        plannedDuration: data.plannedDuration,
        operatorId: data.operatorId,
        operatorName: data.operatorName,
      },
    });

    // Update production status
    await this.updateProductionStatus(data.workCenterId);

    return new ShopFloorOperation(operation as ShopFloorOperationData);
  }

  /**
   * Complete a shop floor operation
   */
  async completeOperation(operationId: string): Promise<ShopFloorOperation> {
    const operation = await prisma.shopFloorOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    const endTime = new Date();
    const actualDuration = operation.startTime
      ? Math.round((endTime.getTime() - operation.startTime.getTime()) / 60000)
      : null;

    const efficiency = actualDuration
      ? Math.round((operation.plannedDuration / actualDuration) * 100)
      : null;

    const updated = await prisma.shopFloorOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.COMPLETED,
        endTime,
        actualDuration,
        efficiency,
      },
    });

    // Update production status
    await this.updateProductionStatus(operation.workCenterId);

    return new ShopFloorOperation(updated as ShopFloorOperationData);
  }

  /**
   * Pause a shop floor operation
   */
  async pauseOperation(operationId: string): Promise<ShopFloorOperation> {
    const updated = await prisma.shopFloorOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.PAUSED,
      },
    });

    return new ShopFloorOperation(updated as ShopFloorOperationData);
  }

  /**
   * Resume a paused operation
   */
  async resumeOperation(operationId: string): Promise<ShopFloorOperation> {
    const updated = await prisma.shopFloorOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.IN_PROGRESS,
      },
    });

    return new ShopFloorOperation(updated as ShopFloorOperationData);
  }

  /**
   * Get operations by work center
   */
  async getOperationsByWorkCenter(
    workCenterId: string,
    status?: OperationStatus
  ): Promise<ShopFloorOperation[]> {
    const operations = await prisma.shopFloorOperation.findMany({
      where: {
        workCenterId,
        ...(status && { status }),
      },
      orderBy: { startTime: 'desc' },
    });

    return operations.map((op) => new ShopFloorOperation(op as ShopFloorOperationData));
  }

  /**
   * Get operations by production order
   */
  async getOperationsByProductionOrder(
    productionOrderId: string
  ): Promise<ShopFloorOperation[]> {
    const operations = await prisma.shopFloorOperation.findMany({
      where: { productionOrderId },
      orderBy: { startTime: 'asc' },
    });

    return operations.map((op) => new ShopFloorOperation(op as ShopFloorOperationData));
  }

  /**
   * Calculate operation efficiency
   */
  calculateEfficiency(plannedDuration: number, actualDuration: number): number {
    if (actualDuration === 0) return 0;
    return Math.round((plannedDuration / actualDuration) * 100);
  }

  /**
   * Update production status for a work center
   */
  private async updateProductionStatus(workCenterId: string): Promise<void> {
    const currentOperation = await prisma.shopFloorOperation.findFirst({
      where: {
        workCenterId,
        status: OperationStatus.IN_PROGRESS,
      },
      orderBy: { startTime: 'desc' },
    });

    const status = currentOperation ? 'running' : 'idle';

    await prisma.productionStatus.upsert({
      where: { workCenterId },
      create: {
        id: uuidv4(),
        workCenterId,
        workCenterName: `Work Center ${workCenterId}`,
        status,
        currentOperationId: currentOperation?.id,
        currentProductionOrder: currentOperation?.productionOrderId,
        lastUpdated: new Date(),
      },
      update: {
        status,
        currentOperationId: currentOperation?.id,
        currentProductionOrder: currentOperation?.productionOrderId,
        lastUpdated: new Date(),
      },
    });
  }
}

// ============================================================================
// IoT Integration Service (Task 31.2)
// ============================================================================

export class IoTIntegrationService {
  /**
   * Register a new IoT device
   */
  async registerDevice(data: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    workCenterId?: string;
    assetId?: string;
    configuration?: Record<string, unknown>;
    location?: string;
  }): Promise<IoTDevice> {
    const device = await prisma.ioTDevice.create({
      data: {
        id: uuidv4(),
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        workCenterId: data.workCenterId,
        assetId: data.assetId,
        status: DeviceStatus.OFFLINE,
        configuration: data.configuration as any,
        location: data.location,
      },
    });

    return new IoTDevice(device as IoTDeviceData);
  }

  /**
   * Ingest sensor data from IoT devices
   */
  async ingestSensorData(data: {
    deviceId: string;
    metrics: Array<{
      metricName: string;
      metricValue: number;
      unit: string;
      quality?: string;
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<SensorMetric[]> {
    // Update device heartbeat
    await prisma.ioTDevice.update({
      where: { deviceId: data.deviceId },
      data: {
        lastHeartbeat: new Date(),
        status: DeviceStatus.ONLINE,
      },
    });

    // Store sensor metrics
    const metrics = await Promise.all(
      data.metrics.map((metric) =>
        prisma.sensorMetric.create({
          data: {
            id: uuidv4(),
            deviceId: data.deviceId,
            metricName: metric.metricName,
            metricValue: metric.metricValue,
            unit: metric.unit,
            timestamp: new Date(),
            quality: metric.quality,
            metadata: metric.metadata as any,
          },
        })
      )
    );

    return metrics.map((m) => new SensorMetric(m as SensorMetricData));
  }

  /**
   * Get sensor data for a device
   */
  async getSensorData(
    deviceId: string,
    metricName?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SensorMetric[]> {
    const metrics = await prisma.sensorMetric.findMany({
      where: {
        deviceId,
        ...(metricName && { metricName }),
        ...(startDate &&
          endDate && {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit to last 1000 readings
    });

    return metrics.map((m) => new SensorMetric(m as SensorMetricData));
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<IoTDevice | null> {
    const device = await prisma.ioTDevice.findUnique({
      where: { deviceId },
    });

    return device ? new IoTDevice(device as IoTDeviceData) : null;
  }

  /**
   * Get all devices for a work center
   */
  async getDevicesByWorkCenter(workCenterId: string): Promise<IoTDevice[]> {
    const devices = await prisma.ioTDevice.findMany({
      where: { workCenterId },
    });

    return devices.map((d) => new IoTDevice(d as IoTDeviceData));
  }

  /**
   * Get all devices for an asset
   */
  async getDevicesByAsset(assetId: string): Promise<IoTDevice[]> {
    const devices = await prisma.ioTDevice.findMany({
      where: { assetId },
    });

    return devices.map((d) => new IoTDevice(d as IoTDeviceData));
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(
    deviceId: string,
    status: DeviceStatus
  ): Promise<IoTDevice> {
    const device = await prisma.ioTDevice.update({
      where: { deviceId },
      data: { status },
    });

    return new IoTDevice(device as IoTDeviceData);
  }

  /**
   * Check for offline devices (no heartbeat in last 5 minutes)
   */
  async checkOfflineDevices(): Promise<IoTDevice[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const devices = await prisma.ioTDevice.findMany({
      where: {
        OR: [
          { lastHeartbeat: { lt: fiveMinutesAgo } },
          { lastHeartbeat: null },
        ],
        status: { not: DeviceStatus.OFFLINE },
      },
    });

    // Update status to offline
    await Promise.all(
      devices.map((device) =>
        prisma.ioTDevice.update({
          where: { id: device.id },
          data: { status: DeviceStatus.OFFLINE },
        })
      )
    );

    return devices.map((d) => new IoTDevice(d as IoTDeviceData));
  }
}

// ============================================================================
// Predictive Maintenance Service (Task 31.3)
// ============================================================================

export class PredictiveMaintenanceService {
  /**
   * Calculate equipment health score from sensor data
   */
  async calculateHealthScore(assetId: string): Promise<number> {
    // Get recent sensor data for the asset
    const devices = await prisma.ioTDevice.findMany({
      where: { assetId },
    });

    if (devices.length === 0) {
      return 100; // No data, assume healthy
    }

    // Get recent metrics (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = await prisma.sensorMetric.findMany({
      where: {
        deviceId: { in: devices.map((d) => d.deviceId) },
        timestamp: { gte: oneDayAgo },
      },
    });

    if (metrics.length === 0) {
      return 100; // No recent data
    }

    // Simple health score calculation based on metric quality
    const goodMetrics = metrics.filter((m) => m.quality === 'good').length;
    const healthScore = Math.round((goodMetrics / metrics.length) * 100);

    return healthScore;
  }

  /**
   * Predict equipment failure date using ML model
   */
  async predictFailureDate(
    assetId: string,
    assetName: string
  ): Promise<{
    healthScore: number;
    predictedFailureDate: Date | null;
    remainingUsefulLife: number | null;
    confidence: number;
  }> {
    const healthScore = await this.calculateHealthScore(assetId);

    // Simple prediction logic (in production, use actual ML model)
    let predictedFailureDate: Date | null = null;
    let remainingUsefulLife: number | null = null;
    let confidence = 0.7;

    if (healthScore < 50) {
      // Critical health, predict failure in 7-14 days
      const daysToFailure = Math.floor(Math.random() * 7) + 7;
      predictedFailureDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);
      remainingUsefulLife = daysToFailure;
      confidence = 0.85;
    } else if (healthScore < 70) {
      // Warning health, predict failure in 30-60 days
      const daysToFailure = Math.floor(Math.random() * 30) + 30;
      predictedFailureDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);
      remainingUsefulLife = daysToFailure;
      confidence = 0.7;
    }

    // Store equipment health record
    await prisma.equipmentHealth.create({
      data: {
        id: uuidv4(),
        assetId,
        assetName,
        healthScore,
        predictedFailureDate,
        remainingUsefulLife,
        algorithm: 'simple_threshold',
        confidence,
        recommendations: [
          healthScore < 50
            ? 'Schedule immediate inspection'
            : healthScore < 70
            ? 'Schedule preventive maintenance'
            : 'Continue monitoring',
        ] as any,
      },
    });

    return {
      healthScore,
      predictedFailureDate,
      remainingUsefulLife,
      confidence,
    };
  }

  /**
   * Generate maintenance task before predicted failure
   */
  async generateMaintenanceTask(data: {
    assetId: string;
    assetName: string;
    taskType: string;
    priority: string;
    description: string;
    scheduledDate: Date;
    estimatedCost?: number;
  }): Promise<any> {
    // Get latest equipment health
    const health = await prisma.equipmentHealth.findFirst({
      where: { assetId: data.assetId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!health) {
      throw new Error('Equipment health data not found');
    }

    const task = await prisma.predictiveMaintenanceTask.create({
      data: {
        id: uuidv4(),
        taskNumber: `PMT-${Date.now()}`,
        equipmentHealthId: health.id,
        assetId: data.assetId,
        taskType: data.taskType,
        priority: data.priority,
        description: data.description,
        scheduledDate: data.scheduledDate,
        estimatedCost: data.estimatedCost,
        status: 'scheduled',
      },
    });

    return task;
  }

  /**
   * Get equipment health history
   */
  async getEquipmentHealthHistory(assetId: string): Promise<any[]> {
    const history = await prisma.equipmentHealth.findMany({
      where: { assetId },
      orderBy: { calculatedAt: 'desc' },
      take: 30, // Last 30 records
    });

    return history;
  }

  /**
   * Get maintenance tasks for an asset
   */
  async getMaintenanceTasks(
    assetId: string,
    status?: string
  ): Promise<any[]> {
    const tasks = await prisma.predictiveMaintenanceTask.findMany({
      where: {
        assetId,
        ...(status && { status }),
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return tasks;
  }

  /**
   * Complete a maintenance task
   */
  async completeMaintenanceTask(
    taskId: string,
    actualCost?: number,
    notes?: string
  ): Promise<any> {
    const task = await prisma.predictiveMaintenanceTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        actualCost,
        notes,
      },
    });

    return task;
  }
}

// ============================================================================
// Digital Twin Service (Task 31.4)
// ============================================================================

export class DigitalTwinService {
  /**
   * Create a digital twin model of a physical asset
   */
  async createDigitalTwin(data: {
    name: string;
    physicalAssetId: string;
    modelType: string;
    modelVersion: string;
    parameters?: Record<string, number>;
  }): Promise<DigitalTwin> {
    const digitalTwin = await prisma.digitalTwin.create({
      data: {
        id: uuidv4(),
        name: data.name,
        physicalAssetId: data.physicalAssetId,
        modelType: data.modelType,
        modelVersion: data.modelVersion,
        parameters: data.parameters || {},
        state: {},
        isActive: true,
      },
    });

    return new DigitalTwin(digitalTwin as DigitalTwinData);
  }

  /**
   * Get digital twin by ID
   */
  async getDigitalTwin(id: string): Promise<DigitalTwin | null> {
    const digitalTwin = await prisma.digitalTwin.findUnique({
      where: { id },
      include: {
        simulations: {
          orderBy: { startTime: 'desc' },
          take: 10, // Last 10 simulations
        },
      },
    });

    return digitalTwin ? new DigitalTwin(digitalTwin as DigitalTwinData) : null;
  }

  /**
   * Get digital twin by physical asset ID
   */
  async getDigitalTwinByAsset(physicalAssetId: string): Promise<DigitalTwin | null> {
    const digitalTwin = await prisma.digitalTwin.findFirst({
      where: { physicalAssetId, isActive: true },
      include: {
        simulations: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    return digitalTwin ? new DigitalTwin(digitalTwin as DigitalTwinData) : null;
  }

  /**
   * Get all digital twins
   */
  async getAllDigitalTwins(isActive?: boolean): Promise<DigitalTwin[]> {
    const digitalTwins = await prisma.digitalTwin.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return digitalTwins.map((dt) => new DigitalTwin(dt as DigitalTwinData));
  }

  /**
   * Sync real-time data from IoT sensors to digital twin
   */
  async syncFromIoTSensors(digitalTwinId: string): Promise<DigitalTwin> {
    const digitalTwin = await prisma.digitalTwin.findUnique({
      where: { id: digitalTwinId },
    });

    if (!digitalTwin) {
      throw new Error('Digital twin not found');
    }

    // Get IoT devices for the physical asset
    const devices = await prisma.ioTDevice.findMany({
      where: { assetId: digitalTwin.physicalAssetId },
    });

    if (devices.length === 0) {
      throw new Error('No IoT devices found for this asset');
    }

    // Get latest sensor metrics from all devices (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const metrics = await prisma.sensorMetric.findMany({
      where: {
        deviceId: { in: devices.map((d) => d.deviceId) },
        timestamp: { gte: fiveMinutesAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Aggregate metrics by metric name (take latest value for each)
    const latestMetrics: Record<string, { value: number; unit: string; timestamp: Date }> = {};
    for (const metric of metrics) {
      if (!latestMetrics[metric.metricName]) {
        latestMetrics[metric.metricName] = {
          value: metric.metricValue,
          unit: metric.unit,
          timestamp: metric.timestamp,
        };
      }
    }

    // Update digital twin state with latest sensor data
    const updatedState = {
      ...((digitalTwin.state as Record<string, unknown>) || {}),
      sensorData: latestMetrics,
      lastSyncedDevices: devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        status: d.status,
      })),
      syncTimestamp: new Date().toISOString(),
    };

    const updated = await prisma.digitalTwin.update({
      where: { id: digitalTwinId },
      data: {
        state: updatedState as any,
        lastSyncTime: new Date(),
      },
    });

    return new DigitalTwin(updated as DigitalTwinData);
  }

  /**
   * Update digital twin parameters
   */
  async updateParameters(
    digitalTwinId: string,
    parameters: Record<string, number>
  ): Promise<DigitalTwin> {
    const updated = await prisma.digitalTwin.update({
      where: { id: digitalTwinId },
      data: { parameters: parameters as any },
    });

    return new DigitalTwin(updated as DigitalTwinData);
  }

  /**
   * Update digital twin state
   */
  async updateState(
    digitalTwinId: string,
    state: Record<string, unknown>
  ): Promise<DigitalTwin> {
    const updated = await prisma.digitalTwin.update({
      where: { id: digitalTwinId },
      data: { state: state as any },
    });

    return new DigitalTwin(updated as DigitalTwinData);
  }

  /**
   * Deactivate a digital twin
   */
  async deactivateDigitalTwin(digitalTwinId: string): Promise<DigitalTwin> {
    const updated = await prisma.digitalTwin.update({
      where: { id: digitalTwinId },
      data: { isActive: false },
    });

    return new DigitalTwin(updated as DigitalTwinData);
  }

  /**
   * Run a simulation on the digital twin
   */
  async runSimulation(data: {
    digitalTwinId: string;
    simulationName: string;
    simulationType: string;
    inputParameters: Record<string, number>;
  }): Promise<Simulation> {
    // Verify digital twin exists
    const digitalTwin = await prisma.digitalTwin.findUnique({
      where: { id: data.digitalTwinId },
    });

    if (!digitalTwin) {
      throw new Error('Digital twin not found');
    }

    if (!digitalTwin.isActive) {
      throw new Error('Digital twin is not active');
    }

    // Create simulation record
    const simulation = await prisma.simulation.create({
      data: {
        id: uuidv4(),
        digitalTwinId: data.digitalTwinId,
        simulationName: data.simulationName,
        simulationType: data.simulationType,
        inputParameters: data.inputParameters as any,
        outputResults: {},
        startTime: new Date(),
        status: 'running',
      },
    });

    // Run simulation asynchronously (in production, this would be a background job)
    this.executeSimulation(simulation.id, digitalTwin, data.inputParameters).catch((error) => {
      console.error('Simulation execution failed:', error);
    });

    return new Simulation(simulation as SimulationData);
  }

  /**
   * Execute simulation logic (simplified for demonstration)
   */
  private async executeSimulation(
    simulationId: string,
    digitalTwin: any,
    inputParameters: Record<string, number>
  ): Promise<void> {
    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get current state and parameters
      const parameters = (digitalTwin.parameters as Record<string, number>) || {};

      // Perform simulation calculations based on type
      const outputResults: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        digitalTwinId: digitalTwin.id,
        digitalTwinName: digitalTwin.name,
        modelType: digitalTwin.modelType,
      };

      // Example simulation logic based on input parameters
      if (inputParameters.load !== undefined) {
        // Simulate load impact on performance
        const basePerformance = parameters.basePerformance || 100;
        const loadFactor = inputParameters.load / 100;
        const predictedPerformance = basePerformance * (1 - loadFactor * 0.3);
        
        outputResults.predictedPerformance = Math.round(predictedPerformance * 100) / 100;
        outputResults.performanceDegradation = Math.round((basePerformance - predictedPerformance) * 100) / 100;
      }

      if (inputParameters.temperature !== undefined) {
        // Simulate temperature impact on efficiency
        const optimalTemp = parameters.optimalTemperature || 25;
        const tempDiff = Math.abs(inputParameters.temperature - optimalTemp);
        const efficiencyLoss = tempDiff * 0.5; // 0.5% loss per degree
        const predictedEfficiency = Math.max(0, 100 - efficiencyLoss);
        
        outputResults.predictedEfficiency = Math.round(predictedEfficiency * 100) / 100;
        outputResults.temperatureImpact = Math.round(efficiencyLoss * 100) / 100;
      }

      if (inputParameters.operatingHours !== undefined) {
        // Simulate wear and tear over time
        const wearRate = parameters.wearRate || 0.1;
        const predictedWear = inputParameters.operatingHours * wearRate;
        const remainingLife = Math.max(0, 100 - predictedWear);
        
        outputResults.predictedWear = Math.round(predictedWear * 100) / 100;
        outputResults.remainingLife = Math.round(remainingLife * 100) / 100;
        outputResults.maintenanceRecommended = remainingLife < 20;
      }

      // Calculate overall health score
      const healthFactors = [];
      if (outputResults.predictedPerformance) {
        healthFactors.push(outputResults.predictedPerformance as number);
      }
      if (outputResults.predictedEfficiency) {
        healthFactors.push(outputResults.predictedEfficiency as number);
      }
      if (outputResults.remainingLife) {
        healthFactors.push(outputResults.remainingLife as number);
      }

      if (healthFactors.length > 0) {
        const avgHealth = healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length;
        outputResults.overallHealthScore = Math.round(avgHealth * 100) / 100;
      }

      // Add recommendations based on results
      const recommendations: string[] = [];
      if (outputResults.overallHealthScore && (outputResults.overallHealthScore as number) < 70) {
        recommendations.push('Schedule preventive maintenance');
      }
      if (outputResults.temperatureImpact && (outputResults.temperatureImpact as number) > 10) {
        recommendations.push('Optimize operating temperature');
      }
      if (outputResults.maintenanceRecommended) {
        recommendations.push('Component replacement recommended');
      }
      outputResults.recommendations = recommendations;

      // Calculate simulation duration
      const endTime = new Date();
      const startTime = new Date((await prisma.simulation.findUnique({ where: { id: simulationId } }))!.startTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      // Update simulation with results
      await prisma.simulation.update({
        where: { id: simulationId },
        data: {
          status: 'completed',
          endTime,
          duration,
          outputResults: outputResults as any,
        },
      });
    } catch (error: any) {
      // Update simulation with error
      await prisma.simulation.update({
        where: { id: simulationId },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Get simulation by ID
   */
  async getSimulation(simulationId: string): Promise<Simulation | null> {
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
    });

    return simulation ? new Simulation(simulation as SimulationData) : null;
  }

  /**
   * Get simulations for a digital twin
   */
  async getSimulations(
    digitalTwinId: string,
    status?: 'running' | 'completed' | 'failed' | 'cancelled'
  ): Promise<Simulation[]> {
    const simulations = await prisma.simulation.findMany({
      where: {
        digitalTwinId,
        ...(status && { status }),
      },
      orderBy: { startTime: 'desc' },
      take: 50, // Limit to last 50 simulations
    });

    return simulations.map((s) => new Simulation(s as SimulationData));
  }

  /**
   * Cancel a running simulation
   */
  async cancelSimulation(simulationId: string): Promise<Simulation> {
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new Error('Simulation not found');
    }

    if (simulation.status !== 'running') {
      throw new Error('Simulation is not running');
    }

    const updated = await prisma.simulation.update({
      where: { id: simulationId },
      data: {
        status: 'cancelled',
        endTime: new Date(),
      },
    });

    return new Simulation(updated as SimulationData);
  }
}

// Export service instances
export const shopFloorTrackingService = new ShopFloorTrackingService();
export const iotIntegrationService = new IoTIntegrationService();
export const predictiveMaintenanceService = new PredictiveMaintenanceService();
export const digitalTwinService = new DigitalTwinService();

// ============================================================================
// OEE Calculation Service (Task 31.5)
// ============================================================================

export class OEECalculationService {
  /**
   * Calculate OEE metrics for a work center over a date range
   */
  async calculateOEE(data: {
    workCenterId: string;
    assetId?: string;
    startDate: Date;
    endDate: Date;
    idealCycleTime: number; // minutes per unit
  }): Promise<OEEMetrics> {
    const { workCenterId, assetId, startDate, endDate, idealCycleTime } = data;

    // Get all operations for the work center in the date range
    const operations = await prisma.shopFloorOperation.findMany({
      where: {
        workCenterId,
        status: OperationStatus.COMPLETED,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (operations.length === 0) {
      throw new Error('No completed operations found for the specified period');
    }

    // Calculate planned production time (total time available for production)
    const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    const plannedProductionTime = totalMinutes;

    // Calculate actual production time (time when equipment was actually running)
    const actualProductionTime = operations.reduce((sum, op) => {
      return sum + (op.actualDuration || 0);
    }, 0);

    // Calculate downtime
    const downtime = plannedProductionTime - actualProductionTime;

    // Calculate availability
    const availability = OEEMetrics.calculateAvailability(
      actualProductionTime,
      plannedProductionTime
    );

    // Get production output data from production orders
    // For now, we'll estimate based on operations
    const totalUnitsProduced = operations.length * 10; // Simplified: assume 10 units per operation

    // Calculate performance
    const performanceRate = OEEMetrics.calculatePerformance(
      idealCycleTime,
      totalUnitsProduced,
      actualProductionTime
    );

    // Get quality data (good units vs defective units)
    // In a real system, this would come from quality inspection records
    // For now, we'll use a simplified calculation
    const defectRate = 0.05; // Assume 5% defect rate
    const defectiveUnits = Math.round(totalUnitsProduced * defectRate);
    const goodUnits = totalUnitsProduced - defectiveUnits;

    // Calculate quality rate
    const qualityRate = OEEMetrics.calculateQuality(goodUnits, totalUnitsProduced);

    // Calculate overall OEE
    const oee = OEEMetrics.calculateOEE(availability, performanceRate, qualityRate);

    // Store OEE metrics in database
    const oeeMetrics = await prisma.oEEMetrics.create({
      data: {
        id: uuidv4(),
        workCenterId,
        assetId,
        startDate,
        endDate,
        plannedProductionTime,
        actualProductionTime,
        downtime,
        availability,
        idealCycleTime,
        totalUnitsProduced,
        performanceRate,
        goodUnits,
        defectiveUnits,
        qualityRate,
        oee,
        calculatedAt: new Date(),
      },
    });

    return new OEEMetrics(oeeMetrics as OEEMetricsData);
  }

  /**
   * Calculate OEE metrics with actual production data
   */
  async calculateOEEWithProductionData(data: {
    workCenterId: string;
    assetId?: string;
    startDate: Date;
    endDate: Date;
    idealCycleTime: number;
    totalUnitsProduced: number;
    goodUnits: number;
    defectiveUnits: number;
  }): Promise<OEEMetrics> {
    const {
      workCenterId,
      assetId,
      startDate,
      endDate,
      idealCycleTime,
      totalUnitsProduced,
      goodUnits,
      defectiveUnits,
    } = data;

    // Get all operations for the work center in the date range
    const operations = await prisma.shopFloorOperation.findMany({
      where: {
        workCenterId,
        status: OperationStatus.COMPLETED,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate planned production time
    const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    const plannedProductionTime = totalMinutes;

    // Calculate actual production time
    const actualProductionTime = operations.reduce((sum, op) => {
      return sum + (op.actualDuration || 0);
    }, 0);

    // Calculate downtime
    const downtime = plannedProductionTime - actualProductionTime;

    // Calculate availability
    const availability = OEEMetrics.calculateAvailability(
      actualProductionTime,
      plannedProductionTime
    );

    // Calculate performance
    const performanceRate = OEEMetrics.calculatePerformance(
      idealCycleTime,
      totalUnitsProduced,
      actualProductionTime
    );

    // Calculate quality rate
    const qualityRate = OEEMetrics.calculateQuality(goodUnits, totalUnitsProduced);

    // Calculate overall OEE
    const oee = OEEMetrics.calculateOEE(availability, performanceRate, qualityRate);

    // Store OEE metrics in database
    const oeeMetrics = await prisma.oEEMetrics.create({
      data: {
        id: uuidv4(),
        workCenterId,
        assetId,
        startDate,
        endDate,
        plannedProductionTime,
        actualProductionTime,
        downtime,
        availability,
        idealCycleTime,
        totalUnitsProduced,
        performanceRate,
        goodUnits,
        defectiveUnits,
        qualityRate,
        oee,
        calculatedAt: new Date(),
      },
    });

    return new OEEMetrics(oeeMetrics as OEEMetricsData);
  }

  /**
   * Get OEE metrics by ID
   */
  async getOEEMetrics(id: string): Promise<OEEMetrics | null> {
    const metrics = await prisma.oEEMetrics.findUnique({
      where: { id },
    });

    return metrics ? new OEEMetrics(metrics as OEEMetricsData) : null;
  }

  /**
   * Get OEE metrics for a work center
   */
  async getOEEMetricsByWorkCenter(
    workCenterId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OEEMetrics[]> {
    const metrics = await prisma.oEEMetrics.findMany({
      where: {
        workCenterId,
        ...(startDate &&
          endDate && {
            startDate: {
              gte: startDate,
            },
            endDate: {
              lte: endDate,
            },
          }),
      },
      orderBy: { startDate: 'desc' },
    });

    return metrics.map((m) => new OEEMetrics(m as OEEMetricsData));
  }

  /**
   * Get OEE metrics for an asset
   */
  async getOEEMetricsByAsset(
    assetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OEEMetrics[]> {
    const metrics = await prisma.oEEMetrics.findMany({
      where: {
        assetId,
        ...(startDate &&
          endDate && {
            startDate: {
              gte: startDate,
            },
            endDate: {
              lte: endDate,
            },
          }),
      },
      orderBy: { startDate: 'desc' },
    });

    return metrics.map((m) => new OEEMetrics(m as OEEMetricsData));
  }

  /**
   * Get OEE trend data for a work center
   */
  async getOEETrend(
    workCenterId: string,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<
    Array<{
      period: string;
      availability: number;
      performance: number;
      quality: number;
      oee: number;
      count: number;
    }>
  > {
    const metrics = await prisma.oEEMetrics.findMany({
      where: {
        workCenterId,
        startDate: {
          gte: startDate,
        },
        endDate: {
          lte: endDate,
        },
      },
      orderBy: { startDate: 'asc' },
    });

    if (metrics.length === 0) {
      return [];
    }

    // Group metrics by interval
    const grouped = new Map<
      string,
      {
        availability: number[];
        performance: number[];
        quality: number[];
        oee: number[];
      }
    >();

    for (const metric of metrics) {
      let period: string;

      if (interval === 'daily') {
        period = metric.startDate.toISOString().split('T')[0];
      } else if (interval === 'weekly') {
        const weekStart = new Date(metric.startDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        period = weekStart.toISOString().split('T')[0];
      } else {
        // monthly
        period = `${metric.startDate.getFullYear()}-${String(
          metric.startDate.getMonth() + 1
        ).padStart(2, '0')}`;
      }

      if (!grouped.has(period)) {
        grouped.set(period, {
          availability: [],
          performance: [],
          quality: [],
          oee: [],
        });
      }

      const group = grouped.get(period)!;
      group.availability.push(metric.availability);
      group.performance.push(metric.performanceRate);
      group.quality.push(metric.qualityRate);
      group.oee.push(metric.oee);
    }

    // Calculate averages for each period
    const trend = Array.from(grouped.entries()).map(([period, data]) => {
      const avg = (arr: number[]) =>
        Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

      return {
        period,
        availability: avg(data.availability),
        performance: avg(data.performance),
        quality: avg(data.quality),
        oee: avg(data.oee),
        count: data.oee.length,
      };
    });

    return trend;
  }

  /**
   * Generate OEE report for a work center
   */
  async generateOEEReport(
    workCenterId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    workCenterId: string;
    period: { startDate: Date; endDate: Date };
    summary: {
      averageOEE: number;
      averageAvailability: number;
      averagePerformance: number;
      averageQuality: number;
      totalDowntime: number;
      totalUnitsProduced: number;
      totalGoodUnits: number;
      totalDefectiveUnits: number;
    };
    metrics: OEEMetrics[];
    trend: Array<{
      period: string;
      availability: number;
      performance: number;
      quality: number;
      oee: number;
      count: number;
    }>;
  }> {
    // Get all metrics for the period
    const metrics = await this.getOEEMetricsByWorkCenter(workCenterId, startDate, endDate);

    if (metrics.length === 0) {
      throw new Error('No OEE metrics found for the specified period');
    }

    // Calculate summary statistics
    const summary = {
      averageOEE: Math.round(
        (metrics.reduce((sum, m) => sum + m.oee, 0) / metrics.length) * 100
      ) / 100,
      averageAvailability: Math.round(
        (metrics.reduce((sum, m) => sum + m.availability, 0) / metrics.length) * 100
      ) / 100,
      averagePerformance: Math.round(
        (metrics.reduce((sum, m) => sum + m.performanceRate, 0) / metrics.length) * 100
      ) / 100,
      averageQuality: Math.round(
        (metrics.reduce((sum, m) => sum + m.qualityRate, 0) / metrics.length) * 100
      ) / 100,
      totalDowntime: metrics.reduce((sum, m) => sum + m.downtime, 0),
      totalUnitsProduced: metrics.reduce((sum, m) => sum + m.totalUnitsProduced, 0),
      totalGoodUnits: metrics.reduce((sum, m) => sum + m.goodUnits, 0),
      totalDefectiveUnits: metrics.reduce((sum, m) => sum + m.defectiveUnits, 0),
    };

    // Get trend data
    const trend = await this.getOEETrend(workCenterId, startDate, endDate, 'daily');

    return {
      workCenterId,
      period: { startDate, endDate },
      summary,
      metrics,
      trend,
    };
  }

  /**
   * Compare OEE across multiple work centers
   */
  async compareOEEAcrossWorkCenters(
    workCenterIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      workCenterId: string;
      averageOEE: number;
      averageAvailability: number;
      averagePerformance: number;
      averageQuality: number;
      metricsCount: number;
    }>
  > {
    const comparisons = await Promise.all(
      workCenterIds.map(async (workCenterId) => {
        const metrics = await this.getOEEMetricsByWorkCenter(
          workCenterId,
          startDate,
          endDate
        );

        if (metrics.length === 0) {
          return {
            workCenterId,
            averageOEE: 0,
            averageAvailability: 0,
            averagePerformance: 0,
            averageQuality: 0,
            metricsCount: 0,
          };
        }

        return {
          workCenterId,
          averageOEE: Math.round(
            (metrics.reduce((sum, m) => sum + m.oee, 0) / metrics.length) * 100
          ) / 100,
          averageAvailability: Math.round(
            (metrics.reduce((sum, m) => sum + m.availability, 0) / metrics.length) * 100
          ) / 100,
          averagePerformance: Math.round(
            (metrics.reduce((sum, m) => sum + m.performanceRate, 0) / metrics.length) * 100
          ) / 100,
          averageQuality: Math.round(
            (metrics.reduce((sum, m) => sum + m.qualityRate, 0) / metrics.length) * 100
          ) / 100,
          metricsCount: metrics.length,
        };
      })
    );

    return comparisons;
  }

  /**
   * Get OEE insights and recommendations
   */
  async getOEEInsights(
    workCenterId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    currentOEE: number;
    insights: Array<{
      category: 'availability' | 'performance' | 'quality';
      metric: string;
      value: number;
      target: number;
      gap: number;
      recommendation: string;
    }>;
  }> {
    const metrics = await this.getOEEMetricsByWorkCenter(workCenterId, startDate, endDate);

    if (metrics.length === 0) {
      throw new Error('No OEE metrics found for the specified period');
    }

    // Calculate averages
    const avgOEE = metrics.reduce((sum, m) => sum + m.oee, 0) / metrics.length;
    const avgAvailability = metrics.reduce((sum, m) => sum + m.availability, 0) / metrics.length;
    const avgPerformance = metrics.reduce((sum, m) => sum + m.performanceRate, 0) / metrics.length;
    const avgQuality = metrics.reduce((sum, m) => sum + m.qualityRate, 0) / metrics.length;

    // Define targets (industry standard: 85% OEE, 90% availability, 95% performance, 99% quality)
    const targets = {
      availability: 90,
      performance: 95,
      quality: 99,
    };

    const insights: Array<{
      category: 'availability' | 'performance' | 'quality';
      metric: string;
      value: number;
      target: number;
      gap: number;
      recommendation: string;
    }> = [];

    // Availability insights
    if (avgAvailability < targets.availability) {
      const gap = targets.availability - avgAvailability;
      insights.push({
        category: 'availability',
        metric: 'Availability',
        value: Math.round(avgAvailability * 100) / 100,
        target: targets.availability,
        gap: Math.round(gap * 100) / 100,
        recommendation:
          gap > 20
            ? 'Critical: Reduce unplanned downtime through preventive maintenance'
            : gap > 10
            ? 'Implement predictive maintenance to reduce equipment failures'
            : 'Optimize changeover times and reduce planned downtime',
      });
    }

    // Performance insights
    if (avgPerformance < targets.performance) {
      const gap = targets.performance - avgPerformance;
      insights.push({
        category: 'performance',
        metric: 'Performance',
        value: Math.round(avgPerformance * 100) / 100,
        target: targets.performance,
        gap: Math.round(gap * 100) / 100,
        recommendation:
          gap > 20
            ? 'Critical: Address speed losses and minor stoppages'
            : gap > 10
            ? 'Optimize cycle times and reduce micro-stops'
            : 'Fine-tune equipment settings for optimal speed',
      });
    }

    // Quality insights
    if (avgQuality < targets.quality) {
      const gap = targets.quality - avgQuality;
      insights.push({
        category: 'quality',
        metric: 'Quality',
        value: Math.round(avgQuality * 100) / 100,
        target: targets.quality,
        gap: Math.round(gap * 100) / 100,
        recommendation:
          gap > 10
            ? 'Critical: Implement quality control measures and root cause analysis'
            : gap > 5
            ? 'Improve process controls and operator training'
            : 'Implement statistical process control for consistency',
      });
    }

    return {
      currentOEE: Math.round(avgOEE * 100) / 100,
      insights,
    };
  }
}

export const oeeCalculationService = new OEECalculationService();

// ============================================================================
// Production Monitoring Service (Task 31.6)
// ============================================================================

export class ProductionMonitoringService {
  /**
   * Get real-time production status for all work centers
   */
  async getAllProductionStatus(): Promise<any[]> {
    const statuses = await prisma.productionStatus.findMany({
      orderBy: { lastUpdated: 'desc' },
    });

    // Enrich with current operation details
    const enrichedStatuses = await Promise.all(
      statuses.map(async (status) => {
        let currentOperation = null;
        if (status.currentOperationId) {
          currentOperation = await prisma.shopFloorOperation.findUnique({
            where: { id: status.currentOperationId },
          });
        }

        // Get recent alerts for this work center
        const alerts = await this.getProductionAlerts(status.workCenterId, 10);

        return {
          ...status,
          currentOperation,
          alerts,
        };
      })
    );

    return enrichedStatuses;
  }

  /**
   * Get production status for a specific work center
   */
  async getProductionStatus(workCenterId: string): Promise<any> {
    const status = await prisma.productionStatus.findUnique({
      where: { workCenterId },
    });

    if (!status) {
      return {
        workCenterId,
        workCenterName: `Work Center ${workCenterId}`,
        status: 'idle',
        currentOperation: null,
        currentProductionOrder: null,
        currentProduct: null,
        unitsProduced: 0,
        targetUnits: 0,
        efficiency: 0,
        alerts: [],
        lastUpdated: new Date(),
      };
    }

    // Get current operation details
    let currentOperation = null;
    if (status.currentOperationId) {
      currentOperation = await prisma.shopFloorOperation.findUnique({
        where: { id: status.currentOperationId },
      });
    }

    // Get recent alerts
    const alerts = await this.getProductionAlerts(workCenterId, 10);

    // Get today's production metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOperations = await prisma.shopFloorOperation.findMany({
      where: {
        workCenterId,
        status: OperationStatus.COMPLETED,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const unitsProduced = todayOperations.length * 10; // Simplified: 10 units per operation
    const targetUnits = 100; // Simplified target
    const avgEfficiency = todayOperations.length > 0
      ? todayOperations.reduce((sum, op) => sum + (op.efficiency || 0), 0) / todayOperations.length
      : 0;

    return {
      ...status,
      currentOperation,
      unitsProduced,
      targetUnits,
      efficiency: Math.round(avgEfficiency),
      alerts,
    };
  }

  /**
   * Get production alerts for a work center
   */
  async getProductionAlerts(
    workCenterId: string,
    limit: number = 50
  ): Promise<any[]> {
    const alerts = await prisma.productionAlert.findMany({
      where: { workCenterId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return alerts;
  }

  /**
   * Create a production alert
   */
  async createProductionAlert(data: {
    workCenterId: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    const alert = await prisma.productionAlert.create({
      data: {
        id: uuidv4(),
        workCenterId: data.workCenterId,
        severity: data.severity,
        message: data.message,
        timestamp: new Date(),
        acknowledged: false,
        metadata: data.metadata as any,
      },
    });

    return alert;
  }

  /**
   * Acknowledge a production alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<any> {
    const alert = await prisma.productionAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });

    return alert;
  }

  /**
   * Get production dashboard data
   */
  async getProductionDashboard(): Promise<{
    overview: {
      totalWorkCenters: number;
      activeWorkCenters: number;
      idleWorkCenters: number;
      workCentersWithIssues: number;
      totalUnitsProduced: number;
      averageEfficiency: number;
    };
    workCenters: any[];
    recentAlerts: any[];
    oeeMetrics?: any;
  }> {
    // Get all production statuses
    const statuses = await this.getAllProductionStatus();

    // Calculate overview metrics
    const totalWorkCenters = statuses.length;
    const activeWorkCenters = statuses.filter((s) => s.status === 'running').length;
    const idleWorkCenters = statuses.filter((s) => s.status === 'idle').length;
    const workCentersWithIssues = statuses.filter(
      (s) => s.status === 'breakdown' || s.status === 'maintenance'
    ).length;

    // Get today's production metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOperations = await prisma.shopFloorOperation.findMany({
      where: {
        status: OperationStatus.COMPLETED,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const totalUnitsProduced = todayOperations.length * 10; // Simplified
    const averageEfficiency = todayOperations.length > 0
      ? Math.round(
          todayOperations.reduce((sum, op) => sum + (op.efficiency || 0), 0) /
            todayOperations.length
        )
      : 0;

    // Get recent alerts (last 20)
    const recentAlerts = await prisma.productionAlert.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Get latest OEE metrics for active work centers
    let oeeMetrics = null;
    if (activeWorkCenters > 0) {
      const activeWorkCenterIds = statuses
        .filter((s) => s.status === 'running')
        .map((s) => s.workCenterId);

      if (activeWorkCenterIds.length > 0) {
        const latestOEE = await prisma.oEEMetrics.findFirst({
          where: {
            workCenterId: { in: activeWorkCenterIds },
          },
          orderBy: { calculatedAt: 'desc' },
        });

        oeeMetrics = latestOEE;
      }
    }

    return {
      overview: {
        totalWorkCenters,
        activeWorkCenters,
        idleWorkCenters,
        workCentersWithIssues,
        totalUnitsProduced,
        averageEfficiency,
      },
      workCenters: statuses,
      recentAlerts,
      oeeMetrics,
    };
  }

  /**
   * Monitor production and generate alerts automatically
   */
  async monitorProduction(): Promise<void> {
    const statuses = await prisma.productionStatus.findMany();

    for (const status of statuses) {
      // Check for long-running operations (over 2x planned duration)
      if (status.currentOperationId) {
        const operation = await prisma.shopFloorOperation.findUnique({
          where: { id: status.currentOperationId },
        });

        if (operation && operation.startTime) {
          const runningMinutes = Math.round(
            (Date.now() - operation.startTime.getTime()) / 60000
          );

          if (runningMinutes > operation.plannedDuration * 2) {
            await this.createProductionAlert({
              workCenterId: status.workCenterId,
              severity: 'warning',
              message: `Operation ${operation.operationName} is running ${runningMinutes} minutes (planned: ${operation.plannedDuration} minutes)`,
              metadata: {
                operationId: operation.id,
                productionOrderId: operation.productionOrderId,
                runningMinutes,
                plannedDuration: operation.plannedDuration,
              },
            });
          }
        }
      }

      // Check for idle work centers during production hours
      const currentHour = new Date().getHours();
      if (status.status === 'idle' && currentHour >= 8 && currentHour < 17) {
        const lastUpdate = new Date(status.lastUpdated);
        const idleMinutes = Math.round((Date.now() - lastUpdate.getTime()) / 60000);

        if (idleMinutes > 30) {
          await this.createProductionAlert({
            workCenterId: status.workCenterId,
            severity: 'info',
            message: `Work center ${status.workCenterName} has been idle for ${idleMinutes} minutes`,
            metadata: {
              idleMinutes,
              lastUpdated: status.lastUpdated,
            },
          });
        }
      }

      // Check for breakdown status
      if (status.status === 'breakdown') {
        await this.createProductionAlert({
          workCenterId: status.workCenterId,
          severity: 'critical',
          message: `Work center ${status.workCenterName} is in breakdown status`,
          metadata: {
            status: status.status,
          },
        });
      }
    }
  }

  /**
   * Get production performance metrics for a date range
   */
  async getProductionPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalOperations: number;
    completedOperations: number;
    averageEfficiency: number;
    totalDowntime: number;
    topPerformingWorkCenters: Array<{
      workCenterId: string;
      efficiency: number;
      operationsCount: number;
    }>;
  }> {
    const operations = await prisma.shopFloorOperation.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const completedOperations = operations.filter(
      (op) => op.status === OperationStatus.COMPLETED
    );

    const averageEfficiency = completedOperations.length > 0
      ? Math.round(
          completedOperations.reduce((sum, op) => sum + (op.efficiency || 0), 0) /
            completedOperations.length
        )
      : 0;

    // Calculate total downtime from OEE metrics
    const oeeMetrics = await prisma.oEEMetrics.findMany({
      where: {
        startDate: {
          gte: startDate,
        },
        endDate: {
          lte: endDate,
        },
      },
    });

    const totalDowntime = oeeMetrics.reduce((sum, m) => sum + m.downtime, 0);

    // Calculate top performing work centers
    const workCenterPerformance = new Map<
      string,
      { totalEfficiency: number; count: number }
    >();

    for (const op of completedOperations) {
      if (!workCenterPerformance.has(op.workCenterId)) {
        workCenterPerformance.set(op.workCenterId, { totalEfficiency: 0, count: 0 });
      }
      const perf = workCenterPerformance.get(op.workCenterId)!;
      perf.totalEfficiency += op.efficiency || 0;
      perf.count += 1;
    }

    const topPerformingWorkCenters = Array.from(workCenterPerformance.entries())
      .map(([workCenterId, perf]) => ({
        workCenterId,
        efficiency: Math.round(perf.totalEfficiency / perf.count),
        operationsCount: perf.count,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    return {
      totalOperations: operations.length,
      completedOperations: completedOperations.length,
      averageEfficiency,
      totalDowntime,
      topPerformingWorkCenters,
    };
  }
}

export const productionMonitoringService = new ProductionMonitoringService();
