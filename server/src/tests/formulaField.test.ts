/**
 * Formula Field Engine Tests
 * Tests for formula field creation, evaluation, and validation
 * Task: 37.5
 */

import { formulaFieldService } from '../services/formulaField.service';

describe('Formula Field Engine', () => {
  describe('Formula Creation', () => {
    it('should create a formula field with valid definition', async () => {
      const definition = {
        name: 'totalAmount',
        label: 'Total Amount',
        entityName: 'Order',
        formula: '{quantity} * {price}',
        returnType: 'number' as const,
        description: 'Calculate total amount from quantity and price',
      };

      const result = await formulaFieldService.createFormulaField(
        definition,
        'test-user-id',
        'test-tenant-id'
      );

      expect(result.success).toBe(true);
      expect(result.formulaField).toBeDefined();
      expect(result.formulaField.name).toBe('totalAmount');
    });

    it('should reject formula field with invalid name', async () => {
      const definition = {
        name: '123invalid',
        label: 'Invalid Name',
        entityName: 'Order',
        formula: '{quantity} * {price}',
        returnType: 'number' as const,
      };

      await expect(
        formulaFieldService.createFormulaField(
          definition,
          'test-user-id',
          'test-tenant-id'
        )
      ).rejects.toThrow('Field name must start with a letter or underscore');
    });

    it('should reject formula with unbalanced braces', async () => {
      const definition = {
        name: 'invalidFormula',
        label: 'Invalid Formula',
        entityName: 'Order',
        formula: '{quantity * {price}',
        returnType: 'number' as const,
      };

      await expect(
        formulaFieldService.createFormulaField(
          definition,
          'test-user-id',
          'test-tenant-id'
        )
      ).rejects.toThrow('Formula has unbalanced braces');
    });

    it('should reject formula with dangerous operations', async () => {
      const definition = {
        name: 'dangerousFormula',
        label: 'Dangerous Formula',
        entityName: 'Order',
        formula: 'require("fs").readFileSync("/etc/passwd")',
        returnType: 'text' as const,
      };

      await expect(
        formulaFieldService.createFormulaField(
          definition,
          'test-user-id',
          'test-tenant-id'
        )
      ).rejects.toThrow('Formula contains forbidden operations');
    });
  });

  describe('Formula Evaluation', () => {
    it('should evaluate simple arithmetic formula', async () => {
      const formula = '{quantity} * {price}';
      const data = { quantity: 5, price: 100 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(500);
    });

    it('should evaluate formula with nested field references', async () => {
      const formula = '{customer.creditLimit} - {customer.currentBalance}';
      const data = {
        customer: {
          creditLimit: 10000,
          currentBalance: 3500,
        },
      };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(6500);
    });

    it('should evaluate formula with Math functions', async () => {
      const formula = 'Math.round({amount} * 1.18)';
      const data = { amount: 100.5 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(119);
    });

    it('should evaluate conditional formula', async () => {
      const formula = '{amount} > 1000 ? "High" : "Low"';
      const data = { amount: 1500 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'text'
      );

      expect(result).toBe('High');
    });

    it('should evaluate boolean formula', async () => {
      const formula = '{status} === "approved" && {amount} > 1000';
      const data = { status: 'approved', amount: 1500 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'boolean'
      );

      expect(result).toBe(true);
    });

    it('should evaluate date formula', async () => {
      const formula = 'Math.floor((Date.now() - new Date({createdAt}).getTime()) / (1000 * 60 * 60 * 24))';
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const data = { createdAt: threeDaysAgo.toISOString() };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBeGreaterThanOrEqual(2);
      expect(result).toBeLessThanOrEqual(4);
    });

    it('should evaluate formula with helper functions', async () => {
      const formula = 'AVG({value1}, {value2}, {value3})';
      const data = { value1: 10, value2: 20, value3: 30 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(20);
    });

    it('should evaluate formula with CONCAT function', async () => {
      const formula = 'CONCAT({firstName}, " ", {lastName})';
      const data = { firstName: 'John', lastName: 'Doe' };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'text'
      );

      expect(result).toBe('John Doe');
    });

    it('should evaluate formula with IF function', async () => {
      const formula = 'IF({amount} > 1000, "High Value", "Normal")';
      const data = { amount: 1500 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'text'
      );

      expect(result).toBe('High Value');
    });

    it('should handle missing fields gracefully', async () => {
      const formula = '{quantity} * {price}';
      const data = { quantity: 5 }; // price is missing

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(0); // Missing field defaults to 0
    });
  });

  describe('Formula Validation', () => {
    it('should validate formula with balanced parentheses', () => {
      const formula = '({quantity} * {price}) + ({tax} * 0.1)';
      
      expect(() => {
        formulaFieldService['validateFormula'](formula);
      }).not.toThrow();
    });

    it('should reject formula with unbalanced parentheses', () => {
      const formula = '({quantity} * {price} + {tax}';
      
      expect(() => {
        formulaFieldService['validateFormula'](formula);
      }).toThrow('Formula has unbalanced parentheses');
    });

    it('should reject formula with eval', () => {
      const formula = 'eval("{quantity} * {price}")';
      
      expect(() => {
        formulaFieldService['validateFormula'](formula);
      }).toThrow('Formula contains forbidden operations');
    });

    it('should reject formula with process access', () => {
      const formula = 'process.env.SECRET_KEY';
      
      expect(() => {
        formulaFieldService['validateFormula'](formula);
      }).toThrow('Formula contains forbidden operations');
    });
  });

  describe('Formula Testing', () => {
    it('should test formula with sample data', async () => {
      const formula = '{quantity} * {price}';
      const sampleData = { quantity: 10, price: 50 };

      const result = await formulaFieldService.testFormula(
        formula,
        sampleData,
        'number'
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe(500);
    });

    it('should return error for invalid formula', async () => {
      const formula = '{quantity} * {price';
      const sampleData = { quantity: 10, price: 50 };

      const result = await formulaFieldService.testFormula(
        formula,
        sampleData,
        'number'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Formula Suggestions', () => {
    it('should return formula suggestions', () => {
      const suggestions = formulaFieldService.getFormulaSuggestions();

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      
      const totalAmountSuggestion = suggestions.find(
        s => s.name === 'Total Amount'
      );
      expect(totalAmountSuggestion).toBeDefined();
      expect(totalAmountSuggestion?.formula).toBe('{quantity} * {price}');
    });

    it('should categorize formula suggestions', () => {
      const suggestions = formulaFieldService.getFormulaSuggestions();

      const categories = [...new Set(suggestions.map(s => s.category))];
      expect(categories).toContain('Financial');
      expect(categories).toContain('Date');
      expect(categories).toContain('Text');
      expect(categories).toContain('Conditional');
    });
  });

  describe('Type Conversion', () => {
    it('should convert result to number', () => {
      const result = formulaFieldService['convertToReturnType']('123.45', 'number');
      expect(result).toBe(123.45);
      expect(typeof result).toBe('number');
    });

    it('should convert result to text', () => {
      const result = formulaFieldService['convertToReturnType'](123, 'text');
      expect(result).toBe('123');
      expect(typeof result).toBe('string');
    });

    it('should convert result to boolean', () => {
      const result = formulaFieldService['convertToReturnType'](1, 'boolean');
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should convert result to date', () => {
      const dateString = '2024-01-01';
      const result = formulaFieldService['convertToReturnType'](dateString, 'date');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('Field Value Extraction', () => {
    it('should extract simple field value', () => {
      const data = { quantity: 10 };
      const value = formulaFieldService['getFieldValue'](data, 'quantity');
      expect(value).toBe(10);
    });

    it('should extract nested field value', () => {
      const data = {
        customer: {
          address: {
            city: 'New York',
          },
        },
      };
      const value = formulaFieldService['getFieldValue'](data, 'customer.address.city');
      expect(value).toBe('New York');
    });

    it('should return null for missing field', () => {
      const data = { quantity: 10 };
      const value = formulaFieldService['getFieldValue'](data, 'price');
      expect(value).toBe(0); // Defaults to 0 for calculations
    });

    it('should return null for missing nested field', () => {
      const data = { customer: {} };
      const value = formulaFieldService['getFieldValue'](data, 'customer.address.city');
      expect(value).toBe(0);
    });
  });

  describe('Complex Formula Scenarios', () => {
    it('should evaluate discount calculation formula', async () => {
      const formula = '{total} - ({total} * ({discountPercent} / 100))';
      const data = { total: 1000, discountPercent: 15 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBe(850);
    });

    it('should evaluate profit margin formula', async () => {
      const formula = '(({sellingPrice} - {costPrice}) / {sellingPrice}) * 100';
      const data = { sellingPrice: 150, costPrice: 100 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'number'
      );

      expect(result).toBeCloseTo(33.33, 1);
    });

    it('should evaluate multi-condition formula', async () => {
      const formula = '{status} === "approved" && {amount} > 1000 && {priority} === "high"';
      const data = { status: 'approved', amount: 1500, priority: 'high' };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'boolean'
      );

      expect(result).toBe(true);
    });

    it('should evaluate nested ternary formula', async () => {
      const formula = '{amount} > 10000 ? "Premium" : {amount} > 5000 ? "Standard" : "Basic"';
      const data = { amount: 7500 };

      const result = await formulaFieldService['evaluateFormulaExpression'](
        formula,
        data,
        'text'
      );

      expect(result).toBe('Standard');
    });
  });
});
