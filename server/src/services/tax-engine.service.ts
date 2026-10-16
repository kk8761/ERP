/**
 * Tax Engine Integration Service
 * 
 * Integrates with external tax calculation engines (Avalara, Vertex)
 * to automatically calculate taxes for transactions.
 * 
 * Supports:
 * - VAT (Value Added Tax)
 * - GST (Goods and Services Tax)
 * - Sales Tax
 * - Other regional tax types
 * 
 * Requirements: 10.6, 18.2, 18.4
 */

import prisma from '../config/prisma';
import { logger } from '../utils/logger';

// Tax Engine Provider Types
export enum TaxEngineProvider {
  AVALARA = 'avalara',
  VERTEX = 'vertex',
  INTERNAL = 'internal', // Fallback internal calculation
}

// Tax Types
export enum TaxType {
  VAT = 'vat',           // Value Added Tax (Europe, etc.)
  GST = 'gst',           // Goods and Services Tax (India, Australia, etc.)
  SALES_TAX = 'sales_tax', // US Sales Tax
  EXCISE = 'excise',     // Excise Tax
  CUSTOMS = 'customs',   // Customs Duty
  OTHER = 'other',
}

// Tax Calculation Request
export interface TaxCalculationRequest {
  transactionId?: string;
  transactionType: 'invoice' | 'order' | 'quote';
  customerAddress: Address;
  sellerAddress: Address;
  lineItems: TaxLineItem[];
  currency: string;
  transactionDate?: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface TaxLineItem {
  itemCode?: string;
  description: string;
  quantity: number;
  amount: number;
  taxCode?: string; // Product tax category code
  discounted?: boolean;
}

// Tax Calculation Response
export interface TaxCalculationResponse {
  totalTax: number;
  taxByType: TaxBreakdown[];
  lineItemTaxes: LineItemTax[];
  taxableAmount: number;
  exemptAmount: number;
  taxDate: Date;
  taxEngineProvider: TaxEngineProvider;
  taxEngineTransactionId?: string;
}

export interface TaxBreakdown {
  taxType: TaxType;
  taxName: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  jurisdiction?: string;
}

export interface LineItemTax {
  lineNumber: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdown[];
}

// Tax Configuration
export interface TaxEngineConfig {
  provider: TaxEngineProvider;
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
  companyCode?: string;
  accountId?: string;
  testMode?: boolean;
}

class TaxEngineService {
  private config: TaxEngineConfig;

  constructor() {
    // Load configuration from environment or database
    this.config = {
      provider: (process.env.TAX_ENGINE_PROVIDER as TaxEngineProvider) || TaxEngineProvider.INTERNAL,
      enabled: process.env.TAX_ENGINE_ENABLED === 'true',
      apiKey: process.env.TAX_ENGINE_API_KEY,
      apiUrl: process.env.TAX_ENGINE_API_URL,
      companyCode: process.env.TAX_ENGINE_COMPANY_CODE,
      accountId: process.env.TAX_ENGINE_ACCOUNT_ID,
      testMode: process.env.TAX_ENGINE_TEST_MODE === 'true',
    };
  }

