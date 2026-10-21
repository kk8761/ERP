/**
 * Report Service
 * Handles report generation, scheduling, and export
 */

import prisma from '../config/prisma';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
}

export interface ReportColumn {
  field: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  width?: number;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportGrouping {
  field: string;
  aggregates?: { field: string; function: 'sum' | 'avg' | 'count' | 'min' | 'max' }[];
}

export class ReportService {
  /**
   * Create a new report template
   */
  static async createReportTemplate(data: {
    name: string;
    module: string;
    sqlQuery: string;
    columns: ReportColumn[];
    parameters?: ReportParameter[];
    filters?: ReportFilter[];
    sorting?: ReportSort[];
    grouping?: ReportGrouping;
    createdById: string;
  }) {
    return await prisma.reportTemplate.create({
      data: {
        name: data.name,
        module: data.module,
        sqlQuery: data.sqlQuery,
        columns: data.columns as any,
        createdById: data.createdById,
      },
    });
  }

  /**
   * Execute a report with parameters
   */
  static async executeReport(
    templateId: string,
    parameters: Record<string, any> = {},
    filters: ReportFilter[] = [],
    sorting: ReportSort[] = [],
    grouping?: ReportGrouping
  ): Promise<{ columns: ReportColumn[]; data: any[] }> {
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Report template not found');
    }

