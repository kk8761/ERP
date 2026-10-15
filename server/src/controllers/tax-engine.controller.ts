/**
 * Tax Engine Controller
 * 
 * Handles HTTP requests for tax calculation and configuration
 * 
 * Requirements: 10.6, 18.2, 18.4
 */

import { Request, Response } from 'express';
import { taxEngineService, TaxCalculationRequest } from '../services/tax-engine.service';
import { logger } from '../utils/logger';
import prisma from '../config/prisma';

/**
 * Calculate tax for a transaction
 * POST /api/tax/calculate
 */
export async function calculateTax(req: Request, res: Response): Promise<void> {
  try {
    const request: TaxCalculationRequest = req.body;

    // Validate request
    if (!request.customerAddress || !request.sellerAddress || !request.lineItems) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customerAddress, sellerAddress, lineItems',
      });
      return;
    }

    const result = await taxEngineService.calculateTax(request);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Tax calculation failed', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Tax calculation failed',
    });
  }
}

/**
 * Calculate tax for an existing invoice
 * POST /api/tax/calculate-invoice/:invoiceId
 */
export async function calculateTaxForInvoice(req: Request, res: Response): Promise<void> {
  try {
    const { invoiceId } = req.params;

    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        supplier: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    // Get customer/supplier address
    let customerAddress;
    let sellerAddress;

    if (invoice.type === 'AR') {
      // For AR invoices, we need customer address
      // This would come from the customer record
      customerAddress = {
        line1: invoice.vendorAddress || '123 Customer St',
        city: 'Unknown',
        postalCode: '00000',
        country: 'US',
      };
      sellerAddress = {
        line1: process.env.COMPANY_ADDRESS_LINE1 || '456 Company Ave',
        city: process.env.COMPANY_CITY || 'Seattle',
        state: process.env.COMPANY_STATE || 'WA',
        postalCode: process.env.COMPANY_POSTAL_CODE || '98101',
        country: process.env.COMPANY_COUNTRY || 'US',
      };
    } else {
      // For AP invoices, supplier is the seller
      sellerAddress = {
        line1: invoice.vendorAddress || '123 Supplier St',
        city: 'Unknown',
        postalCode: '00000',
        country: 'US',
      };
      customerAddress = {
        line1: process.env.COMPANY_ADDRESS_LINE1 || '456 Company Ave',
        city: process.env.COMPANY_CITY || 'Seattle',
        state: process.env.COMPANY_STATE || 'WA',
        postalCode: process.env.COMPANY_POSTAL_CODE || '98101',
        country: process.env.COMPANY_COUNTRY || 'US',
      };
    }

    // Build tax calculation request
    const taxRequest: TaxCalculationRequest = {
      transactionId: invoice.id,
      transactionType: 'invoice',
      customerAddress,
      sellerAddress,
      lineItems: invoice.lineItems.map((item) => ({
        itemCode: item.productId || undefined,
        description: item.description,
        quantity: item.quantity,
        amount: item.amount,
      })),
      currency: 'USD', // Default currency
      transactionDate: invoice.issueDate,
    };

    const result = await taxEngineService.calculateTax(taxRequest);

    // Optionally update the invoice with calculated tax
    if (req.body.updateInvoice) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          taxAmount: result.totalTax,
          total: invoice.subtotal + result.totalTax,
        },
      });
    }

    res.json({
      success: true,
      data: result,
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        subtotal: invoice.subtotal,
        calculatedTax: result.totalTax,
        total: invoice.subtotal + result.totalTax,
      },
    });
  } catch (error) {
    logger.error('Invoice tax calculation failed', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invoice tax calculation failed',
    });
  }
}

/**
 * Get tax calculation history for a transaction
 * GET /api/tax/history/:transactionId
 */
export async function getTaxHistory(req: Request, res: Response): Promise<void> {
  try {
    const { transactionId } = req.params;

    const history = await taxEngineService.getTaxCalculationHistory(transactionId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Failed to get tax history', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get tax history',
    });
  }
}

/**
 * Get tax engine configuration
 * GET /api/tax/config
 */
export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = taxEngineService.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get tax config', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get tax config',
    });
  }
}

/**
 * Update tax engine configuration
 * PUT /api/tax/config
 */
export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = req.body;

    await taxEngineService.updateConfig(config);

    res.json({
      success: true,
      message: 'Tax engine configuration updated',
      data: taxEngineService.getConfig(),
    });
  } catch (error) {
    logger.error('Failed to update tax config', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update tax config',
    });
  }
}

