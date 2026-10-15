/**
 * Industry 4.0 Controller
 * Handles HTTP requests for shop floor tracking, IoT integration, predictive maintenance, digital twins, and OEE
 */

import { Request, Response } from 'express';
import {
  shopFloorTrackingService,
  iotIntegrationService,
  predictiveMaintenanceService,
  digitalTwinService,
  oeeCalculationService,
} from '../services/industry40.service';
import { OperationStatus, DeviceStatus } from '../models/Industry40';

// ============================================================================
// Shop Floor Tracking Controllers (Task 31.1)
// ============================================================================

export const startShopFloorOperation = async (req: Request, res: Response) => {
  try {
    const {
      productionOrderId,
      workCenterId,
      operationId,
      operationName,
      plannedDuration,
      operatorId,
      operatorName,
    } = req.body;

    if (!productionOrderId || !workCenterId || !operationId || !operationName || !plannedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const operation = await shopFloorTrackingService.startOperation({
      productionOrderId,
      workCenterId,
      operationId,
      operationName,
      plannedDuration,
      operatorId,
      operatorName,
    });

    res.status(201).json({
      success: true,
      data: operation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const completeShopFloorOperation = async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;

    const operation = await shopFloorTrackingService.completeOperation(operationId);

    res.json({
      success: true,
      data: operation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const pauseShopFloorOperation = async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;

    const operation = await shopFloorTrackingService.pauseOperation(operationId);

    res.json({
      success: true,
      data: operation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const resumeShopFloorOperation = async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;

    const operation = await shopFloorTrackingService.resumeOperation(operationId);

    res.json({
      success: true,
      data: operation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOperationsByWorkCenter = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { status } = req.query;

    const operations = await shopFloorTrackingService.getOperationsByWorkCenter(
      workCenterId,
      status as OperationStatus
    );

    res.json({
      success: true,
      data: operations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOperationsByProductionOrder = async (req: Request, res: Response) => {
  try {
    const { productionOrderId } = req.params;

    const operations = await shopFloorTrackingService.getOperationsByProductionOrder(
      productionOrderId
    );

    res.json({
      success: true,
      data: operations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// IoT Integration Controllers (Task 31.2)
// ============================================================================

export const registerIoTDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceName, deviceType, workCenterId, assetId, configuration, location } =
      req.body;

    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const device = await iotIntegrationService.registerDevice({
      deviceId,
      deviceName,
      deviceType,
      workCenterId,
      assetId,
      configuration,
      location,
    });

    res.status(201).json({
      success: true,
      data: device,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const ingestSensorData = async (req: Request, res: Response) => {
  try {
    const { deviceId, metrics } = req.body;

    if (!deviceId || !metrics || !Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: deviceId and metrics array required',
      });
    }

    const sensorMetrics = await iotIntegrationService.ingestSensorData({
      deviceId,
      metrics,
    });

    res.status(201).json({
      success: true,
      data: sensorMetrics,
      count: sensorMetrics.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSensorData = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { metricName, startDate, endDate } = req.query;

    const metrics = await iotIntegrationService.getSensorData(
      deviceId,
      metricName as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getIoTDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await iotIntegrationService.getDevice(deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    res.json({
      success: true,
      data: device,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDevicesByWorkCenter = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;

    const devices = await iotIntegrationService.getDevicesByWorkCenter(workCenterId);

    res.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDevicesByAsset = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    const devices = await iotIntegrationService.getDevicesByAsset(assetId);

    res.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDeviceStatus = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const device = await iotIntegrationService.updateDeviceStatus(
      deviceId,
      status as DeviceStatus
    );

    res.json({
      success: true,
      data: device,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// Predictive Maintenance Controllers (Task 31.3)
// ============================================================================

export const calculateEquipmentHealth = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { assetName } = req.query;

    const prediction = await predictiveMaintenanceService.predictFailureDate(
      assetId,
      assetName as string || `Asset ${assetId}`
    );

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateMaintenanceTask = async (req: Request, res: Response) => {
  try {
    const { assetId, assetName, taskType, priority, description, scheduledDate, estimatedCost } =
      req.body;

    if (!assetId || !taskType || !priority || !description || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const task = await predictiveMaintenanceService.generateMaintenanceTask({
      assetId,
      assetName: assetName || `Asset ${assetId}`,
      taskType,
      priority,
      description,
      scheduledDate: new Date(scheduledDate),
      estimatedCost,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEquipmentHealthHistory = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    const history = await predictiveMaintenanceService.getEquipmentHealthHistory(assetId);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMaintenanceTasks = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { status } = req.query;

    const tasks = await predictiveMaintenanceService.getMaintenanceTasks(
      assetId,
      status as string
    );

    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const completeMaintenanceTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { actualCost, notes } = req.body;

    const task = await predictiveMaintenanceService.completeMaintenanceTask(
      taskId,
      actualCost,
      notes
    );

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// Digital Twin Controllers (Task 31.4)
// ============================================================================

export const createDigitalTwin = async (req: Request, res: Response) => {
  try {
    const { name, physicalAssetId, modelType, modelVersion, parameters } = req.body;

    if (!name || !physicalAssetId || !modelType || !modelVersion) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, physicalAssetId, modelType, modelVersion',
      });
    }

    const digitalTwin = await digitalTwinService.createDigitalTwin({
      name,
      physicalAssetId,
      modelType,
      modelVersion,
      parameters,
    });

    res.status(201).json({
      success: true,
      data: digitalTwin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDigitalTwin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const digitalTwin = await digitalTwinService.getDigitalTwin(id);

    if (!digitalTwin) {
      return res.status(404).json({
        success: false,
        message: 'Digital twin not found',
      });
    }

    res.json({
      success: true,
      data: digitalTwin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDigitalTwinByAsset = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    const digitalTwin = await digitalTwinService.getDigitalTwinByAsset(assetId);

    if (!digitalTwin) {
      return res.status(404).json({
        success: false,
        message: 'Digital twin not found for this asset',
      });
    }

    res.json({
      success: true,
      data: digitalTwin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllDigitalTwins = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const digitalTwins = await digitalTwinService.getAllDigitalTwins(
      isActive === 'true' ? true : isActive === 'false' ? false : undefined
    );

    res.json({
      success: true,
      data: digitalTwins,
      count: digitalTwins.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const syncDigitalTwinFromIoT = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const digitalTwin = await digitalTwinService.syncFromIoTSensors(id);

    res.json({
      success: true,
      data: digitalTwin,
      message: 'Digital twin synced successfully with IoT sensor data',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDigitalTwinParameters = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;

    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Parameters object is required',
      });
    }

    const digitalTwin = await digitalTwinService.updateParameters(id, parameters);

    res.json({
      success: true,
      data: digitalTwin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDigitalTwinState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    if (!state || typeof state !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'State object is required',
      });
    }

    const digitalTwin = await digitalTwinService.updateState(id, state);

    res.json({
      success: true,
      data: digitalTwin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deactivateDigitalTwin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const digitalTwin = await digitalTwinService.deactivateDigitalTwin(id);

    res.json({
      success: true,
      data: digitalTwin,
      message: 'Digital twin deactivated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const runSimulation = async (req: Request, res: Response) => {
  try {
    const { digitalTwinId, simulationName, simulationType, inputParameters } = req.body;

    if (!digitalTwinId || !simulationName || !simulationType || !inputParameters) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: digitalTwinId, simulationName, simulationType, inputParameters',
      });
    }

    const simulation = await digitalTwinService.runSimulation({
      digitalTwinId,
      simulationName,
      simulationType,
      inputParameters,
    });

    res.status(201).json({
      success: true,
      data: simulation,
      message: 'Simulation started successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSimulation = async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;

    const simulation = await digitalTwinService.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found',
      });
    }

    res.json({
      success: true,
      data: simulation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSimulations = async (req: Request, res: Response) => {
  try {
    const { digitalTwinId } = req.params;
    const { status } = req.query;

    const simulations = await digitalTwinService.getSimulations(
      digitalTwinId,
      status as 'running' | 'completed' | 'failed' | 'cancelled'
    );

    res.json({
      success: true,
      data: simulations,
      count: simulations.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelSimulation = async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;

    const simulation = await digitalTwinService.cancelSimulation(simulationId);

    res.json({
      success: true,
      data: simulation,
      message: 'Simulation cancelled successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// OEE Calculation Controllers (Task 31.5)
// ============================================================================

export const calculateOEE = async (req: Request, res: Response) => {
  try {
    const { workCenterId, assetId, startDate, endDate, idealCycleTime } = req.body;

    if (!workCenterId || !startDate || !endDate || !idealCycleTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workCenterId, startDate, endDate, idealCycleTime',
      });
    }

    const oeeMetrics = await oeeCalculationService.calculateOEE({
      workCenterId,
      assetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      idealCycleTime,
    });

    res.status(201).json({
      success: true,
      data: oeeMetrics,
      message: 'OEE metrics calculated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const calculateOEEWithProductionData = async (req: Request, res: Response) => {
  try {
    const {
      workCenterId,
      assetId,
      startDate,
      endDate,
      idealCycleTime,
      totalUnitsProduced,
      goodUnits,
      defectiveUnits,
    } = req.body;

    if (
      !workCenterId ||
      !startDate ||
      !endDate ||
      !idealCycleTime ||
      totalUnitsProduced === undefined ||
      goodUnits === undefined ||
      defectiveUnits === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: workCenterId, startDate, endDate, idealCycleTime, totalUnitsProduced, goodUnits, defectiveUnits',
      });
    }

    const oeeMetrics = await oeeCalculationService.calculateOEEWithProductionData({
      workCenterId,
      assetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      idealCycleTime,
      totalUnitsProduced,
      goodUnits,
      defectiveUnits,
    });

    res.status(201).json({
      success: true,
      data: oeeMetrics,
      message: 'OEE metrics calculated successfully with production data',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOEEMetrics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const metrics = await oeeCalculationService.getOEEMetrics(id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'OEE metrics not found',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOEEMetricsByWorkCenter = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await oeeCalculationService.getOEEMetricsByWorkCenter(
      workCenterId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOEEMetricsByAsset = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await oeeCalculationService.getOEEMetricsByAsset(
      assetId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOEETrend = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { startDate, endDate, interval } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const trend = await oeeCalculationService.getOEETrend(
      workCenterId,
      new Date(startDate as string),
      new Date(endDate as string),
      (interval as 'daily' | 'weekly' | 'monthly') || 'daily'
    );

    res.json({
      success: true,
      data: trend,
      count: trend.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateOEEReport = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const report = await oeeCalculationService.generateOEEReport(
      workCenterId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const compareOEEAcrossWorkCenters = async (req: Request, res: Response) => {
  try {
    const { workCenterIds, startDate, endDate } = req.body;

    if (!workCenterIds || !Array.isArray(workCenterIds) || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'workCenterIds (array), startDate, and endDate are required',
      });
    }

    const comparison = await oeeCalculationService.compareOEEAcrossWorkCenters(
      workCenterIds,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: comparison,
      count: comparison.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOEEInsights = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const insights = await oeeCalculationService.getOEEInsights(
      workCenterId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// Production Monitoring Controllers (Task 31.6)
// ============================================================================

import { productionMonitoringService } from '../services/industry40.service';

/**
 * Get production dashboard data
 */
export const getProductionDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await productionMonitoringService.getProductionDashboard();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all production statuses
 */
export const getAllProductionStatus = async (req: Request, res: Response) => {
  try {
    const statuses = await productionMonitoringService.getAllProductionStatus();

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get production status for a specific work center
 */
export const getProductionStatusByWorkCenter = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;

    const status = await productionMonitoringService.getProductionStatus(workCenterId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get production alerts for a work center
 */
export const getProductionAlerts = async (req: Request, res: Response) => {
  try {
    const { workCenterId } = req.params;
    const { limit } = req.query;

    const alerts = await productionMonitoringService.getProductionAlerts(
      workCenterId,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a production alert
 */
export const createProductionAlert = async (req: Request, res: Response) => {
  try {
    const { workCenterId, severity, message, metadata } = req.body;

    if (!workCenterId || !severity || !message) {
      return res.status(400).json({
        success: false,
        message: 'workCenterId, severity, and message are required',
      });
    }

    const alert = await productionMonitoringService.createProductionAlert({
      workCenterId,
      severity,
      message,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Acknowledge a production alert
 */
export const acknowledgeProductionAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        message: 'acknowledgedBy is required',
      });
    }

    const alert = await productionMonitoringService.acknowledgeAlert(alertId, acknowledgedBy);

    res.json({
      success: true,
      data: alert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get production performance metrics
 */
export const getProductionPerformance = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const performance = await productionMonitoringService.getProductionPerformance(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Render production monitoring dashboard view
 */
export const renderProductionDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await productionMonitoringService.getProductionDashboard();

    res.render('pages/production-monitoring', {
      title: 'Production Monitoring Dashboard',
      dashboard,
    });
  } catch (error: any) {
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load production monitoring dashboard',
      error: error.message,
    });
  }
};
