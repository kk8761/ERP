/**
 * Tax Engine Service Tests
 * 
 * Tests for tax calculation functionality
 * 
 * Requirements: 10.6, 18.2, 18.4
 */

import { taxEngineService, TaxCalculationRequest, TaxEngineProvider, TaxType } from '../services/tax-engine.service';
import prisma from '../config/prisma';

describe('Tax Engine Service', () => {
  beforeAll(async () => {
    // Create test tax rules
    await prisma.taxRule.createMany({
      data: [
        {
          name: 'US Sales Tax - WA',
          country: 'US',
          state: 'WA',
          taxType: TaxType.SALES_TAX,
          rate: 10.0,
          jurisdiction: 'Washington State',
          priority: 1,
          isActive: true,
          effectiveFrom: new Date('2020-01-01'),
        },
        {
          name: 'UK VAT Standard',
          country: 'GB',
          taxType: TaxType.VAT,
          rate: 20.0,
          jurisdiction: 'United Kingdom',
          priority: 1,
          isActive: true,
          effectiveFrom: new Date('2020-01-01'),
        },
        {
          name: 'India GST',
          country: 'IN',
          taxType: TaxType.GST,
          rate: 18.0,
          jurisdiction: 'India',
          priority: 1,
          isActive: true,
          effectiveFrom: new Date('2020-01-01'),
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.taxRule.deleteMany({
      where: {
        name: {
          in: ['US Sales Tax - WA', 'UK VAT Standard', 'India GST'],
        },
      },
    });
    await prisma.taxCalculation.deleteMany({});
  });

  describe('Internal Tax Calculation', () => {
    test('should calculate US sales tax correctly', async () => {
      const request: TaxCalculationRequest = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
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
            description: 'Product A',
            quantity: 2,
            amount: 100,
          },
          {
            description: 'Product B',
            quantity: 1,
            amount: 50,
          },
        ],
        currency: 'USD',
      };

      const result = await taxEngineService.calculateTax(request);

      expect(result).toBeDefined();
      expect(result.totalTax).toBe(15); // 10% of 150
      expect(result.taxableAmount).toBe(150);
      expect(result.taxEngineProvider).toBe(TaxEngineProvider.INTERNAL);
      expect(result.lineItemTaxes).toHaveLength(2);
      expect(result.taxByType).toHaveLength(1);
      expect(result.taxByType[0].taxType).toBe(TaxType.SALES_TAX);
    });

    test('should calculate UK VAT correctly', async () => {
      const request: TaxCalculationRequest = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '10 Downing Street',
          city: 'London',
          postalCode: 'SW1A 2AA',
          country: 'GB',
        },
        sellerAddress: {
          line1: '123 Business Park',
          city: 'London',
          postalCode: 'E1 6AN',
          country: 'GB',
        },
        lineItems: [
          {
            description: 'Service A',
            quantity: 1,
            amount: 1000,
          },
        ],
        currency: 'GBP',
      };

      const result = await taxEngineService.calculateTax(request);

      expect(result).toBeDefined();
      expect(result.totalTax).toBe(200); // 20% of 1000
      expect(result.taxableAmount).toBe(1000);
      expect(result.taxByType[0].taxType).toBe(TaxType.VAT);
    });

    test('should calculate India GST correctly', async () => {
      const request: TaxCalculationRequest = {
        transactionType: 'invoice',
        customerAddress: {
          line1: 'MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'IN',
        },
        sellerAddress: {
          line1: 'Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'IN',
        },
        lineItems: [
          {
            description: 'Software License',
            quantity: 1,
            amount: 10000,
          },
        ],
        currency: 'INR',
      };

      const result = await taxEngineService.calculateTax(request);

      expect(result).toBeDefined();
      expect(result.totalTax).toBe(1800); // 18% of 10000
      expect(result.taxableAmount).toBe(10000);
      expect(result.taxByType[0].taxType).toBe(TaxType.GST);
    });

    test('should handle multiple line items correctly', async () => {
      const request: TaxCalculationRequest = {
        transactionType: 'order',
        customerAddress: {
          line1: '123 Main St',
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
            description: 'Item 1',
            quantity: 3,
            amount: 30,
          },
          {
            description: 'Item 2',
            quantity: 2,
            amount: 40,
          },
          {
            description: 'Item 3',
            quantity: 1,
            amount: 50,
          },
        ],
        currency: 'USD',
      };

      const result = await taxEngineService.calculateTax(request);

      expect(result).toBeDefined();
      expect(result.totalTax).toBe(12); // 10% of 120
      expect(result.taxableAmount).toBe(120);
      expect(result.lineItemTaxes).toHaveLength(3);
      expect(result.lineItemTaxes[0].taxAmount).toBe(3); // 10% of 30
      expect(result.lineItemTaxes[1].taxAmount).toBe(4); // 10% of 40
      expect(result.lineItemTaxes[2].taxAmount).toBe(5); // 10% of 50
    });
  });

  describe('Tax Calculation Validation', () => {
    test('should throw error for missing customer address', async () => {
      const request: any = {
        transactionType: 'invoice',
        sellerAddress: {
          line1: '456 Seller Ave',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'US',
        },
        lineItems: [
          {
            description: 'Product A',
            quantity: 1,
            amount: 100,
          },
        ],
        currency: 'USD',
      };

      await expect(taxEngineService.calculateTax(request)).rejects.toThrow(
        'Customer address with country is required'
      );
    });

    test('should throw error for missing seller address', async () => {
      const request: any = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'US',
        },
        lineItems: [
          {
            description: 'Product A',
            quantity: 1,
            amount: 100,
          },
        ],
        currency: 'USD',
      };

      await expect(taxEngineService.calculateTax(request)).rejects.toThrow(
        'Seller address with country is required'
      );
    });

    test('should throw error for empty line items', async () => {
      const request: TaxCalculationRequest = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
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
        lineItems: [],
        currency: 'USD',
      };

      await expect(taxEngineService.calculateTax(request)).rejects.toThrow(
        'At least one line item is required'
      );
    });

    test('should throw error for missing currency', async () => {
      const request: any = {
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
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
            description: 'Product A',
            quantity: 1,
            amount: 100,
          },
        ],
      };

      await expect(taxEngineService.calculateTax(request)).rejects.toThrow(
        'Currency is required'
      );
    });
  });

  describe('Tax Calculation History', () => {
    test('should store tax calculation in database', async () => {
      const request: TaxCalculationRequest = {
        transactionId: 'TEST-INV-001',
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
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
            description: 'Product A',
            quantity: 1,
            amount: 100,
          },
        ],
        currency: 'USD',
      };

      await taxEngineService.calculateTax(request);

      const history = await taxEngineService.getTaxCalculationHistory('TEST-INV-001');

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].transactionId).toBe('TEST-INV-001');
      expect(history[0].totalTax).toBe(10);
    });

    test('should retrieve tax calculation history', async () => {
      const transactionId = 'TEST-INV-002';

      // Create multiple calculations
      const request: TaxCalculationRequest = {
        transactionId,
        transactionType: 'invoice',
        customerAddress: {
          line1: '123 Main St',
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
            description: 'Product A',
            quantity: 1,
            amount: 100,
          },
        ],
        currency: 'USD',
      };

      await taxEngineService.calculateTax(request);
      await taxEngineService.calculateTax(request);

      const history = await taxEngineService.getTaxCalculationHistory(transactionId);

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Tax Engine Configuration', () => {
    test('should get current configuration', () => {
      const config = taxEngineService.getConfig();

      expect(config).toBeDefined();
      expect(config.provider).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config).not.toHaveProperty('apiKey'); // API key should not be exposed
    });

    test('should update configuration', async () => {
      await taxEngineService.updateConfig({
        enabled: false,
      });

      const config = taxEngineService.getConfig();
      expect(config.enabled).toBe(false);

      // Reset to original state
      await taxEngineService.updateConfig({
        enabled: process.env.TAX_ENGINE_ENABLED === 'true',
      });
    });
  });

  describe('Tax Rules Management', () => {
    test('should create tax rule', async () => {
      const rule = await prisma.taxRule.create({
        data: {
          name: 'Test Tax Rule',
          country: 'US',
          state: 'CA',
          taxType: TaxType.SALES_TAX,
          rate: 8.5,
          jurisdiction: 'California',
          priority: 1,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      expect(rule).toBeDefined();
      expect(rule.name).toBe('Test Tax Rule');
      expect(rule.rate).toBe(8.5);

      // Clean up
      await prisma.taxRule.delete({ where: { id: rule.id } });
    });

    test('should get applicable tax rules', async () => {
      const rules = await prisma.taxRule.findMany({
        where: {
          country: 'US',
          state: 'WA',
          isActive: true,
        },
      });

      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].country).toBe('US');
      expect(rules[0].state).toBe('WA');
    });
  });
});
