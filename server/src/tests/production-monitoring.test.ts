/**
 * Production Monitoring Tests
 * Tests for Task 31.6 - Production Monitoring Dashboard
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { v4 as uuidv4 } from 'uuid';
import { productionMonitoringService } from '../services/industry40.service';

import prisma from '../config/prisma';

describe('Production Monitoring Service', () => {
  let testWorkCenterId: string;
  let testOperationId: string;

  beforeAll(async () => {
    // Create test data
    testWorkCenterId = 'WC-TEST-001';
    testOperationId = uuidv4();

    // Create a test shop floor operation
    await prisma.shopFloorOperation.create({
      data: {
        id: testOperationId,
        productionOrderId: 'PO-TEST-001',
        workCenterId: testWorkCenterId,
        operationId: 'OP-TEST-001',
        operationName: 'Test Assembly',
        status: 'in_progress',
        startTime: new Date(),
        plannedDuration: 60,
        operatorId: 'EMP-TEST-001',
        operatorName: 'Test Operator',
      },
    });

    // Create a test production status
    await prisma.productionStatus.create({
      data: {
        id: uuidv4(),
        workCenterId: testWorkCenterId,
        workCenterName: 'Test Work Center',
        status: 'running',
        currentOperationId: testOperationId,
        currentProductionOrder: 'PO-TEST-001',
        lastUpdated: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.productionAlert.deleteMany({
      where: { workCenterId: testWorkCenterId },
    });
    await prisma.productionStatus.deleteMany({
      where: { workCenterId: testWorkCenterId },
    });
    await prisma.shopFloorOperation.deleteMany({
      where: { workCenterId: testWorkCenterId },
    });
    await prisma.$disconnect();
  });

  describe('getProductionStatus', () => {
    it('should get production status for a work center', async () => {
      const status = await productionMonitoringService.getProductionStatus(testWorkCenterId);

      expect(status).toBeDefined();
      expect(status.workCenterId).toBe(testWorkCenterId);
      expect(status.workCenterName).toBe('Test Work Center');
      expect(status.status).toBe('running');
      expect(status.currentOperationId).toBe(testOperationId);
      expect(status.currentProductionOrder).toBe('PO-TEST-001');
    });

    it('should return default status for non-existent work center', async () => {
      const status = await productionMonitoringService.getProductionStatus('WC-NONEXISTENT');

      expect(status).toBeDefined();
      expect(status.workCenterId).toBe('WC-NONEXISTENT');
      expect(status.status).toBe('idle');
      expect(status.currentOperation).toBeNull();
    });
  });

  describe('getAllProductionStatus', () => {
    it('should get all production statuses', async () => {
      const statuses = await productionMonitoringService.getAllProductionStatus();

      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);

      const testStatus = statuses.find((s) => s.workCenterId === testWorkCenterId);
      expect(testStatus).toBeDefined();
      expect(testStatus?.status).toBe('running');
    });
  });

  describe('createProductionAlert', () => {
    it('should create a production alert', async () => {
      const alert = await productionMonitoringService.createProductionAlert({
        workCenterId: testWorkCenterId,
        severity: 'warning',
        message: 'Test alert message',
        metadata: {
          testKey: 'testValue',
          operationId: testOperationId,
        },
      });

      expect(alert).toBeDefined();
      expect(alert.workCenterId).toBe(testWorkCenterId);
      expect(alert.severity).toBe('warning');
      expect(alert.message).toBe('Test alert message');
      expect(alert.acknowledged).toBe(false);
      expect(alert.metadata).toBeDefined();
    });

    it('should create alerts with different severity levels', async () => {
      const severities = ['info', 'warning', 'error', 'critical'];

      for (const severity of severities) {
        const alert = await productionMonitoringService.createProductionAlert({
          workCenterId: testWorkCenterId,
          severity: severity as 'info' | 'warning' | 'error' | 'critical',
          message: `Test ${severity} alert`,
        });

        expect(alert.severity).toBe(severity);
      }
    });
  });

  describe('getProductionAlerts', () => {
    it('should get production alerts for a work center', async () => {
      const alerts = await productionMonitoringService.getProductionAlerts(testWorkCenterId);

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].workCenterId).toBe(testWorkCenterId);
    });

    it('should limit number of alerts returned', async () => {
      const alerts = await productionMonitoringService.getProductionAlerts(testWorkCenterId, 2);

      expect(alerts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge a production alert', async () => {
      // Create an alert
      const alert = await productionMonitoringService.createProductionAlert({
        workCenterId: testWorkCenterId,
        severity: 'info',
        message: 'Alert to be acknowledged',
      });

      // Acknowledge it
      const acknowledged = await productionMonitoringService.acknowledgeAlert(
        alert.id,
        'Test User'
      );

      expect(acknowledged.acknowledged).toBe(true);
      expect(acknowledged.acknowledgedBy).toBe('Test User');
      expect(acknowledged.acknowledgedAt).toBeDefined();
    });
  });

  describe('getProductionDashboard', () => {
    it('should get production dashboard data', async () => {
      const dashboard = await productionMonitoringService.getProductionDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.overview).toBeDefined();
      expect(dashboard.workCenters).toBeDefined();
      expect(dashboard.recentAlerts).toBeDefined();

      // Check overview metrics
      expect(typeof dashboard.overview.totalWorkCenters).toBe('number');
      expect(typeof dashboard.overview.activeWorkCenters).toBe('number');
      expect(typeof dashboard.overview.idleWorkCenters).toBe('number');
      expect(typeof dashboard.overview.workCentersWithIssues).toBe('number');
      expect(typeof dashboard.overview.totalUnitsProduced).toBe('number');
      expect(typeof dashboard.overview.averageEfficiency).toBe('number');

      // Check work centers array
      expect(Array.isArray(dashboard.workCenters)).toBe(true);

      // Check recent alerts array
      expect(Array.isArray(dashboard.recentAlerts)).toBe(true);
    });

    it('should include test work center in dashboard', async () => {
      const dashboard = await productionMonitoringService.getProductionDashboard();

      const testWorkCenter = dashboard.workCenters.find(
        (wc) => wc.workCenterId === testWorkCenterId
      );

      expect(testWorkCenter).toBeDefined();
      expect(testWorkCenter?.status).toBe('running');
    });
  });

  describe('getProductionPerformance', () => {
    it('should get production performance metrics', async () => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const performance = await productionMonitoringService.getProductionPerformance(
        startDate,
        endDate
      );

      expect(performance).toBeDefined();
      expect(typeof performance.totalOperations).toBe('number');
      expect(typeof performance.completedOperations).toBe('number');
      expect(typeof performance.averageEfficiency).toBe('number');
      expect(typeof performance.totalDowntime).toBe('number');
      expect(Array.isArray(performance.topPerformingWorkCenters)).toBe(true);
    });

    it('should calculate top performing work centers', async () => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const performance = await productionMonitoringService.getProductionPerformance(
        startDate,
        endDate
      );

      if (performance.topPerformingWorkCenters.length > 0) {
        const topPerformer = performance.topPerformingWorkCenters[0];
        expect(topPerformer.workCenterId).toBeDefined();
        expect(typeof topPerformer.efficiency).toBe('number');
        expect(typeof topPerformer.operationsCount).toBe('number');
      }
    });
  });

  describe('monitorProduction', () => {
    it('should run production monitoring without errors', async () => {
      // This test just ensures the monitoring function runs without throwing errors
      await expect(productionMonitoringService.monitorProduction()).resolves.not.toThrow();
    });
  });
});

describe('Production Monitoring Integration', () => {
  it('should have all required service methods', () => {
    expect(typeof productionMonitoringService.getProductionDashboard).toBe('function');
    expect(typeof productionMonitoringService.getAllProductionStatus).toBe('function');
    expect(typeof productionMonitoringService.getProductionStatus).toBe('function');
    expect(typeof productionMonitoringService.getProductionAlerts).toBe('function');
    expect(typeof productionMonitoringService.createProductionAlert).toBe('function');
    expect(typeof productionMonitoringService.acknowledgeAlert).toBe('function');
    expect(typeof productionMonitoringService.getProductionPerformance).toBe('function');
    expect(typeof productionMonitoringService.monitorProduction).toBe('function');
  });
});
