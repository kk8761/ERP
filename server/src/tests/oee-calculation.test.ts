/**
 * OEE Calculation Tests
 * Tests for Overall Equipment Effectiveness calculation functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { v4 as uuidv4 } from 'uuid';
import { OEECalculationService } from '../services/industry40.service';
import { OEEMetrics } from '../models/Industry40';
import { OperationStatus } from '../models/Industry40';

import prisma from '../config/prisma';
const oeeService = new OEECalculationService();

describe('OEE Calculation Service', () => {
  let testWorkCenterId: string;
  let testAssetId: string;
  let testOperations: any[];

  beforeAll(async () => {
    // Create test work center
    testWorkCenterId = `WC-TEST-${uuidv4()}`;
    testAssetId = `ASSET-TEST-${uuidv4()}`;

    // Create test operations for OEE calculation
    const startDate = new Date('2024-01-01T08:00:00Z');
    testOperations = [];

    for (let i = 0; i < 5; i++) {
      const operation = await prisma.shopFloorOperation.create({
        data: {
          id: uuidv4(),
          productionOrderId: `PO-${i}`,
          workCenterId: testWorkCenterId,
          operationId: `OP-${i}`,
          operationName: `Test Operation ${i}`,
          status: OperationStatus.COMPLETED,
          startTime: new Date(startDate.getTime() + i * 60 * 60 * 1000), // Each operation 1 hour apart
          endTime: new Date(startDate.getTime() + i * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 minutes duration
          plannedDuration: 60, // 60 minutes planned
          actualDuration: 45, // 45 minutes actual
          efficiency: 133, // (60/45) * 100
        },
      });
      testOperations.push(operation);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.shopFloorOperation.deleteMany({
      where: { workCenterId: testWorkCenterId },
    });
    await prisma.oEEMetrics.deleteMany({
      where: { workCenterId: testWorkCenterId },
    });
    await prisma.$disconnect();
  });

  describe('calculateOEE', () => {
    it('should calculate OEE metrics for a work center', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z'); // 8 hours = 480 minutes

      const result = await oeeService.calculateOEE({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5, // 5 minutes per unit
      });

      expect(result).toBeDefined();
      expect(result.workCenterId).toBe(testWorkCenterId);
      expect(result.plannedProductionTime).toBe(480); // 8 hours
      expect(result.actualProductionTime).toBe(225); // 5 operations * 45 minutes
      expect(result.downtime).toBe(255); // 480 - 225
      expect(result.availability).toBeGreaterThan(0);
      expect(result.performanceRate).toBeGreaterThan(0);
      expect(result.qualityRate).toBeGreaterThan(0);
      expect(result.oee).toBeGreaterThan(0);
    });

    it('should throw error when no operations found', async () => {
      const startDate = new Date('2025-01-01T08:00:00Z');
      const endDate = new Date('2025-01-01T16:00:00Z');

      await expect(
        oeeService.calculateOEE({
          workCenterId: 'NON-EXISTENT',
          startDate,
          endDate,
          idealCycleTime: 5,
        })
      ).rejects.toThrow('No completed operations found');
    });
  });

  describe('calculateOEEWithProductionData', () => {
    it('should calculate OEE with actual production data', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const result = await oeeService.calculateOEEWithProductionData({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5,
        totalUnitsProduced: 100,
        goodUnits: 95,
        defectiveUnits: 5,
      });

      expect(result).toBeDefined();
      expect(result.totalUnitsProduced).toBe(100);
      expect(result.goodUnits).toBe(95);
      expect(result.defectiveUnits).toBe(5);
      expect(result.qualityRate).toBe(95); // (95/100) * 100
    });
  });

  describe('OEE Metrics Calculations', () => {
    it('should calculate availability correctly', () => {
      const availability = OEEMetrics.calculateAvailability(400, 480);
      expect(availability).toBe(83); // (400/480) * 100 = 83.33 rounded to 83
    });

    it('should calculate performance correctly', () => {
      const performance = OEEMetrics.calculatePerformance(5, 80, 400);
      expect(performance).toBe(100); // (5*80)/400 * 100 = 100
    });

    it('should calculate quality correctly', () => {
      const quality = OEEMetrics.calculateQuality(95, 100);
      expect(quality).toBe(95); // (95/100) * 100 = 95
    });

    it('should calculate overall OEE correctly', () => {
      const oee = OEEMetrics.calculateOEE(83, 100, 95);
      expect(oee).toBe(79); // 0.83 * 1.0 * 0.95 * 100 = 78.85 rounded to 79
    });

    it('should handle zero values gracefully', () => {
      expect(OEEMetrics.calculateAvailability(0, 480)).toBe(0);
      expect(OEEMetrics.calculatePerformance(5, 0, 400)).toBe(0);
      expect(OEEMetrics.calculateQuality(0, 0)).toBe(0);
    });
  });

  describe('getOEEMetricsByWorkCenter', () => {
    it('should retrieve OEE metrics for a work center', async () => {
      // First calculate some metrics
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      await oeeService.calculateOEE({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5,
      });

      const metrics = await oeeService.getOEEMetricsByWorkCenter(testWorkCenterId);

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].workCenterId).toBe(testWorkCenterId);
    });

    it('should filter metrics by date range', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const metrics = await oeeService.getOEEMetricsByWorkCenter(
        testWorkCenterId,
        startDate,
        endDate
      );

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('getOEETrend', () => {
    it('should generate daily OEE trend data', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-03T23:59:59Z');

      // Create metrics for multiple days
      for (let day = 0; day < 3; day++) {
        const dayStart = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 8 * 60 * 60 * 1000);

        await oeeService.calculateOEE({
          workCenterId: testWorkCenterId,
          startDate: dayStart,
          endDate: dayEnd,
          idealCycleTime: 5,
        });
      }

      const trend = await oeeService.getOEETrend(
        testWorkCenterId,
        startDate,
        endDate,
        'daily'
      );

      expect(trend).toBeDefined();
      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBeGreaterThan(0);
      expect(trend[0]).toHaveProperty('period');
      expect(trend[0]).toHaveProperty('availability');
      expect(trend[0]).toHaveProperty('performance');
      expect(trend[0]).toHaveProperty('quality');
      expect(trend[0]).toHaveProperty('oee');
    });
  });

  describe('generateOEEReport', () => {
    it('should generate comprehensive OEE report', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const report = await oeeService.generateOEEReport(
        testWorkCenterId,
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.workCenterId).toBe(testWorkCenterId);
      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary).toHaveProperty('averageOEE');
      expect(report.summary).toHaveProperty('averageAvailability');
      expect(report.summary).toHaveProperty('averagePerformance');
      expect(report.summary).toHaveProperty('averageQuality');
      expect(report.summary).toHaveProperty('totalDowntime');
      expect(report.summary).toHaveProperty('totalUnitsProduced');
      expect(report.metrics).toBeDefined();
      expect(Array.isArray(report.metrics)).toBe(true);
      expect(report.trend).toBeDefined();
      expect(Array.isArray(report.trend)).toBe(true);
    });

    it('should throw error when no metrics found', async () => {
      const startDate = new Date('2025-01-01T08:00:00Z');
      const endDate = new Date('2025-01-01T16:00:00Z');

      await expect(
        oeeService.generateOEEReport('NON-EXISTENT', startDate, endDate)
      ).rejects.toThrow('No OEE metrics found');
    });
  });

  describe('compareOEEAcrossWorkCenters', () => {
    it('should compare OEE across multiple work centers', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const comparison = await oeeService.compareOEEAcrossWorkCenters(
        [testWorkCenterId, 'WC-OTHER'],
        startDate,
        endDate
      );

      expect(comparison).toBeDefined();
      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison.length).toBe(2);
      expect(comparison[0]).toHaveProperty('workCenterId');
      expect(comparison[0]).toHaveProperty('averageOEE');
      expect(comparison[0]).toHaveProperty('averageAvailability');
      expect(comparison[0]).toHaveProperty('averagePerformance');
      expect(comparison[0]).toHaveProperty('averageQuality');
    });
  });

  describe('getOEEInsights', () => {
    it('should generate OEE insights and recommendations', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const insights = await oeeService.getOEEInsights(
        testWorkCenterId,
        startDate,
        endDate
      );

      expect(insights).toBeDefined();
      expect(insights).toHaveProperty('currentOEE');
      expect(insights).toHaveProperty('insights');
      expect(Array.isArray(insights.insights)).toBe(true);

      if (insights.insights.length > 0) {
        const insight = insights.insights[0];
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('metric');
        expect(insight).toHaveProperty('value');
        expect(insight).toHaveProperty('target');
        expect(insight).toHaveProperty('gap');
        expect(insight).toHaveProperty('recommendation');
      }
    });

    it('should throw error when no metrics found', async () => {
      const startDate = new Date('2025-01-01T08:00:00Z');
      const endDate = new Date('2025-01-01T16:00:00Z');

      await expect(
        oeeService.getOEEInsights('NON-EXISTENT', startDate, endDate)
      ).rejects.toThrow('No OEE metrics found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle work center with no asset ID', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const result = await oeeService.calculateOEE({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5,
      });

      expect(result).toBeDefined();
      expect(result.assetId).toBeUndefined();
    });

    it('should handle work center with asset ID', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const result = await oeeService.calculateOEE({
        workCenterId: testWorkCenterId,
        assetId: testAssetId,
        startDate,
        endDate,
        idealCycleTime: 5,
      });

      expect(result).toBeDefined();
      expect(result.assetId).toBe(testAssetId);
    });

    it('should handle 100% quality rate', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const result = await oeeService.calculateOEEWithProductionData({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5,
        totalUnitsProduced: 100,
        goodUnits: 100,
        defectiveUnits: 0,
      });

      expect(result.qualityRate).toBe(100);
    });

    it('should handle 0% quality rate', async () => {
      const startDate = new Date('2024-01-01T08:00:00Z');
      const endDate = new Date('2024-01-01T16:00:00Z');

      const result = await oeeService.calculateOEEWithProductionData({
        workCenterId: testWorkCenterId,
        startDate,
        endDate,
        idealCycleTime: 5,
        totalUnitsProduced: 100,
        goodUnits: 0,
        defectiveUnits: 100,
      });

      expect(result.qualityRate).toBe(0);
      expect(result.oee).toBe(0);
    });
  });
});
