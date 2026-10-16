/**
 * Industry 4.0 Models
 * Models for shop floor tracking, IoT integration, digital twins, and OEE calculation
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ============================================================================
// Shop Floor Operation Models
// ============================================================================

export enum OperationStatus {
  PLANNED = 'planned',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ShopFloorOperationData extends BaseEntityData {
  productionOrderId: string;
  workCenterId: string;
  operationId: string;
  operationName: string;
  status: OperationStatus;
  startTime?: Date | null;
  endTime?: Date | null;
  plannedDuration: number; // minutes
  actualDuration?: number | null; // minutes
  operatorId?: string | null;
  operatorName?: string | null;
  efficiency?: number | null; // percentage
  notes?: string | null;
}

export class ShopFloorOperation extends BaseEntity {
  productionOrderId: string;
  workCenterId: string;
  operationId: string;
  operationName: string;
  status: OperationStatus;
  startTime?: Date | null;
  endTime?: Date | null;
  plannedDuration: number;
  actualDuration?: number | null;
  operatorId?: string | null;
  operatorName?: string | null;
  efficiency?: number | null;
  notes?: string | null;

  constructor(data: ShopFloorOperationData) {
    super(data);
    this.productionOrderId = data.productionOrderId;
    this.workCenterId = data.workCenterId;
    this.operationId = data.operationId;
    this.operationName = data.operationName;
    this.status = data.status;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.plannedDuration = data.plannedDuration;
    this.actualDuration = data.actualDuration;
    this.operatorId = data.operatorId;
    this.operatorName = data.operatorName;
    this.efficiency = data.efficiency;
    this.notes = data.notes;
  }

  /**
   * Calculate operation efficiency
   * Efficiency = (Planned Duration / Actual Duration) * 100
   */
  calculateEfficiency(): number {
    if (!this.actualDuration || this.actualDuration === 0) {
      return 0;
    }
    return Math.round((this.plannedDuration / this.actualDuration) * 100);
  }

  /**
   * Calculate actual duration from start and end times
   */
  calculateActualDuration(): number | null {
    if (!this.startTime || !this.endTime) {
      return null;
    }
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    return Math.round(durationMs / 60000); // Convert to minutes
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      productionOrderId: this.productionOrderId,
      workCenterId: this.workCenterId,
      operationId: this.operationId,
      operationName: this.operationName,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      plannedDuration: this.plannedDuration,
      actualDuration: this.actualDuration,
      operatorId: this.operatorId,
      operatorName: this.operatorName,
      efficiency: this.efficiency,
      notes: this.notes,
    };
  }
}

// ============================================================================
// IoT Device Models
// ============================================================================

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export interface IoTDeviceData extends BaseEntityData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  workCenterId?: string | null;
  assetId?: string | null;
  status: DeviceStatus;
  lastHeartbeat?: Date | null;
  configuration?: Record<string, unknown> | null;
  location?: string | null;
}

export class IoTDevice extends BaseEntity {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  workCenterId?: string | null;
  assetId?: string | null;
  status: DeviceStatus;
  lastHeartbeat?: Date | null;
  configuration?: Record<string, unknown> | null;
  location?: string | null;

  constructor(data: IoTDeviceData) {
    super(data);
    this.deviceId = data.deviceId;
    this.deviceName = data.deviceName;
    this.deviceType = data.deviceType;
    this.workCenterId = data.workCenterId;
    this.assetId = data.assetId;
    this.status = data.status;
    this.lastHeartbeat = data.lastHeartbeat;
    this.configuration = data.configuration;
    this.location = data.location;
  }

  /**
   * Check if device is online (heartbeat within last 5 minutes)
   */
  isOnline(): boolean {
    if (!this.lastHeartbeat) {
      return false;
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastHeartbeat > fiveMinutesAgo;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      workCenterId: this.workCenterId,
      assetId: this.assetId,
      status: this.status,
      lastHeartbeat: this.lastHeartbeat,
      configuration: this.configuration,
      location: this.location,
    };
  }
}

// ============================================================================
// Sensor Data Models
// ============================================================================

export interface SensorMetricData {
  id: string;
  deviceId: string;
  metricName: string;
  metricValue: number;
  unit: string;
  timestamp: Date;
  quality?: string | null; // good, bad, uncertain
  metadata?: Record<string, unknown> | null;
}

export class SensorMetric {
  id: string;
  deviceId: string;
  metricName: string;
  metricValue: number;
  unit: string;
  timestamp: Date;
  quality?: string | null;
  metadata?: Record<string, unknown> | null;