  /**
   * Calculate taxes for a transaction
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    try {
      logger.info('Calculating tax', {
        provider: this.config.provider,
        transactionType: request.transactionType,
        lineItemCount: request.lineItems.length,
      });

      // Validate request
      this.validateTaxRequest(request);

      // Route to appropriate tax engine
      let response: TaxCalculationResponse;

      if (!this.config.enabled) {
        logger.warn('Tax engine disabled, using internal calculation');
        response = await this.calculateTaxInternal(request);
      } else {
        switch (this.config.provider) {
          case TaxEngineProvider.AVALARA:
            response = await this.calculateTaxAvalara(request);
            break;
          case TaxEngineProvider.VERTEX:
            response = await this.calculateTaxVertex(request);
            break;
          default:
            response = await this.calculateTaxInternal(request);
        }
      }

      // Store tax calculation record
      await this.storeTaxCalculation(request, response);

      return response;
    } catch (error) {
      logger.error('Tax calculation failed', { error, request });
      throw new Error(`Tax calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate tax using Avalara API
   */
  private async calculateTaxAvalara(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    try {
      // Avalara API integration
      const avalaraRequest = {
        type: 'SalesInvoice',
        companyCode: this.config.companyCode,
        date: request.transactionDate || new Date(),
        customerCode: request.transactionId || 'GUEST',
        addresses: {
          shipFrom: {
            line1: request.sellerAddress.line1,
            line2: request.sellerAddress.line2,
            city: request.sellerAddress.city,
            region: request.sellerAddress.state,
            postalCode: request.sellerAddress.postalCode,
            country: request.sellerAddress.country,
          },
          shipTo: {
            line1: request.customerAddress.line1,
            line2: request.customerAddress.line2,
            city: request.customerAddress.city,
            region: request.customerAddress.state,
            postalCode: request.customerAddress.postalCode,
            country: request.customerAddress.country,
          },
        },
        lines: request.lineItems.map((item, index) => ({
          number: (index + 1).toString(),
          quantity: item.quantity,
          amount: item.amount,
          taxCode: item.taxCode,
          description: item.description,
          itemCode: item.itemCode,
        })),
        commit: false, // Don't commit in test mode
        currencyCode: request.currency,
      };

      // Make API call to Avalara
      const apiUrl = this.config.apiUrl || 'https://rest.avatax.com/api/v2';
      const response = await fetch(`${apiUrl}/transactions/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.accountId}:${this.config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(avalaraRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Avalara API error: ${JSON.stringify(errorData)}`);
      }

      const avalaraResponse = await response.json();

      // Transform Avalara response to our format
      return this.transformAvalaraResponse(avalaraResponse, request);
    } catch (error) {
      logger.error('Avalara tax calculation failed', { error });
      // Fallback to internal calculation
      logger.warn('Falling back to internal tax calculation');
      return this.calculateTaxInternal(request);
    }
  }

  /**
   * Transform Avalara response to standard format
   */
  private transformAvalaraResponse(
    avalaraResponse: any,
    request: TaxCalculationRequest
  ): TaxCalculationResponse {
    const taxByType: TaxBreakdown[] = [];
    const lineItemTaxes: LineItemTax[] = [];

    // Process line items
    if (avalaraResponse.lines) {
      avalaraResponse.lines.forEach((line: any) => {
        const lineItemTax: LineItemTax = {
          lineNumber: parseInt(line.lineNumber),
          taxAmount: line.tax,
          taxBreakdown: [],
        };

        // Process tax details for this line
        if (line.details) {
          line.details.forEach((detail: any) => {
            const breakdown: TaxBreakdown = {
              taxType: this.mapAvalaraTaxType(detail.taxType),
              taxName: detail.taxName,
              rate: detail.rate,
              taxableAmount: detail.taxableAmount,
              taxAmount: detail.tax,
              jurisdiction: detail.jurisName,
            };
            lineItemTax.taxBreakdown.push(breakdown);
          });
        }

        lineItemTaxes.push(lineItemTax);
      });
    }

    // Aggregate tax by type
    const taxTypeMap = new Map<string, TaxBreakdown>();
    lineItemTaxes.forEach((lineItem) => {
      lineItem.taxBreakdown.forEach((breakdown) => {
        const key = `${breakdown.taxType}-${breakdown.taxName}`;
        if (taxTypeMap.has(key)) {
          const existing = taxTypeMap.get(key)!;
          existing.taxableAmount += breakdown.taxableAmount;
          existing.taxAmount += breakdown.taxAmount;
        } else {
          taxTypeMap.set(key, { ...breakdown });
        }
      });
    });

    return {
      totalTax: avalaraResponse.totalTax,
      taxByType: Array.from(taxTypeMap.values()),
      lineItemTaxes,
      taxableAmount: avalaraResponse.totalTaxable,
      exemptAmount: avalaraResponse.totalExempt || 0,
      taxDate: new Date(avalaraResponse.date),
      taxEngineProvider: TaxEngineProvider.AVALARA,
      taxEngineTransactionId: avalaraResponse.code,
    };
  }

