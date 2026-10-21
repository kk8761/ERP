/**
 * Industry 4.0 Routes
 * Routes for shop floor tracking, IoT integration, predictive maintenance, digital twins, and OEE
 */

import { Router } from 'express';
import * as industry40Controller from '../controllers/industry40.controller';

const router = Router();

// ============================================================================
// Shop Floor Tracking Routes (Task 31.1)
// ============================================================================

// Start a shop floor operation
router.post('/shop-floor/operations/start', industry40Controller.startShopFloorOperation);

// Complete a shop floor operation
router.post('/shop-floor/operations/:operationId/complete', industry40Controller.completeShopFloorOperation);

// Pause a shop floor operation
router.post('/shop-floor/operations/:operationId/pause', industry40Controller.pauseShopFloorOperation);

// Resume a shop floor operation
router.post('/shop-floor/operations/:operationId/resume', industry40Controller.resumeShopFloorOperation);

// Get operations by work center
router.get('/shop-floor/work-centers/:workCenterId/operations', industry40Controller.getOperationsByWorkCenter);

// Get operations by production order
router.get('/shop-floor/production-orders/:productionOrderId/operations', industry40Controller.getOperationsByProductionOrder);

// ============================================================================
// IoT Integration Routes (Task 31.2)
// ============================================================================

// Register a new IoT device
router.post('/iot/devices/register', industry40Controller.registerIoTDevice);

// Ingest sensor data (MQTT/HTTP endpoint)
router.post('/iot/sensor-data/ingest', industry40Controller.ingestSensorData);

// Get sensor data for a device
router.get('/iot/devices/:deviceId/sensor-data', industry40Controller.getSensorData);

// Get IoT device details
router.get('/iot/devices/:deviceId', industry40Controller.getIoTDevice);

// Get devices by work center
router.get('/iot/work-centers/:workCenterId/devices', industry40Controller.getDevicesByWorkCenter);

// Get devices by asset
router.get('/iot/assets/:assetId/devices', industry40Controller.getDevicesByAsset);

// Update device status
router.patch('/iot/devices/:deviceId/status', industry40Controller.updateDeviceStatus);

// ============================================================================
// Predictive Maintenance Routes (Task 31.3)
// ============================================================================

// Calculate equipment health and predict failure
router.get('/predictive-maintenance/assets/:assetId/health', industry40Controller.calculateEquipmentHealth);

// Generate maintenance task
router.post('/predictive-maintenance/tasks', industry40Controller.generateMaintenanceTask);

// Get equipment health history
router.get('/predictive-maintenance/assets/:assetId/health-history', industry40Controller.getEquipmentHealthHistory);

// Get maintenance tasks for an asset
router.get('/predictive-maintenance/assets/:assetId/tasks', industry40Controller.getMaintenanceTasks);

// Complete a maintenance task
router.post('/predictive-maintenance/tasks/:taskId/complete', industry40Controller.completeMaintenanceTask);

// ============================================================================
// Digital Twin Routes (Task 31.4)
// ============================================================================

// Create a digital twin
router.post('/digital-twins', industry40Controller.createDigitalTwin);

// Get all digital twins
router.get('/digital-twins', industry40Controller.getAllDigitalTwins);

// Get digital twin by ID
router.get('/digital-twins/:id', industry40Controller.getDigitalTwin);

// Get digital twin by physical asset ID
router.get('/digital-twins/asset/:assetId', industry40Controller.getDigitalTwinByAsset);

// Sync digital twin with IoT sensor data
router.post('/digital-twins/:id/sync', industry40Controller.syncDigitalTwinFromIoT);

// Update digital twin parameters
router.patch('/digital-twins/:id/parameters', industry40Controller.updateDigitalTwinParameters);

// Update digital twin state
router.patch('/digital-twins/:id/state', industry40Controller.updateDigitalTwinState);

// Deactivate digital twin
router.post('/digital-twins/:id/deactivate', industry40Controller.deactivateDigitalTwin);

// Run simulation on digital twin
router.post('/simulations', industry40Controller.runSimulation);

// Get simulation by ID
router.get('/simulations/:simulationId', industry40Controller.getSimulation);

// Get simulations for a digital twin
router.get('/digital-twins/:digitalTwinId/simulations', industry40Controller.getSimulations);

// Cancel a running simulation
router.post('/simulations/:simulationId/cancel', industry40Controller.cancelSimulation);

// ============================================================================
// OEE Calculation Routes (Task 31.5)
// ============================================================================

// Calculate OEE metrics for a work center
router.post('/oee/calculate', industry40Controller.calculateOEE);

// Calculate OEE metrics with actual production data
router.post('/oee/calculate-with-data', industry40Controller.calculateOEEWithProductionData);

// Get OEE metrics by ID
router.get('/oee/metrics/:id', industry40Controller.getOEEMetrics);

// Get OEE metrics by work center
router.get('/oee/work-centers/:workCenterId/metrics', industry40Controller.getOEEMetricsByWorkCenter);

// Get OEE metrics by asset
router.get('/oee/assets/:assetId/metrics', industry40Controller.getOEEMetricsByAsset);

// Get OEE trend for a work center
router.get('/oee/work-centers/:workCenterId/trend', industry40Controller.getOEETrend);

// Generate OEE report for a work center
router.get('/oee/work-centers/:workCenterId/report', industry40Controller.generateOEEReport);

// Compare OEE across multiple work centers
router.post('/oee/compare', industry40Controller.compareOEEAcrossWorkCenters);

// Get OEE insights and recommendations
router.get('/oee/work-centers/:workCenterId/insights', industry40Controller.getOEEInsights);

export default router;

// ============================================================================
// Production Monitoring Routes (Task 31.6)
// ============================================================================

// Get production dashboard data (API)
router.get('/production-monitoring/dashboard', industry40Controller.getProductionDashboard);

// Get all production statuses
router.get('/production-monitoring/status', industry40Controller.getAllProductionStatus);

// Get production status for a specific work center
router.get('/production-monitoring/work-centers/:workCenterId/status', industry40Controller.getProductionStatusByWorkCenter);

// Get production alerts for a work center
router.get('/production-monitoring/work-centers/:workCenterId/alerts', industry40Controller.getProductionAlerts);

// Create a production alert
router.post('/production-monitoring/alerts', industry40Controller.createProductionAlert);

// Acknowledge a production alert
router.post('/production-monitoring/alerts/:alertId/acknowledge', industry40Controller.acknowledgeProductionAlert);

// Get production performance metrics
router.get('/production-monitoring/performance', industry40Controller.getProductionPerformance);

// Render production monitoring dashboard view (SSR)
router.get('/production-monitoring', industry40Controller.renderProductionDashboard);

// ============================================================================
// Production Scheduling Optimization Routes (Task 31.7)
// ============================================================================

import * as productionSchedulingController from '../controllers/productionScheduling.controller';

// Create optimized production schedule
router.post('/production-scheduling/schedules/optimize', productionSchedulingController.createOptimizedSchedule);

// Get schedule by ID
router.get('/production-scheduling/schedules/:scheduleId', productionSchedulingController.getSchedule);

// Get all schedules
router.get('/production-scheduling/schedules', productionSchedulingController.getAllSchedules);

// Activate a schedule
router.post('/production-scheduling/schedules/:scheduleId/activate', productionSchedulingController.activateSchedule);

// Complete a schedule
router.post('/production-scheduling/schedules/:scheduleId/complete', productionSchedulingController.completeSchedule);

// Compare scheduling algorithms
router.post('/production-scheduling/schedules/compare-algorithms', productionSchedulingController.compareAlgorithms);
