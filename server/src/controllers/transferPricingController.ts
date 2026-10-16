import { Request, Response } from 'express';
import * as transferPricingService from '../services/transferPricingService';

/**
 * Create transfer pricing transaction
 */
export async function createTransferPricing(req: Request, res: Response) {
  try {
    const transferPricing = await transferPricingService.createTransferPricing(req.body);
    res.status(201).json(transferPricing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get transfer pricing by ID
 */
export async function getTransferPricingById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transferPricing = await transferPricingService.getTransferPricingById(id);
    
    if (!transferPricing) {
      return res.status(404).json({ error: 'Transfer pricing transaction not found' });
    }
    
    res.json(transferPricing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get transfer pricing by entity
 */
export async function getTransferPricingByEntity(req: Request, res: Response) {
  try {
    const { entityId } = req.params;
    const { startDate, endDate } = req.query;
    
    const transactions = await transferPricingService.getTransferPricingByEntity(
      entityId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get intercompany transactions
 */
export async function getIntercompanyTransactions(req: Request, res: Response) {
  try {
    const { fromEntityId, toEntityId } = req.params;
    const { startDate, endDate } = req.query;
    
    const transactions = await transferPricingService.getIntercompanyTransactions(
      fromEntityId,
      toEntityId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update transfer pricing
 */
export async function updateTransferPricing(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transferPricing = await transferPricingService.updateTransferPricing(id, req.body);
    res.json(transferPricing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create transfer pricing report
 */
export async function createTransferPricingReport(req: Request, res: Response) {
  try {
    const { reportData, transferPricingIds } = req.body;
    const report = await transferPricingService.createTransferPricingReport(reportData, transferPricingIds);
    res.status(201).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get transfer pricing report by ID
 */
export async function getTransferPricingReportById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const report = await transferPricingService.getTransferPricingReportById(id);
    
    if (!report) {
      return res.status(404).json({ error: 'Transfer pricing report not found' });
    }
    
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get transfer pricing reports by entity
 */
export async function getTransferPricingReportsByEntity(req: Request, res: Response) {
  try {
    const { entityId } = req.params;
    const { fiscalYear } = req.query;
    
    const reports = await transferPricingService.getTransferPricingReportsByEntity(
      entityId,
      fiscalYear ? parseInt(fiscalYear as string) : undefined
    );
    
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update transfer pricing report
 */
export async function updateTransferPricingReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const report = await transferPricingService.updateTransferPricingReport(id, req.body);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Add transactions to report
 */
export async function addTransactionsToReport(req: Request, res: Response) {
  try {
    const { reportId } = req.params;
    const { transferPricingIds } = req.body;
    
    const report = await transferPricingService.addTransactionsToReport(reportId, transferPricingIds);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Generate transfer pricing report
 */
export async function generateTransferPricingReport(req: Request, res: Response) {
  try {
    const { entityId, entityName, country, fiscalYear, fiscalPeriod, reportType, preparedBy } = req.body;
    
    const report = await transferPricingService.generateTransferPricingReport(
      entityId,
      entityName,
      country,
      fiscalYear,
      fiscalPeriod,
      reportType,
      preparedBy
    );
    
    res.status(201).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Analyze transfer pricing compliance
 */
export async function analyzeTransferPricingCompliance(req: Request, res: Response) {
  try {
    const { entityId, fiscalYear } = req.params;
    
    const analysis = await transferPricingService.analyzeTransferPricingCompliance(
      entityId,
      parseInt(fiscalYear)
    );
    
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get transfer pricing summary by type
 */
export async function getTransferPricingSummaryByType(req: Request, res: Response) {
  try {
    const { entityId, fiscalYear } = req.params;
    
    const summary = await transferPricingService.getTransferPricingSummaryByType(
      entityId,
      parseInt(fiscalYear)
    );
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