  constructor(data: SensorMetricData) {
    this.id = data.id;
    this.deviceId = data.deviceId;
    this.metricName = data.metricName;
    this.metricValue = data.metricValue;
    this.unit = data.unit;
    this.timestamp = data.timestamp;
    this.quality = data.quality;
    this.metadata = data.metadata;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      deviceId: this.deviceId,
      metricName: this.metricName,
      metricValue: this.metricValue,
      unit: this.unit,
      timestamp: this.timestamp,
      quality: this.quality,
      metadata: this.metadata,
    };
  }
}

// ============================================================================
// Digital Twin Models
// ============================================================================

export interface DigitalTwinData extends BaseEntityData {
  name: string;
  physicalAssetId: string;
  modelType: string;
  modelVersion: string;
  parameters: Record<string, number>;
  state: Record<string, unknown>;
  lastSyncTime?: Date | null;
  isActive: boolean;
}

export class DigitalTwin extends BaseEntity {
  name: string;
  physicalAssetId: string;
  modelType: string;
  modelVersion: string;
  parameters: Record<string, number>;
  state: Record<string, unknown>;
  lastSyncTime?: Date | null;
  isActive: boolean;

  constructor(data: DigitalTwinData) {
    super(data);
    this.name = data.name;
    this.physicalAssetId = data.physicalAssetId;
    this.modelType = data.modelType;
    this.modelVersion = data.modelVersion;
    this.parameters = data.parameters;
    this.state = data.state;
    this.lastSyncTime = data.lastSyncTime;
    this.isActive = data.isActive;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      physicalAssetId: this.physicalAssetId,
      modelType: this.modelType,
      modelVersion: this.modelVersion,
      parameters: this.parameters,
      state: this.state,
      lastSyncTime: this.lastSyncTime,
      isActive: this.isActive,
    };
  }
}

// ============================================================================
// Simulation Models
// ============================================================================

export interface SimulationData extends BaseEntityData {
  digitalTwinId: string;
  simulationName: string;
  simulationType: string;
  inputParameters: Record<string, number>;
  outputResults: Record<string, unknown>;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null; // seconds
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string | null;
}

export class Simulation extends BaseEntity {
  digitalTwinId: string;
  simulationName: string;
  simulationType: string;
  inputParameters: Record<string, number>;
  outputResults: Record<string, unknown>;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string | null;

  constructor(data: SimulationData) {
    super(data);
    this.digitalTwinId = data.digitalTwinId;
    this.simulationName = data.simulationName;
    this.simulationType = data.simulationType;
    this.inputParameters = data.inputParameters;
    this.outputResults = data.outputResults;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.duration;
    this.status = data.status;
    this.errorMessage = data.errorMessage;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      digitalTwinId: this.digitalTwinId,
      simulationName: this.simulationName,
      simulationType: this.simulationType,
      inputParameters: this.inputParameters,
      outputResults: this.outputResults,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      errorMessage: this.errorMessage,
    };
  }
}

// ============================================================================
// OEE (Overall Equipment Effectiveness) Models
// ============================================================================

export interface OEEMetricsData {
  id: string;
  workCenterId: string;
  assetId?: string | null;
  startDate: Date;
  endDate: Date;
  // Availability metrics
  plannedProductionTime: number; // minutes
  actualProductionTime: number; // minutes
  downtime: number; // minutes
  availability: number; // percentage
  // Performance metrics
  idealCycleTime: number; // minutes per unit
  totalUnitsProduced: number;
  performanceRate: number; // percentage
  // Quality metrics
  goodUnits: number;
  defectiveUnits: number;
  qualityRate: number; // percentage
  // Overall OEE
  oee: number; // percentage
  calculatedAt: Date;
}

export class OEEMetrics {
  id: string;
  workCenterId: string;
  assetId?: string | null;
  startDate: Date;
  endDate: Date;
  plannedProductionTime: number;
  actualProductionTime: number;
  downtime: number;
  availability: number;
  idealCycleTime: number;
  totalUnitsProduced: number;
  performanceRate: number;
  goodUnits: number;
  defectiveUnits: number;
  qualityRate: number;
  oee: number;
  calculatedAt: Date;

  constructor(data: OEEMetricsData) {
    this.id = data.id;
    this.workCenterId = data.workCenterId;
    this.assetId = data.assetId;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.plannedProductionTime = data.plannedProductionTime;
    this.actualProductionTime = data.actualProductionTime;
    this.downtime = data.downtime;
    this.availability = data.availability;
    this.idealCycleTime = data.idealCycleTime;
    this.totalUnitsProduced = data.totalUnitsProduced;
    this.performanceRate = data.performanceRate;
    this.goodUnits = data.goodUnits;
    this.defectiveUnits = data.defectiveUnits;
    this.qualityRate = data.qualityRate;
    this.oee = data.oee;
    this.calculatedAt = data.calculatedAt;
  }