  /**
   * Map Avalara tax type to our tax type enum
   */
  private mapAvalaraTaxType(avalaraTaxType: string): TaxType {
    const typeMap: Record<string, TaxType> = {
      'Sales': TaxType.SALES_TAX,
      'Use': TaxType.SALES_TAX,
      'VAT': TaxType.VAT,
      'GST': TaxType.GST,
      'Excise': TaxType.EXCISE,
      'Customs': TaxType.CUSTOMS,
    };
    return typeMap[avalaraTaxType] || TaxType.OTHER;
  }

  /**
   * Calculate tax using Vertex API
   */
  private async calculateTaxVertex(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    try {
      // Vertex API integration
      const vertexRequest = {
        saleMessageType: 'INVOICE',
        transactionId: request.transactionId,
        transactionDate: (request.transactionDate || new Date()).toISOString(),
        seller: {
          company: this.config.companyCode,
          physicalOrigin: {
            streetAddress1: request.sellerAddress.line1,
            streetAddress2: request.sellerAddress.line2,
            city: request.sellerAddress.city,
            mainDivision: request.sellerAddress.state,
            postalCode: request.sellerAddress.postalCode,
            country: request.sellerAddress.country,
          },
        },
        customer: {
          destination: {
            streetAddress1: request.customerAddress.line1,
            streetAddress2: request.customerAddress.line2,
            city: request.customerAddress.city,
            mainDivision: request.customerAddress.state,
            postalCode: request.customerAddress.postalCode,
            country: request.customerAddress.country,
          },
        },
        lineItems: request.lineItems.map((item, index) => ({
          lineItemNumber: index + 1,
          product: {
            productClass: item.taxCode,
            value: item.itemCode,
          },
          quantity: {
            value: item.quantity,
          },
          extendedPrice: item.amount,
        })),
        currency: {
          isoCurrencyCodeAlpha: request.currency,
        },
      };

      // Make API call to Vertex
      const apiUrl = this.config.apiUrl || 'https://api.vertexsmb.com/vertex-ws/services/CalculateTax70';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vertexRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Vertex API error: ${JSON.stringify(errorData)}`);
      }

      const vertexResponse = await response.json();

      // Transform Vertex response to our format
      return this.transformVertexResponse(vertexResponse, request);
    } catch (error) {
      logger.error('Vertex tax calculation failed', { error });
      // Fallback to internal calculation
      logger.warn('Falling back to internal tax calculation');
      return this.calculateTaxInternal(request);
    }
  }

  /**
   * Transform Vertex response to standard format
   */
  private transformVertexResponse(
    vertexResponse: any,
    request: TaxCalculationRequest
  ): TaxCalculationResponse {
    const taxByType: TaxBreakdown[] = [];
    const lineItemTaxes: LineItemTax[] = [];

    let totalTax = 0;
    let taxableAmount = 0;

    // Process line items
    if (vertexResponse.lineItems) {
      vertexResponse.lineItems.forEach((line: any) => {
        const lineItemTax: LineItemTax = {
          lineNumber: line.lineItemNumber,
          taxAmount: 0,
          taxBreakdown: [],
        };

        // Process taxes for this line
        if (line.taxes) {
          line.taxes.forEach((tax: any) => {
            const breakdown: TaxBreakdown = {
              taxType: this.mapVertexTaxType(tax.taxType),
              taxName: tax.impositionType || tax.taxType,
              rate: tax.effectiveRate,
              taxableAmount: tax.taxable,
              taxAmount: tax.calculatedTax,
              jurisdiction: tax.jurisdiction,
            };
            lineItemTax.taxBreakdown.push(breakdown);
            lineItemTax.taxAmount += tax.calculatedTax;
            totalTax += tax.calculatedTax;
            taxableAmount += tax.taxable;
          });
        }

        lineItemTaxes.push(lineItemTax);
      });
    }

    // Aggregate tax by type
    const taxTypeMap = new Map<string, TaxBreakdown>();
    lineItemTaxes.forEach((lineItem) => {
      lineItem.taxBreakdown.forEach((breakdown) => {
        const key = `${breakdown.taxType}-${breakdown.taxName}`;
        if (taxTypeMap.has(key)) {
          const existing = taxTypeMap.get(key)!;
          existing.taxableAmount += breakdown.taxableAmount;
          existing.taxAmount += breakdown.taxAmount;
        } else {
          taxTypeMap.set(key, { ...breakdown });
        }
      });
    });

    return {
      totalTax,
      taxByType: Array.from(taxTypeMap.values()),
      lineItemTaxes,
      taxableAmount,
      exemptAmount: 0,
      taxDate: new Date(),
      taxEngineProvider: TaxEngineProvider.VERTEX,
      taxEngineTransactionId: vertexResponse.transactionId,
    };
  }

  /**
   * Map Vertex tax type to our tax type enum
   */
  private mapVertexTaxType(vertexTaxType: string): TaxType {
    const typeMap: Record<string, TaxType> = {
      'SALES': TaxType.SALES_TAX,
      'USE': TaxType.SALES_TAX,
      'VAT': TaxType.VAT,
      'GST': TaxType.GST,
      'EXCISE': TaxType.EXCISE,
      'CUSTOMS': TaxType.CUSTOMS,
    };
    return typeMap[vertexTaxType.toUpperCase()] || TaxType.OTHER;
  }

  /**
   * Internal tax calculation (fallback)
   * Uses tax rules stored in the database
   */
  private async calculateTaxInternal(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    try {
      // Get applicable tax rules based on addresses
      const taxRules = await this.getApplicableTaxRules(
        request.customerAddress,
        request.sellerAddress
      );

      const lineItemTaxes: LineItemTax[] = [];
      const taxByTypeMap = new Map<string, TaxBreakdown>();
      let totalTax = 0;
      let taxableAmount = 0;

      // Calculate tax for each line item
      request.lineItems.forEach((item, index) => {
        const lineItemTax: LineItemTax = {
          lineNumber: index + 1,
          taxAmount: 0,
          taxBreakdown: [],
        };

        // Apply each tax rule
        taxRules.forEach((rule) => {
          const itemTaxableAmount = item.amount;
          const itemTaxAmount = itemTaxableAmount * (rule.rate / 100);

          const breakdown: TaxBreakdown = {
            taxType: rule.taxType as TaxType,
            taxName: rule.name,
            rate: rule.rate,
            taxableAmount: itemTaxableAmount,
            taxAmount: itemTaxAmount,
            jurisdiction: rule.jurisdiction,
          };

          lineItemTax.taxBreakdown.push(breakdown);
          lineItemTax.taxAmount += itemTaxAmount;

          // Aggregate by tax type
          const key = `${rule.taxType}-${rule.name}`;
          if (taxByTypeMap.has(key)) {
            const existing = taxByTypeMap.get(key)!;
            existing.taxableAmount += itemTaxableAmount;
            existing.taxAmount += itemTaxAmount;
          } else {
            taxByTypeMap.set(key, { ...breakdown });
          }
        });

        totalTax += lineItemTax.taxAmount;
        taxableAmount += item.amount;
        lineItemTaxes.push(lineItemTax);
      });

      return {
        totalTax,
        taxByType: Array.from(taxByTypeMap.values()),
        lineItemTaxes,
        taxableAmount,
        exemptAmount: 0,
        taxDate: new Date(),
        taxEngineProvider: TaxEngineProvider.INTERNAL,
      };
    } catch (error) {
      logger.error('Internal tax calculation failed', { error });
      throw error;
    }
  }

  /**
   * Get applicable tax rules based on addresses
   */
  private async getApplicableTaxRules(
    customerAddress: Address,
    sellerAddress: Address
  ): Promise<any[]> {
    try {
      // Query tax rules from database
      const rules = await prisma.taxRule.findMany({
        where: {
          isActive: true,
          OR: [
            {
              country: customerAddress.country,
              state: customerAddress.state || undefined,
            },
            {
              country: sellerAddress.country,
              state: sellerAddress.state || undefined,
            },
          ],
        },
        orderBy: {
          priority: 'desc',
        },
      });

      return rules;
    } catch (error) {
      logger.error('Failed to get tax rules', { error });
      return [];
    }
  }

  /**
   * Validate tax calculation request
   */
  private validateTaxRequest(request: TaxCalculationRequest): void {
    if (!request.customerAddress || !request.customerAddress.country) {
      throw new Error('Customer address with country is required');
    }

    if (!request.sellerAddress || !request.sellerAddress.country) {
      throw new Error('Seller address with country is required');
    }

    if (!request.lineItems || request.lineItems.length === 0) {
      throw new Error('At least one line item is required');
    }

    if (!request.currency) {
      throw new Error('Currency is required');
    }
  }

  /**
   * Store tax calculation record for audit trail
   */
  private async storeTaxCalculation(
    request: TaxCalculationRequest,
    response: TaxCalculationResponse
  ): Promise<void> {
    try {
      await prisma.taxCalculation.create({
        data: {
          transactionId: request.transactionId,
          transactionType: request.transactionType,
          taxEngineProvider: response.taxEngineProvider,
          taxEngineTransactionId: response.taxEngineTransactionId,
          totalTax: response.totalTax,
          taxableAmount: response.taxableAmount,
          exemptAmount: response.exemptAmount,
          currency: request.currency,
          customerCountry: request.customerAddress.country,
          customerState: request.customerAddress.state,
          sellerCountry: request.sellerAddress.country,
          sellerState: request.sellerAddress.state,
          calculationDate: response.taxDate,
          requestData: JSON.stringify(request),
          responseData: JSON.stringify(response),
        },
      });
    } catch (error) {
      // Log error but don't fail the tax calculation
      logger.error('Failed to store tax calculation record', { error });
    }
  }

  /**
   * Get tax calculation history for a transaction
   */
  async getTaxCalculationHistory(transactionId: string): Promise<any[]> {
    try {
      const calculations = await prisma.taxCalculation.findMany({
        where: {
          transactionId,
        },
        orderBy: {
          calculationDate: 'desc',
        },
      });

      return calculations;
    } catch (error) {
      logger.error('Failed to get tax calculation history', { error });
      return [];
    }
  }

  /**
   * Update tax engine configuration
   */
  async updateConfig(config: Partial<TaxEngineConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...config,
    };
    logger.info('Tax engine configuration updated', { provider: this.config.provider });
  }

  /**
   * Get current tax engine configuration (without sensitive data)
   */
  getConfig(): Omit<TaxEngineConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Test tax engine connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; provider: TaxEngineProvider }> {
    try {
      if (!this.config.enabled) {
        return {
          success: false,
          message: 'Tax engine is disabled',
          provider: this.config.provider,
        };
      }

      // Create a simple test request
      const testRequest: TaxCalculationRequest = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Test St',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'US',
        },
        sellerAddress: {
          line1: '456 Seller Ave',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'US',
        },
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            amount: 100,
          },
        ],
        currency: 'USD',
      };

      const response = await this.calculateTax(testRequest);

      return {
        success: true,
        message: `Successfully connected to ${this.config.provider}. Test tax calculated: ${response.totalTax}`,
        provider: this.config.provider,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.config.provider,
      };
    }
  }
}

export const taxEngineService = new TaxEngineService();
