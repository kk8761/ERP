import prisma from '../config/prisma';

/**
 * Transfer Pricing Service
 * Handles intercompany transactions and arm's length pricing documentation
 */

export interface TransferPricingData {
  transactionNumber: string;
  transactionDate: Date;
  fromEntityId: string;
  fromEntityName: string;
  fromCountry: string;
  toEntityId: string;
  toEntityName: string;
  toCountry: string;
  transactionType: string;
  description: string;
  armLengthPrice: number;
  actualPrice: number;
  currency: string;
  pricingMethod: string;
  methodJustification?: string;
  comparableData?: string;
  documentationIds?: string[];
  documentationStatus?: string;
  complianceStatus?: string;
  reviewedBy?: string;
  reviewDate?: Date;
  createdBy: string;
  approvedBy?: string;
  approvalDate?: Date;
}

export interface TransferPricingReportData {
  reportNumber: string;
  reportType: string;
  fiscalYear: number;
  fiscalPeriod?: string;
  entityId: string;
  entityName: string;
  country: string;
  currency: string;
  complianceStatus?: string;
  submittedTo?: string;
  submissionDate?: Date;
  reportFileUrl?: string;
  supportingDocs?: string[];
  preparedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}

/**
 * Create a transfer pricing transaction
 */
export async function createTransferPricing(data: TransferPricingData) {
  // Calculate variance
  const variance = data.actualPrice - data.armLengthPrice;
  const variancePercent = (variance / data.armLengthPrice) * 100;
  
  return await prisma.transferPricing.create({
    data: {
      ...data,
      variance,
      variancePercent,
      documentationIds: data.documentationIds || [],
      documentationStatus: data.documentationStatus || 'pending',
      complianceStatus: data.complianceStatus || 'compliant',
    },
  });
}

/**
 * Get transfer pricing transaction by ID
 */
export async function getTransferPricingById(id: string) {
  return await prisma.transferPricing.findUnique({
    where: { id },
    include: {
      reportItems: {
        include: {
          report: true,
        },
      },
    },
  });
}

/**
 * Get transfer pricing transactions by entity
 */
export async function getTransferPricingByEntity(entityId: string, startDate?: Date, endDate?: Date) {
  return await prisma.transferPricing.findMany({
    where: {
      OR: [
        { fromEntityId: entityId },
        { toEntityId: entityId },
      ],
      ...(startDate && endDate && {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      }),
    },
    orderBy: { transactionDate: 'desc' },
  });
}

/**
 * Get intercompany transactions between two entities
 */
export async function getIntercompanyTransactions(fromEntityId: string, toEntityId: string, startDate?: Date, endDate?: Date) {
  return await prisma.transferPricing.findMany({
    where: {
      fromEntityId,
      toEntityId,
      ...(startDate && endDate && {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      }),
    },
    orderBy: { transactionDate: 'desc' },
  });
}

/**
 * Update transfer pricing transaction
 */