  /**
   * Calculate OEE from availability, performance, and quality
   * OEE = Availability × Performance × Quality
   */
  static calculateOEE(availability: number, performance: number, quality: number): number {
    return Math.round((availability / 100) * (performance / 100) * (quality / 100) * 100);
  }

  /**
   * Calculate availability
   * Availability = (Actual Production Time / Planned Production Time) × 100
   */
  static calculateAvailability(actualTime: number, plannedTime: number): number {
    if (plannedTime === 0) return 0;
    return Math.round((actualTime / plannedTime) * 100);
  }

  /**
   * Calculate performance
   * Performance = (Ideal Cycle Time × Total Units) / Actual Production Time × 100
   */
  static calculatePerformance(
    idealCycleTime: number,
    totalUnits: number,
    actualTime: number
  ): number {
    if (actualTime === 0) return 0;
    const idealTime = idealCycleTime * totalUnits;
    return Math.round((idealTime / actualTime) * 100);
  }

  /**
   * Calculate quality
   * Quality = (Good Units / Total Units) × 100
   */
  static calculateQuality(goodUnits: number, totalUnits: number): number {
    if (totalUnits === 0) return 0;
    return Math.round((goodUnits / totalUnits) * 100);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      workCenterId: this.workCenterId,
      assetId: this.assetId,
      startDate: this.startDate,
      endDate: this.endDate,
      plannedProductionTime: this.plannedProductionTime,
      actualProductionTime: this.actualProductionTime,
      downtime: this.downtime,
      availability: this.availability,
      idealCycleTime: this.idealCycleTime,
      totalUnitsProduced: this.totalUnitsProduced,
      performanceRate: this.performanceRate,
      goodUnits: this.goodUnits,
      defectiveUnits: this.defectiveUnits,
      qualityRate: this.qualityRate,
      oee: this.oee,
      calculatedAt: this.calculatedAt,
    };
  }
}

// ============================================================================
// Production Monitoring Models
// ============================================================================

export interface ProductionStatusData {
  workCenterId: string;
  workCenterName: string;
  status: 'idle' | 'running' | 'paused' | 'maintenance' | 'breakdown';
  currentOperation?: ShopFloorOperationData | null;
  currentProductionOrder?: string | null;
  currentProduct?: string | null;
  unitsProduced: number;
  targetUnits: number;
  efficiency: number;
  alerts: ProductionAlert[];
  lastUpdated: Date;
}

export interface ProductionAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class ProductionStatus {
  workCenterId: string;
  workCenterName: string;
  status: 'idle' | 'running' | 'paused' | 'maintenance' | 'breakdown';
  currentOperation?: ShopFloorOperationData | null;
  currentProductionOrder?: string | null;
  currentProduct?: string | null;
  unitsProduced: number;
  targetUnits: number;
  efficiency: number;
  alerts: ProductionAlert[];
  lastUpdated: Date;

  constructor(data: ProductionStatusData) {
    this.workCenterId = data.workCenterId;
    this.workCenterName = data.workCenterName;
    this.status = data.status;
    this.currentOperation = data.currentOperation;
    this.currentProductionOrder = data.currentProductionOrder;
    this.currentProduct = data.currentProduct;
    this.unitsProduced = data.unitsProduced;
    this.targetUnits = data.targetUnits;
    this.efficiency = data.efficiency;
    this.alerts = data.alerts;
    this.lastUpdated = data.lastUpdated;
  }

  toJSON(): Record<string, unknown> {
    return {
      workCenterId: this.workCenterId,
      workCenterName: this.workCenterName,
      status: this.status,
      currentOperation: this.currentOperation,
      currentProductionOrder: this.currentProductionOrder,
      currentProduct: this.currentProduct,
      unitsProduced: this.unitsProduced,
      targetUnits: this.targetUnits,
      efficiency: this.efficiency,
      alerts: this.alerts,
      lastUpdated: this.lastUpdated,
    };
  }
}

// ============================================================================
// Production Scheduling Optimization Models (Task 31.7)
// ============================================================================

export enum SchedulingAlgorithm {
  FIFO = 'fifo', // First In First Out
  SPT = 'spt', // Shortest Processing Time
  EDD = 'edd', // Earliest Due Date
  PRIORITY = 'priority', // Priority-based
  GENETIC = 'genetic', // Genetic Algorithm
}

