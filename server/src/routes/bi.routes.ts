import { Router } from 'express';
import { BIController } from '../controllers/bi.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── Report Templates ──────────────────────────────────────

router.post('/templates', 
  requirePermission('create', 'report_template'),
  auditLog('CREATE', 'report_template'),
  BIController.createReportTemplate
);

router.get('/templates',
  requirePermission('read', 'report_template'),
  BIController.getReportTemplates
);

router.post('/reports/:id/execute', 
  requirePermission('read', 'report'),
  auditLog('EXECUTE', 'report'),
  BIController.generateReport
);

// ─── Report Export ─────────────────────────────────────────

router.post('/reports/:id/export/excel',
  requirePermission('read', 'report'),
  auditLog('EXPORT', 'report'),
  BIController.exportReportToExcel
);

router.post('/reports/:id/export/csv',
  requirePermission('read', 'report'),
  auditLog('EXPORT', 'report'),
  BIController.exportReportToCSV
);

router.post('/reports/:id/export/pdf',
  requirePermission('read', 'report'),
  auditLog('EXPORT', 'report'),
  BIController.exportReportToPDF
);

// ─── Scheduled Reports ─────────────────────────────────────

router.post('/scheduled-reports',
  requirePermission('create', 'scheduled_report'),
  auditLog('CREATE', 'scheduled_report'),
  BIController.scheduleReport
);

router.get('/scheduled-reports',
  requirePermission('read', 'scheduled_report'),
  BIController.getScheduledReports
);

router.post('/reports/:id/secure-link',
  requirePermission('read', 'report'),
  BIController.generateSecureLink
);

// ─── KPIs ──────────────────────────────────────────────────

router.get('/kpis/sales',
  requirePermission('read', 'kpi'),
  BIController.getSalesKPIs
);

router.get('/kpis/inventory',
  requirePermission('read', 'kpi'),
  BIController.getInventoryKPIs
);

router.get('/kpis/financial',
  requirePermission('read', 'kpi'),
  BIController.getFinancialKPIs
);

router.post('/kpis/definitions',
  requirePermission('create', 'kpi'),
  auditLog('CREATE', 'kpi_definition'),
  BIController.createKPIDefinition
);

router.get('/kpis/definitions',
  requirePermission('read', 'kpi'),
  BIController.getKPIDefinitions
);

router.get('/kpis/:kpiId/values',
  requirePermission('read', 'kpi'),
  BIController.getKPIValues
);

// ─── Dashboards ────────────────────────────────────────────

router.get('/dashboard',
  requirePermission('read', 'dashboard'),
  BIController.getDashboard
);

router.post('/dashboard/widgets',
  requirePermission('create', 'dashboard'),
  auditLog('CREATE', 'dashboard_widget'),
  BIController.createDashboardWidget
);

router.put('/dashboard/widgets/:id',
  requirePermission('update', 'dashboard'),
  auditLog('UPDATE', 'dashboard_widget'),
  BIController.updateDashboardWidget
);

router.delete('/dashboard/widgets/:id',
  requirePermission('delete', 'dashboard'),
  auditLog('DELETE', 'dashboard_widget'),
  BIController.deleteDashboardWidget
);

// ─── Analytics Charts ──────────────────────────────────────

router.get('/analytics/sales-trend',
  requirePermission('read', 'analytics'),
  BIController.getSalesTrend
);

router.get('/analytics/top-products',
  requirePermission('read', 'analytics'),
  BIController.getTopProducts
);

router.get('/analytics/customer-segmentation',
  requirePermission('read', 'analytics'),
  BIController.getCustomerSegmentation
);

// ─── ETL Management ────────────────────────────────────────

router.post('/etl/full',
  requirePermission('execute', 'etl'),
  auditLog('EXECUTE', 'etl_full'),
  BIController.runFullETL
);

router.post('/etl/incremental',
  requirePermission('execute', 'etl'),
  auditLog('EXECUTE', 'etl_incremental'),
  BIController.runIncrementalETL
);

router.get('/etl/jobs',
  requirePermission('read', 'etl'),
  BIController.getETLJobs
);

router.get('/etl/jobs/:jobId/logs',
  requirePermission('read', 'etl'),
  BIController.getETLJobLogs
);

export default router;