export async function updateTransferPricing(id: string, data: Partial<TransferPricingData>) {
  // Recalculate variance if prices changed
  let updateData: any = { ...data };
  
  if (data.armLengthPrice !== undefined || data.actualPrice !== undefined) {
    const existing = await prisma.transferPricing.findUnique({ where: { id } });
    if (existing) {
      const armLength = data.armLengthPrice ?? existing.armLengthPrice;
      const actual = data.actualPrice ?? existing.actualPrice;
      const variance = actual - armLength;
      const variancePercent = (variance / armLength) * 100;
      
      updateData = {
        ...updateData,
        variance,
        variancePercent,
      };
    }
  }
  
  return await prisma.transferPricing.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Create transfer pricing report
 */
export async function createTransferPricingReport(data: TransferPricingReportData, transferPricingIds: string[]) {
  // Calculate summary
  const transactions = await prisma.transferPricing.findMany({
    where: { id: { in: transferPricingIds } },
  });
  
  const totalTransactions = transactions.length;
  const totalValue = transactions.reduce((sum, t) => sum + t.actualPrice, 0);
  
  // Create report
  const report = await prisma.transferPricingReport.create({
    data: {
      ...data,
      totalTransactions,
      totalValue,
      complianceStatus: data.complianceStatus || 'draft',
      supportingDocs: data.supportingDocs || [],
    },
  });
  
  // Create report items (join table entries)
  const reportItems = transferPricingIds.map((tpId) => ({
    transferPricingId: tpId,
    reportId: report.id,
  }));
  
  await prisma.transferPricingReportItem.createMany({
    data: reportItems,
  });
  
  return report;
}

/**
 * Get transfer pricing report by ID
 */
export async function getTransferPricingReportById(id: string) {
  return await prisma.transferPricingReport.findUnique({
    where: { id },
    include: {
      reportItems: {
        include: {
          transferPricing: true,
        },
      },
    },
  });
}

/**
 * Get transfer pricing reports by entity and fiscal year
 */
export async function getTransferPricingReportsByEntity(entityId: string, fiscalYear?: number) {
  return await prisma.transferPricingReport.findMany({
    where: {
      entityId,
      ...(fiscalYear && { fiscalYear }),
    },
    orderBy: [
      { fiscalYear: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Update transfer pricing report
 */
export async function updateTransferPricingReport(id: string, data: Partial<TransferPricingReportData>) {
  return await prisma.transferPricingReport.update({
    where: { id },
    data,
  });
}

/**
 * Add transactions to existing report
 */
export async function addTransactionsToReport(reportId: string, transferPricingIds: string[]) {
  const reportItems = transferPricingIds.map((tpId) => ({
    transferPricingId: tpId,
    reportId,
  }));
  
  await prisma.transferPricingReportItem.createMany({
    data: reportItems,
    skipDuplicates: true,
  });
  
  // Recalculate summary
  const report = await prisma.transferPricingReport.findUnique({
    where: { id: reportId },
    include: {
      reportItems: {
        include: {
          transferPricing: true,
        },
      },
    },
  });
  
  if (report) {
    const totalTransactions = report.reportItems.length;
    const totalValue = report.reportItems.reduce((sum, item) => sum + item.transferPricing.actualPrice, 0);
    
    await prisma.transferPricingReport.update({
      where: { id: reportId },
      data: {
        totalTransactions,
        totalValue,
      },
    });
  }
  
  return report;
}

/**
 * Generate transfer pricing report for a period
 */
export async function generateTransferPricingReport(
  entityId: string,
  entityName: string,
  country: string,
  fiscalYear: number,
  fiscalPeriod: string | undefined,
  reportType: string,
  preparedBy: string
) {
  // Get all transactions for the entity in the period
  const startDate = new Date(fiscalYear, 0, 1);
  const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59);
  
  const transactions = await getTransferPricingByEntity(entityId, startDate, endDate);
  
  if (transactions.length === 0) {
    throw new Error('No transfer pricing transactions found for the specified period');
  }
  
  // Generate report number
  const reportNumber = `TPR-${entityId}-${fiscalYear}${fiscalPeriod ? `-${fiscalPeriod}` : ''}`;
  
  // Create report
  const report = await createTransferPricingReport(
    {
      reportNumber,
      reportType,
      fiscalYear,
      fiscalPeriod,
      entityId,
      entityName,
      country,
      currency: transactions[0].currency,
      preparedBy,
    },
    transactions.map((t) => t.id)
  );
  
  return report;
}

/**
 * Analyze transfer pricing compliance
 */
export async function analyzeTransferPricingCompliance(entityId: string, fiscalYear: number) {
  const startDate = new Date(fiscalYear, 0, 1);
  const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59);
  
  const transactions = await getTransferPricingByEntity(entityId, startDate, endDate);
  
  const analysis = {
    totalTransactions: transactions.length,
    compliant: transactions.filter((t) => t.complianceStatus === 'compliant').length,
    underReview: transactions.filter((t) => t.complianceStatus === 'under_review').length,
    nonCompliant: transactions.filter((t) => t.complianceStatus === 'non_compliant').length,
    documentationComplete: transactions.filter((t) => t.documentationStatus === 'complete').length,
    documentationPending: transactions.filter((t) => t.documentationStatus === 'pending').length,
    averageVariancePercent: transactions.reduce((sum, t) => sum + (t.variancePercent || 0), 0) / transactions.length,
    highVarianceTransactions: transactions.filter((t) => Math.abs(t.variancePercent || 0) > 10),
  };
  
  return analysis;
}

/**
 * Get transfer pricing summary by transaction type
 */
export async function getTransferPricingSummaryByType(entityId: string, fiscalYear: number) {
  const startDate = new Date(fiscalYear, 0, 1);
  const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59);
  
  const transactions = await getTransferPricingByEntity(entityId, startDate, endDate);
  
  const summary: Record<string, { count: number; totalValue: number; avgVariance: number }> = {};
  
  transactions.forEach((t) => {
    if (!summary[t.transactionType]) {
      summary[t.transactionType] = { count: 0, totalValue: 0, avgVariance: 0 };
    }
    
    summary[t.transactionType].count++;
    summary[t.transactionType].totalValue += t.actualPrice;
    summary[t.transactionType].avgVariance += t.variancePercent || 0;
  });
  
  // Calculate averages
  Object.keys(summary).forEach((type) => {
    summary[type].avgVariance /= summary[type].count;
  });
  
  return summary;
}