export interface WorkCenterCapacity {
  workCenterId: string;
  workCenterName: string;
  capacity: number; // units per hour
  availableFrom: Date;
  availableTo: Date;
  currentLoad: number; // percentage
  skills: string[]; // Required skills/capabilities
}

export interface ProductionJob {
  jobId: string;
  productionOrderId: string;
  operationId: string;
  operationName: string;
  productId: string;
  productName: string;
  quantity: number;
  processingTime: number; // minutes
  dueDate?: Date | null;
  priority: number; // 1-10, higher is more urgent
  requiredSkills: string[];
  dependencies: string[]; // Job IDs that must complete first
}

export interface ScheduledJob {
  jobId: string;
  productionOrderId: string;
  operationId: string;
  workCenterId: string;
  workCenterName: string;
  startTime: Date;
  endTime: Date;
  processingTime: number;
  priority: number;
  sequence: number; // Order in the schedule
}

export interface ProductionScheduleData extends BaseEntityData {
  scheduleName: string;
  algorithm: SchedulingAlgorithm;
  startDate: Date;
  endDate: Date;
  workCenters: string[]; // Work center IDs
  scheduledJobs: ScheduledJob[];
  makespan: number; // Total time to complete all jobs (minutes)
  totalThroughput: number; // Total units produced
  averageUtilization: number; // Average work center utilization (percentage)
  constraints: Record<string, unknown>;
  optimizationMetrics: {
    makespanMinimized: boolean;
    throughputMaximized: boolean;
    utilizationOptimized: boolean;
    constraintsSatisfied: boolean;
  };
  status: 'draft' | 'optimized' | 'approved' | 'active' | 'completed' | 'cancelled';
}

export class ProductionSchedule extends BaseEntity {
  scheduleName: string;
  algorithm: SchedulingAlgorithm;
  startDate: Date;
  endDate: Date;
  workCenters: string[];
  scheduledJobs: ScheduledJob[];
  makespan: number;
  totalThroughput: number;
  averageUtilization: number;
  constraints: Record<string, unknown>;
  optimizationMetrics: {
    makespanMinimized: boolean;
    throughputMaximized: boolean;
    utilizationOptimized: boolean;
    constraintsSatisfied: boolean;
  };
  status: 'draft' | 'optimized' | 'approved' | 'active' | 'completed' | 'cancelled';

  constructor(data: ProductionScheduleData) {
    super(data);
    this.scheduleName = data.scheduleName;
    this.algorithm = data.algorithm;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.workCenters = data.workCenters;
    this.scheduledJobs = data.scheduledJobs;
    this.makespan = data.makespan;
    this.totalThroughput = data.totalThroughput;
    this.averageUtilization = data.averageUtilization;
    this.constraints = data.constraints;
    this.optimizationMetrics = data.optimizationMetrics;
    this.status = data.status;
  }

  /**
   * Calculate makespan (total time to complete all jobs)
   */
  calculateMakespan(): number {
    if (this.scheduledJobs.length === 0) return 0;
    
    const latestEndTime = Math.max(
      ...this.scheduledJobs.map(job => job.endTime.getTime())
    );
    const earliestStartTime = Math.min(
      ...this.scheduledJobs.map(job => job.startTime.getTime())
    );
    
    return Math.round((latestEndTime - earliestStartTime) / 60000); // Convert to minutes
  }

  /**
   * Calculate average work center utilization
   */
  calculateAverageUtilization(workCenterCapacities: WorkCenterCapacity[]): number {
    if (workCenterCapacities.length === 0) return 0;
    
    const utilizationSum = workCenterCapacities.reduce(
      (sum, wc) => sum + wc.currentLoad,
      0
    );
    
    return Math.round(utilizationSum / workCenterCapacities.length);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      scheduleName: this.scheduleName,
      algorithm: this.algorithm,
      startDate: this.startDate,
      endDate: this.endDate,
      workCenters: this.workCenters,
      scheduledJobs: this.scheduledJobs,
      makespan: this.makespan,
      totalThroughput: this.totalThroughput,
      averageUtilization: this.averageUtilization,
      constraints: this.constraints,
      optimizationMetrics: this.optimizationMetrics,
      status: this.status,
    };
  }
}

export interface SchedulingConstraint {
  type: 'capacity' | 'skill' | 'dependency' | 'time_window' | 'priority';
  description: string;
  parameters: Record<string, unknown>;
}

export interface OptimizationResult {
  schedule: ProductionSchedule;
  metrics: {
    makespan: number;
    throughput: number;
    utilization: number;
    tardiness: number; // Total delay beyond due dates
    completionRate: number; // Percentage of jobs scheduled
  };
  warnings: string[];
  recommendations: string[];
}