/**
 * Test tax engine connection
 * POST /api/tax/test-connection
 */
export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const result = await taxEngineService.testConnection();

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Tax engine connection test failed', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    });
  }
}

/**
 * Create or update tax rule
 * POST /api/tax/rules
 */
export async function createTaxRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleData = req.body;

    // Validate required fields
    if (!ruleData.name || !ruleData.country || !ruleData.taxType || ruleData.rate === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, country, taxType, rate',
      });
      return;
    }

    const rule = await prisma.taxRule.create({
      data: {
        name: ruleData.name,
        description: ruleData.description,
        country: ruleData.country,
        state: ruleData.state,
        city: ruleData.city,
        postalCode: ruleData.postalCode,
        jurisdiction: ruleData.jurisdiction,
        taxType: ruleData.taxType,
        rate: ruleData.rate,
        productCategory: ruleData.productCategory,
        taxCode: ruleData.taxCode,
        priority: ruleData.priority || 0,
        isActive: ruleData.isActive !== false,
        effectiveFrom: ruleData.effectiveFrom ? new Date(ruleData.effectiveFrom) : new Date(),
        effectiveTo: ruleData.effectiveTo ? new Date(ruleData.effectiveTo) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    logger.error('Failed to create tax rule', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create tax rule',
    });
  }
}

/**
 * Get all tax rules
 * GET /api/tax/rules
 */
export async function getTaxRules(req: Request, res: Response): Promise<void> {
  try {
    const { country, state, taxType, isActive } = req.query;

    const where: any = {};
    if (country) where.country = country;
    if (state) where.state = state;
    if (taxType) where.taxType = taxType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.taxRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { effectiveFrom: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    logger.error('Failed to get tax rules', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get tax rules',
    });
  }
}

/**
 * Update tax rule
 * PUT /api/tax/rules/:id
 */
export async function updateTaxRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await prisma.taxRule.update({
      where: { id },
      data: {
        ...updateData,
        effectiveFrom: updateData.effectiveFrom ? new Date(updateData.effectiveFrom) : undefined,
        effectiveTo: updateData.effectiveTo ? new Date(updateData.effectiveTo) : undefined,
      },
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    logger.error('Failed to update tax rule', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update tax rule',
    });
  }
}

/**
 * Delete tax rule
 * DELETE /api/tax/rules/:id
 */
export async function deleteTaxRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.taxRule.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Tax rule deactivated',
    });
  } catch (error) {
    logger.error('Failed to delete tax rule', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete tax rule',
    });
  }
}

/**
 * Create tax exemption
 * POST /api/tax/exemptions
 */
export async function createTaxExemption(req: Request, res: Response): Promise<void> {
  try {
    const exemptionData = req.body;

    // Validate required fields
    if (!exemptionData.exemptionType || !exemptionData.entityId || !exemptionData.entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: exemptionType, entityId, entityType',
      });
      return;
    }

    const exemption = await prisma.taxExemption.create({
      data: {
        exemptionType: exemptionData.exemptionType,
        entityId: exemptionData.entityId,
        entityType: exemptionData.entityType,
        certificateNumber: exemptionData.certificateNumber,
        certificateType: exemptionData.certificateType,
        issuingAuthority: exemptionData.issuingAuthority,
        country: exemptionData.country,
        state: exemptionData.state,
        taxTypes: JSON.stringify(exemptionData.taxTypes || []),
        effectiveFrom: exemptionData.effectiveFrom ? new Date(exemptionData.effectiveFrom) : new Date(),
        effectiveTo: exemptionData.effectiveTo ? new Date(exemptionData.effectiveTo) : null,
        isActive: exemptionData.isActive !== false,
        documentUrl: exemptionData.documentUrl,
        notes: exemptionData.notes,
      },
    });

    res.status(201).json({
      success: true,
      data: exemption,
    });
  } catch (error) {
    logger.error('Failed to create tax exemption', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create tax exemption',
    });
  }
}

/**
 * Get tax exemptions
 * GET /api/tax/exemptions
 */
export async function getTaxExemptions(req: Request, res: Response): Promise<void> {
  try {
    const { entityId, entityType, isActive } = req.query;

    const where: any = {};
    if (entityId) where.entityId = entityId;
    if (entityType) where.entityType = entityType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const exemptions = await prisma.taxExemption.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' },
    });

    res.json({
      success: true,
      data: exemptions,
    });
  } catch (error) {
    logger.error('Failed to get tax exemptions', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get tax exemptions',
    });
  }
}