    // Replace parameters in SQL query
    let query = template.sqlQuery;
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`;
      query = query.replace(new RegExp(placeholder, 'g'), this.sanitizeValue(value));
    }

    // Add filters to query
    if (filters.length > 0) {
      const whereClause = this.buildWhereClause(filters);
      if (query.toLowerCase().includes('where')) {
        query = query.replace(/where/i, `WHERE ${whereClause} AND`);
      } else {
        query += ` WHERE ${whereClause}`;
      }
    }

    // Add sorting to query
    if (sorting.length > 0) {
      const orderClause = sorting.map((s) => `${s.field} ${s.direction.toUpperCase()}`).join(', ');
      query += ` ORDER BY ${orderClause}`;
    }

    // Execute query
    const data = await prisma.$queryRawUnsafe(query);

    // Apply grouping if specified
    let processedData = data as any[];
    if (grouping) {
      processedData = this.applyGrouping(processedData, grouping);
    }

    return {
      columns: template.columns as ReportColumn[],
      data: processedData,
    };
  }

  /**
   * Export report to Excel
   */
  static async exportToExcel(
    templateId: string,
    parameters: Record<string, any> = {},
    filters: ReportFilter[] = [],
    sorting: ReportSort[] = []
  ): Promise<string> {
    const { columns, data } = await this.executeReport(templateId, parameters, filters, sorting);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Convert data to worksheet format
    const worksheetData = [
      columns.map((col) => col.header), // Header row
      ...data.map((row) =>
        columns.map((col) => {
          const value = row[col.field];
          if (col.type === 'date' && value) {
            return format(new Date(value), 'yyyy-MM-dd');
          }
          if (col.type === 'currency' && typeof value === 'number') {
            return value.toFixed(2);
          }
          if (col.type === 'percentage' && typeof value === 'number') {
            return `${value.toFixed(2)}%`;
          }
          return value;
        })
      ),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Generate file
    const fileName = `report_${uuidv4()}.xlsx`;
    const filePath = join(process.cwd(), 'server', 'public', 'reports', fileName);
    XLSX.writeFile(workbook, filePath);

    return `/reports/${fileName}`;
  }

  /**
   * Export report to CSV
   */
  static async exportToCSV(
    templateId: string,
    parameters: Record<string, any> = {},
    filters: ReportFilter[] = [],
    sorting: ReportSort[] = []
  ): Promise<string> {
    const { columns, data } = await this.executeReport(templateId, parameters, filters, sorting);

    // Create CSV content
    const headers = columns.map((col) => col.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          if (col.type === 'date' && value) {
            return format(new Date(value), 'yyyy-MM-dd');
          }
          return value;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    // Save to file
    const fileName = `report_${uuidv4()}.csv`;
    const filePath = join(process.cwd(), 'server', 'public', 'reports', fileName);
    require('fs').writeFileSync(filePath, csvContent, 'utf-8');

    return `/reports/${fileName}`;
  }

  /**
   * Export report to PDF
   */
  static async exportToPDF(
    templateId: string,
    parameters: Record<string, any> = {},
    filters: ReportFilter[] = [],
    sorting: ReportSort[] = [],
    customLayout?: {
      title?: string;
      orientation?: 'portrait' | 'landscape';
      pageSize?: 'A4' | 'Letter';
      includeHeader?: boolean;
      includeFooter?: boolean;
    }
  ): Promise<string> {
    const { columns, data } = await this.executeReport(templateId, parameters, filters, sorting);

    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    });

    const fileName = `report_${uuidv4()}.pdf`;
    const filePath = join(process.cwd(), 'server', 'public', 'reports', fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: customLayout?.pageSize || 'A4',
        layout: customLayout?.orientation || 'portrait',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      if (customLayout?.includeHeader !== false) {
        doc.fontSize(18).text(customLayout?.title || template?.name || 'Report', { align: 'center' });
        doc.fontSize(10).text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, { align: 'center' });
        doc.moveDown();
      }

      // Table
      const tableTop = doc.y;
      const columnWidth = (doc.page.width - 100) / columns.length;

      // Table headers
      doc.fontSize(10).font('Helvetica-Bold');
      columns.forEach((col, i) => {
        doc.text(col.header, 50 + i * columnWidth, tableTop, {
          width: columnWidth,
          align: 'left',
        });
      });

      doc.moveDown();
      doc.font('Helvetica');

      // Table rows
      let currentY = doc.y;
      data.forEach((row, rowIndex) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        columns.forEach((col, colIndex) => {
          let value = row[col.field];
          if (col.type === 'date' && value) {
            value = format(new Date(value), 'yyyy-MM-dd');
          } else if (col.type === 'currency' && typeof value === 'number') {
            value = `$${value.toFixed(2)}`;
          } else if (col.type === 'percentage' && typeof value === 'number') {
            value = `${value.toFixed(2)}%`;
          }

          doc.text(String(value || ''), 50 + colIndex * columnWidth, currentY, {
            width: columnWidth,
            align: 'left',
          });
        });

        currentY += 20;
        doc.y = currentY;
      });

      // Footer
      if (customLayout?.includeFooter !== false) {
        doc.fontSize(8).text(`Page ${doc.bufferedPageRange().count}`, 50, doc.page.height - 50, {
          align: 'center',
        });
      }

      doc.end();

      stream.on('finish', () => {
        resolve(`/reports/${fileName}`);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Schedule a report
   */
  static async scheduleReport(data: {
    reportTemplateId: string;
    name: string;
    schedule: string; // cron expression
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    parameters?: Record<string, any>;
  }) {
    // Calculate next run time based on cron expression
    const nextRun = this.calculateNextRun(data.schedule);

    return await prisma.scheduledReport.create({
      data: {
        reportTemplateId: data.reportTemplateId,
        name: data.name,
        schedule: data.schedule,
        recipients: data.recipients,
        format: data.format,
        parameters: data.parameters || {},
        nextRun,
      },
    });
  }

  /**
   * Execute scheduled reports
   */
  static async executeScheduledReports(): Promise<void> {
    const now = new Date();

    const dueReports = await prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now,
        },
      },
    });

    for (const scheduledReport of dueReports) {
      try {
        const execution = await prisma.reportExecution.create({
          data: {
            scheduledReportId: scheduledReport.id,
            reportTemplateId: scheduledReport.reportTemplateId,
            status: 'running',
            startTime: new Date(),
          },
        });

        let fileUrl: string;

        // Generate report based on format
        if (scheduledReport.format === 'pdf') {
          fileUrl = await this.exportToPDF(
            scheduledReport.reportTemplateId,
            scheduledReport.parameters as Record<string, any>
          );
        } else if (scheduledReport.format === 'excel') {
          fileUrl = await this.exportToExcel(
            scheduledReport.reportTemplateId,
            scheduledReport.parameters as Record<string, any>
          );
        } else {
          fileUrl = await this.exportToCSV(
            scheduledReport.reportTemplateId,
            scheduledReport.parameters as Record<string, any>
          );
        }

        // Update execution record
        await prisma.reportExecution.update({
          where: { id: execution.id },
          data: {
            status: 'completed',
            endTime: new Date(),
            fileUrl,
          },
        });

        // Send email to recipients (placeholder - integrate with email service)
        console.log(`📧 Sending report to: ${scheduledReport.recipients.join(', ')}`);
        console.log(`📄 Report URL: ${fileUrl}`);

        // Update next run time
        const nextRun = this.calculateNextRun(scheduledReport.schedule);
        await prisma.scheduledReport.update({
          where: { id: scheduledReport.id },
          data: {
            lastRun: now,
            nextRun,
          },
        });
      } catch (error: any) {
        console.error(`❌ Failed to execute scheduled report ${scheduledReport.id}:`, error);

        await prisma.reportExecution.create({
          data: {
            scheduledReportId: scheduledReport.id,
            reportTemplateId: scheduledReport.reportTemplateId,
            status: 'failed',
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: error.message,
          },
        });
      }
    }
  }

  /**
   * Generate secure report link
   */
  static async generateSecureLink(
    templateId: string,
    parameters: Record<string, any> = {},
    expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn);

    // Store token in database (you would need to create a ReportLink model)
    // For now, we'll just return a URL with the token
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/api/reports/secure/${token}`;
  }

