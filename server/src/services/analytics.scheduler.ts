/**
 * Analytics Scheduler
 * Schedules ETL jobs and report generation
 */

import { ETLService } from './etl.service';
import { ReportService } from './report.service';
import { AnalyticsService } from './analytics.service';
import prisma from '../config/prisma';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

class AnalyticsScheduler {
  private etlInterval: NodeJS.Timeout | null = null;
  private reportInterval: NodeJS.Timeout | null = null;
  private kpiInterval: NodeJS.Timeout | null = null;

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('📊 Starting Analytics Scheduler...');

    // Run incremental ETL daily at 2:00 AM
    this.scheduleETL();

    // Check for scheduled reports every hour
    this.scheduleReports();

    // Calculate and store KPIs daily at 3:00 AM
    this.scheduleKPIs();

    console.log('✅ Analytics Scheduler started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (this.etlInterval) {
      clearInterval(this.etlInterval);
      this.etlInterval = null;
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    if (this.kpiInterval) {
      clearInterval(this.kpiInterval);
      this.kpiInterval = null;
    }
    console.log('📊 Analytics Scheduler stopped');
  }

  /**
   * Schedule ETL jobs
   */
  private scheduleETL() {
    // Run immediately on startup (in background)
    this.runETLJob().catch((error) => {
      console.error('❌ Initial ETL job failed:', error);
    });

    // Schedule to run daily at 2:00 AM
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(2, 0, 0, 0);

    // If 2:00 AM has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilFirstRun = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      this.runETLJob();
      // Then run every 24 hours
      this.etlInterval = setInterval(() => {
        this.runETLJob();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilFirstRun);

    console.log(`📅 ETL scheduled to run daily at 2:00 AM (next run: ${scheduledTime.toISOString()})`);
  }

  /**
   * Schedule report generation
   */
  private scheduleReports() {
    // Check every hour for scheduled reports
    this.reportInterval = setInterval(() => {
      this.runScheduledReports();
    }, 60 * 60 * 1000);

    // Run immediately on startup
    this.runScheduledReports().catch((error) => {
      console.error('❌ Scheduled reports check failed:', error);
    });

    console.log('📅 Report scheduler running (checks every hour)');
  }

  /**
   * Schedule KPI calculations
   */
  private scheduleKPIs() {
    // Run immediately on startup (in background)
    this.calculateAndStoreKPIs().catch((error) => {
      console.error('❌ Initial KPI calculation failed:', error);
    });

    // Schedule to run daily at 3:00 AM
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(3, 0, 0, 0);

    // If 3:00 AM has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilFirstRun = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      this.calculateAndStoreKPIs();
      // Then run every 24 hours
      this.kpiInterval = setInterval(() => {
        this.calculateAndStoreKPIs();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilFirstRun);

    console.log(`📅 KPI calculation scheduled to run daily at 3:00 AM (next run: ${scheduledTime.toISOString()})`);
  }

  /**
   * Run ETL job
   */
  private async runETLJob() {
    try {
      console.log('🚀 Running scheduled ETL job...');
      await ETLService.runIncrementalETL();
      console.log('✅ Scheduled ETL job completed');
    } catch (error) {
      console.error('❌ Scheduled ETL job failed:', error);
    }
  }

  /**
   * Run scheduled reports
   */
  private async runScheduledReports() {
    try {
      console.log('📧 Checking for scheduled reports...');
      await ReportService.executeScheduledReports();
      console.log('✅ Scheduled reports check completed');
    } catch (error) {
      console.error('❌ Scheduled reports check failed:', error);
    }
  }

  /**
   * Calculate and store KPIs
   */
  private async calculateAndStoreKPIs() {
    try {
      console.log('📊 Calculating and storing KPIs...');

      const today = new Date();
      const yesterday = subDays(today, 1);
      const startOfYesterday = startOfDay(yesterday);
      const endOfYesterday = endOfDay(yesterday);
      const startOfLastMonth = startOfMonth(subDays(today, 30));
      const endOfLastMonth = endOfMonth(subDays(today, 30));

      // Get all active KPI definitions
      const kpiDefinitions = await prisma.kPIDefinition.findMany({
        where: { isActive: true },
      });

      for (const kpiDef of kpiDefinitions) {
        try {
          let actualValue: number = 0;
          let periodStart: Date;
          let periodEnd: Date;

          // Calculate KPI based on category and frequency
          if (kpiDef.category === 'sales') {
            if (kpiDef.frequency === 'daily') {
              periodStart = startOfYesterday;
              periodEnd = endOfYesterday;
              const kpis = await AnalyticsService.calculateSalesKPIs(periodStart, periodEnd);
              const kpi = kpis.find((k) => k.name === kpiDef.name);
              actualValue = kpi?.value || 0;
            } else if (kpiDef.frequency === 'monthly') {
              periodStart = startOfLastMonth;
              periodEnd = endOfLastMonth;
              const kpis = await AnalyticsService.calculateSalesKPIs(periodStart, periodEnd);
              const kpi = kpis.find((k) => k.name === kpiDef.name);
              actualValue = kpi?.value || 0;
            }
          } else if (kpiDef.category === 'inventory') {
            periodStart = startOfYesterday;
            periodEnd = endOfYesterday;
            const kpis = await AnalyticsService.calculateInventoryKPIs(yesterday);
            const kpi = kpis.find((k) => k.name === kpiDef.name);
            actualValue = kpi?.value || 0;
          } else if (kpiDef.category === 'finance') {
            if (kpiDef.frequency === 'monthly') {
              periodStart = startOfLastMonth;
              periodEnd = endOfLastMonth;
              const kpis = await AnalyticsService.calculateFinancialKPIs(periodStart, periodEnd);
              const kpi = kpis.find((k) => k.name === kpiDef.name);
              actualValue = kpi?.value || 0;
            }
          } else {
            continue; // Skip unknown categories
          }

          // Store KPI value
          await AnalyticsService.recordKPIValue(
            kpiDef.id,
            periodStart!,
            periodEnd!,
            actualValue,
            kpiDef.targetValue || undefined
          );

          console.log(`✅ Stored KPI: ${kpiDef.name} = ${actualValue}`);
        } catch (error) {
          console.error(`❌ Failed to calculate KPI ${kpiDef.name}:`, error);
        }
      }

      console.log('✅ KPI calculation and storage completed');
    } catch (error) {
      console.error('❌ KPI calculation failed:', error);
    }
  }

  /**
   * Run full ETL manually (for initial setup)
   */
  async runFullETLManually() {
    try {
      console.log('🚀 Running full ETL manually...');
      await ETLService.runFullETL();
      console.log('✅ Full ETL completed');
    } catch (error) {
      console.error('❌ Full ETL failed:', error);
      throw error;
    }
  }
}

export const analyticsScheduler = new AnalyticsScheduler();
