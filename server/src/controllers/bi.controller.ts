import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ReportService } from '../services/report.service';
import { AnalyticsService } from '../services/analytics.service';
import { ETLService } from '../services/etl.service';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';

export class BIController {
  
  // ─── Report Templates ──────────────────────────────────────
  
  static async createReportTemplate(req: Request, res: Response) {
    try {
      const { name, module, sqlQuery, columns, parameters, filters, sorting, grouping } = req.body;
      const user: any = req.user;

      const template = await ReportService.createReportTemplate({
        name,
        module,
        sqlQuery,
        columns,
        parameters,
        filters,
        sorting,
        grouping,
        createdById: user.id,
      });

      res.status(201).json({ success: true, template });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create report template' });
    }
  }

  static async getReportTemplates(req: Request, res: Response) {
    try {
      const { module } = req.query;

      const templates = await prisma.reportTemplate.findMany({
        where: module ? { module: module as string } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, templates });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async generateReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, filters, sorting, grouping } = req.body;

      const result = await ReportService.executeReport(id, parameters, filters, sorting, grouping);

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Failed to execute report' });
    }
  }

  // ─── Report Export ─────────────────────────────────────────

  static async exportReportToExcel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, filters, sorting } = req.body;

      const fileUrl = await ReportService.exportToExcel(id, parameters, filters, sorting);

      res.json({ success: true, fileUrl });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async exportReportToCSV(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, filters, sorting } = req.body;

      const fileUrl = await ReportService.exportToCSV(id, parameters, filters, sorting);

      res.json({ success: true, fileUrl });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async exportReportToPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, filters, sorting, customLayout } = req.body;

      const fileUrl = await ReportService.exportToPDF(id, parameters, filters, sorting, customLayout);

      res.json({ success: true, fileUrl });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── Scheduled Reports ─────────────────────────────────────

  static async scheduleReport(req: Request, res: Response) {
    try {
      const { reportTemplateId, name, schedule, recipients, format, parameters } = req.body;

      const scheduledReport = await ReportService.scheduleReport({
        reportTemplateId,
        name,
        schedule,
        recipients,
        format,
        parameters,
      });

      res.status(201).json({ success: true, scheduledReport });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getScheduledReports(req: Request, res: Response) {
    try {
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: { isActive: true },
        orderBy: { nextRun: 'asc' },
      });

      res.json({ success: true, scheduledReports });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async generateSecureLink(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, expiresIn } = req.body;

      const secureLink = await ReportService.generateSecureLink(id, parameters, expiresIn);

      res.json({ success: true, secureLink });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── KPIs ──────────────────────────────────────────────────

  static async getSalesKPIs(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
      const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());

      const kpis = await AnalyticsService.calculateSalesKPIs(start, end);

      res.json({ success: true, kpis });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getInventoryKPIs(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      const kpis = await AnalyticsService.calculateInventoryKPIs(targetDate);

      res.json({ success: true, kpis });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getFinancialKPIs(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
      const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());

      const kpis = await AnalyticsService.calculateFinancialKPIs(start, end);

      res.json({ success: true, kpis });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createKPIDefinition(req: Request, res: Response) {
    try {
      const { name, description, category, calculationFormula, unit, targetValue, thresholdGood, thresholdWarning, frequency } = req.body;

      const kpi = await AnalyticsService.createKPIDefinition({
        name,
        description,
        category,
        calculationFormula,
        unit,
        targetValue,
        thresholdGood,
        thresholdWarning,
        frequency,
      });

      res.status(201).json({ success: true, kpi });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getKPIDefinitions(req: Request, res: Response) {
    try {
      const { category } = req.query;

      const kpis = await prisma.kPIDefinition.findMany({
        where: category ? { category: category as string, isActive: true } : { isActive: true },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, kpis });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getKPIValues(req: Request, res: Response) {
    try {
      const { kpiId } = req.params;
      const { limit } = req.query;

      const values = await prisma.kPIValue.findMany({
        where: { kpiId },
        orderBy: { periodStart: 'desc' },
        take: limit ? parseInt(limit as string) : 30,
      });

      res.json({ success: true, values });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── Dashboards ────────────────────────────────────────────

  static async getDashboard(req: Request, res: Response) {
    try {
      const user: any = req.user;

      const widgets = await AnalyticsService.getDashboardData(user.id);

      res.json({ success: true, widgets });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createDashboardWidget(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const { title, type, dataSource, positionX, positionY, width, height } = req.body;

      const widget = await prisma.dashboardWidget.create({
        data: {
          userId: user.id,
          title,
          type,
          dataSource,
          positionX: positionX || 0,
          positionY: positionY || 0,
          width: width || 2,
          height: height || 2,
        },
      });

      res.status(201).json({ success: true, widget });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateDashboardWidget(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, positionX, positionY, width, height } = req.body;

      const widget = await prisma.dashboardWidget.update({
        where: { id },
        data: {
          title,
          positionX,
          positionY,
          width,
          height,
        },
      });

      res.json({ success: true, widget });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteDashboardWidget(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.dashboardWidget.delete({
        where: { id },
      });

      res.json({ success: true, message: 'Widget deleted successfully' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── Analytics Charts ──────────────────────────────────────

  static async getSalesTrend(req: Request, res: Response) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();
      const group = (groupBy as 'day' | 'week' | 'month') || 'day';

      const trend = await AnalyticsService.getSalesTrend(start, end, group);

      res.json({ success: true, trend });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTopProducts(req: Request, res: Response) {
    try {
      const { startDate, endDate, limit } = req.query;

      const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
      const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());
      const topLimit = limit ? parseInt(limit as string) : 10;

      const products = await AnalyticsService.getTopProducts(start, end, topLimit);

      res.json({ success: true, products });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getCustomerSegmentation(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
      const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());

      const segments = await AnalyticsService.getCustomerSegmentation(start, end);

      res.json({ success: true, segments });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── ETL Management ────────────────────────────────────────

  static async runFullETL(req: Request, res: Response) {
    try {
      // Run ETL in background
      ETLService.runFullETL().catch((error) => {
        console.error('ETL failed:', error);
      });

      res.json({ success: true, message: 'Full ETL pipeline started' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async runIncrementalETL(req: Request, res: Response) {
    try {
      // Run ETL in background
      ETLService.runIncrementalETL().catch((error) => {
        console.error('ETL failed:', error);
      });

      res.json({ success: true, message: 'Incremental ETL started' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getETLJobs(req: Request, res: Response) {
    try {
      const { status } = req.query;

      const jobs = await prisma.eTLJob.findMany({
        where: status ? { status: status as string } : undefined,
        orderBy: { startTime: 'desc' },
        take: 50,
      });

      res.json({ success: true, jobs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getETLJobLogs(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      const logs = await prisma.eTLJobLog.findMany({
        where: { jobId },
        orderBy: { timestamp: 'desc' },
      });

      res.json({ success: true, logs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
