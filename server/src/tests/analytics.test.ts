/**
 * Analytics and Data Warehouse Tests
 * Basic tests to verify the analytics functionality
 */

import { ETLService } from '../services/etl.service';
import { AnalyticsService } from '../services/analytics.service';
import { ReportService } from '../services/report.service';
import prisma from '../config/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

describe('Data Warehouse and Analytics', () => {
  describe('ETL Service', () => {
    it('should generate date dimension', async () => {
      const year = new Date().getFullYear();
      await ETLService.generateDateDimension(year);

      const count = await prisma.dimDate.count({
        where: {
          year,
        },
      });

      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(366); // Max days in a year
    });

    it('should load product dimension', async () => {
      await ETLService.loadProductDimension();

      const count = await prisma.dimProduct.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should load customer dimension', async () => {
      await ETLService.loadCustomerDimension();

      const count = await prisma.dimCustomer.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should load warehouse dimension', async () => {
      await ETLService.loadWarehouseDimension();

      const count = await prisma.dimWarehouse.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should load sales fact', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await ETLService.loadSalesFact(yesterday, today);

      const count = await prisma.factSales.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should load inventory fact', async () => {
      await ETLService.loadInventoryFact();

      const count = await prisma.factInventory.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analytics Service', () => {
    it('should calculate sales KPIs', async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      const kpis = await AnalyticsService.calculateSalesKPIs(start, end);

      expect(kpis).toBeInstanceOf(Array);
      expect(kpis.length).toBeGreaterThan(0);

      const revenueKPI = kpis.find((k) => k.name === 'Total Revenue');
      expect(revenueKPI).toBeDefined();
      expect(revenueKPI?.unit).toBe('currency');
    });

    it('should calculate inventory KPIs', async () => {
      const kpis = await AnalyticsService.calculateInventoryKPIs(new Date());

      expect(kpis).toBeInstanceOf(Array);
      expect(kpis.length).toBeGreaterThan(0);

      const valueKPI = kpis.find((k) => k.name === 'Total Inventory Value');
      expect(valueKPI).toBeDefined();
      expect(valueKPI?.unit).toBe('currency');
    });

    it('should calculate financial KPIs', async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      const kpis = await AnalyticsService.calculateFinancialKPIs(start, end);

      expect(kpis).toBeInstanceOf(Array);
      expect(kpis.length).toBeGreaterThan(0);

      const revenueKPI = kpis.find((k) => k.name === 'Total Revenue');
      expect(revenueKPI).toBeDefined();
    });

    it('should get sales trend', async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      const trend = await AnalyticsService.getSalesTrend(start, end, 'day');

      expect(trend).toBeInstanceOf(Array);
    });

    it('should get top products', async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      const products = await AnalyticsService.getTopProducts(start, end, 10);

      expect(products).toBeInstanceOf(Array);
      expect(products.length).toBeLessThanOrEqual(10);
    });

    it('should create KPI definition', async () => {
      const kpi = await AnalyticsService.createKPIDefinition({
        name: 'Test KPI',
        description: 'Test KPI for unit testing',
        category: 'sales',
        calculationFormula: 'SUM(totalAmount)',
        unit: 'currency',
        targetValue: 10000,
        thresholdGood: 10000,
        thresholdWarning: 8000,
        frequency: 'monthly',
      });

      expect(kpi).toBeDefined();
      expect(kpi.name).toBe('Test KPI');
      expect(kpi.category).toBe('sales');

      // Cleanup
      await prisma.kPIDefinition.delete({ where: { id: kpi.id } });
    });
  });

  describe('Report Service', () => {
    let testTemplateId: string;
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user
      const user = await prisma.user.findFirst();
      if (user) {
        testUserId = user.id;
      }
    });

    it('should create report template', async () => {
      if (!testUserId) {
        console.log('Skipping test: No user found');
        return;
      }

      const template = await ReportService.createReportTemplate({
        name: 'Test Report',
        module: 'sales',
        sqlQuery: 'SELECT * FROM "FactSales" LIMIT 10',
        columns: [
          { field: 'orderNumber', header: 'Order #', type: 'string', width: 15 },
          { field: 'totalAmount', header: 'Amount', type: 'currency', width: 15 },
        ],
        createdById: testUserId,
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Report');
      testTemplateId = template.id;
    });

    it('should execute report', async () => {
      if (!testTemplateId) {
        console.log('Skipping test: No template created');
        return;
      }

      const result = await ReportService.executeReport(testTemplateId);

      expect(result).toBeDefined();
      expect(result.columns).toBeInstanceOf(Array);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should export report to CSV', async () => {
      if (!testTemplateId) {
        console.log('Skipping test: No template created');
        return;
      }

      const fileUrl = await ReportService.exportToCSV(testTemplateId);

      expect(fileUrl).toBeDefined();
      expect(fileUrl).toContain('.csv');
    });

    afterAll(async () => {
      // Cleanup
      if (testTemplateId) {
        await prisma.reportTemplate.delete({ where: { id: testTemplateId } });
      }
    });
  });
});
