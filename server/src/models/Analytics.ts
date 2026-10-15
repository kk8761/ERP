/**
 * Analytics and Data Warehouse Models
 * Dimensional modeling for data warehouse (star schema)
 */

export interface DimensionDate {
  dateKey: string; // YYYYMMDD format
  fullDate: Date;
  year: number;
  quarter: number;
  month: number;
  monthName: string;
  week: number;
  dayOfMonth: number;
  dayOfWeek: number;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  fiscalYear: number;
  fiscalQuarter: number;
  fiscalPeriod: string;
}

export interface DimensionProduct {
  productKey: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  categoryHierarchy: string;
  brand: string;
  unit: string;
  trackingType: string;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate: Date | null;
}

export interface DimensionCustomer {
  customerKey: string;
  customerId: string;
  customerName: string;
  customerType: string;
  segment: string;
  region: string;
  country: string;
  city: string;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate: Date | null;
}

export interface DimensionSupplier {
  supplierKey: string;
  supplierId: string;
  supplierName: string;
  category: string;
  rating: number;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate: Date | null;
}

export interface DimensionWarehouse {
  warehouseKey: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  region: string;
  country: string;
  city: string;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate: Date | null;
}

export interface DimensionEmployee {
  employeeKey: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  managerId: string | null;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate: Date | null;
}

// Fact Tables

export interface FactSales {
  salesKey: string;
  dateKey: string;
  productKey: string;
  customerKey: string;
  warehouseKey: string;
  employeeKey: string;
  orderId: string;
  orderNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  costAmount: number;
  profitAmount: number;
  profitMargin: number;
  paymentMode: string;
  orderStatus: string;
  createdAt: Date;
}

export interface FactInventory {
  inventoryKey: string;
  dateKey: string;
  productKey: string;
  warehouseKey: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  unitCost: number;
  totalValue: number;
  reorderPoint: number;
  daysOfSupply: number;
  stockStatus: string; // in_stock, low_stock, out_of_stock, overstock
  snapshotDate: Date;
}

export interface FactPurchase {
  purchaseKey: string;
  dateKey: string;
  productKey: string;
  supplierKey: string;
  warehouseKey: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  quantity: number;
  unitCost: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms: string;
  deliveryDate: Date | null;
  status: string;
  createdAt: Date;
}

export interface FactProduction {
  productionKey: string;
  dateKey: string;
  productKey: string;
  warehouseKey: string;
  employeeKey: string;
  productionOrderId: string;
  productionOrderNumber: string;
  plannedQuantity: number;
  actualQuantity: number;
  scrapQuantity: number;
  yieldPercentage: number;
  standardCost: number;
  actualCost: number;
  costVariance: number;
  duration: number; // in minutes
  efficiency: number;
  status: string;
  createdAt: Date;
}

export interface FactFinancial {
  financialKey: string;
  dateKey: string;
  accountKey: string;
  costCenterKey: string | null;
  projectKey: string | null;
  transactionId: string;
  transactionNumber: string;
  transactionType: string;
  debitAmount: number;
  creditAmount: number;
  netAmount: number;
  currency: string;
  description: string;
  fiscalPeriod: string;
  createdAt: Date;
}

export interface FactHR {
  hrKey: string;
  dateKey: string;
  employeeKey: string;
  departmentKey: string;
  eventType: string; // hire, termination, promotion, transfer, performance_review
  eventValue: number | null;
  eventDescription: string;
  createdAt: Date;
}

// ETL Job Tracking

export interface ETLJob {
  id: string;
  jobName: string;
  jobType: string; // full_load, incremental, dimension, fact
  sourceTable: string;
  targetTable: string;
  status: string; // pending, running, completed, failed
  startTime: Date;
  endTime: Date | null;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage: string | null;
  lastSuccessfulRun: Date | null;
  nextScheduledRun: Date | null;
  schedule: string | null; // cron expression
}

export interface ETLJobLog {
  id: string;
  jobId: string;
  logLevel: string; // info, warning, error
  message: string;
  details: any;
  timestamp: Date;
}

// Data Quality Metrics

export interface DataQualityMetric {
  id: string;
  tableName: string;
  metricType: string; // completeness, accuracy, consistency, timeliness
  metricName: string;
  metricValue: number;
  threshold: number;
  status: string; // pass, warning, fail
  checkDate: Date;
  details: any;
}