  // Helper methods

  private static sanitizeValue(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (value instanceof Date) return `'${format(value, 'yyyy-MM-dd')}'`;
    return String(value);
  }

  private static buildWhereClause(filters: ReportFilter[]): string {
    return filters
      .map((filter) => {
        const { field, operator, value } = filter;
        switch (operator) {
          case 'equals':
            return `${field} = ${this.sanitizeValue(value)}`;
          case 'not_equals':
            return `${field} != ${this.sanitizeValue(value)}`;
          case 'greater_than':
            return `${field} > ${this.sanitizeValue(value)}`;
          case 'less_than':
            return `${field} < ${this.sanitizeValue(value)}`;
          case 'contains':
            return `${field} LIKE '%${value}%'`;
          case 'in':
            return `${field} IN (${value.map((v: any) => this.sanitizeValue(v)).join(', ')})`;
          case 'between':
            return `${field} BETWEEN ${this.sanitizeValue(value[0])} AND ${this.sanitizeValue(value[1])}`;
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join(' AND ');
  }

  private static applyGrouping(data: any[], grouping: ReportGrouping): any[] {
    const grouped = new Map<string, any>();

    for (const row of data) {
      const key = row[grouping.field];
      if (!grouped.has(key)) {
        grouped.set(key, {
          [grouping.field]: key,
          _count: 0,
        });
      }

      const group = grouped.get(key)!;
      group._count++;

      // Apply aggregates
      if (grouping.aggregates) {
        for (const agg of grouping.aggregates) {
          const aggKey = `${agg.field}_${agg.function}`;
          if (!group[aggKey]) {
            group[aggKey] = agg.function === 'count' ? 0 : null;
          }

          const value = row[agg.field];
          if (value !== null && value !== undefined) {
            switch (agg.function) {
              case 'sum':
                group[aggKey] = (group[aggKey] || 0) + value;
                break;
              case 'avg':
                group[aggKey] = ((group[aggKey] || 0) * (group._count - 1) + value) / group._count;
                break;
              case 'count':
                group[aggKey]++;
                break;
              case 'min':
                group[aggKey] = group[aggKey] === null ? value : Math.min(group[aggKey], value);
                break;
              case 'max':
                group[aggKey] = group[aggKey] === null ? value : Math.max(group[aggKey], value);
                break;
            }
          }
        }
      }
    }

    return Array.from(grouped.values());
  }

  private static calculateNextRun(cronExpression: string): Date {
    // Simplified cron parser - in production, use a library like node-cron
    // For now, just add 1 day
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
