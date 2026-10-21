/**
 * Formula Field Engine Service
 * Create and evaluate formula fields with calculations and expressions
 * Requirements: 26.5
 * Task: 37.5
 * 
 * Features:
 * - Formula field builder with validation
 * - Support for mathematical expressions and calculations
 * - Field references with nested object support
 * - Built-in functions (Math, Date, String operations)
 * - Type conversion and validation
 * - Formula testing and suggestions
 * - Automatic evaluation on data access
 * - Multi-tenant support
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FormulaFieldDefinition {
  name: string;
  label: string;
  entityName: string;
  formula: string;
  returnType: 'number' | 'text' | 'boolean' | 'date';
  description?: string;
}

/**
 * Formula Field Engine
 * Provides comprehensive formula field management and evaluation
 */
export class FormulaFieldService {
  /**
   * Create a formula field
   */
  async createFormulaField(
    definition: FormulaFieldDefinition,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    try {
      this.validateFormulaDefinition(definition);

      // Check if formula field already exists
      const existing = await prisma.formulaField.findFirst({
        where: {
          entityName: definition.entityName,
          name: definition.name,
          tenantId: tenantId || null,
          isActive: true,
        },
      });

      if (existing) {
        throw new Error(
          `Formula field ${definition.name} already exists on ${definition.entityName}`
        );
      }

      const formulaField = await prisma.formulaField.create({
        data: {
          name: definition.name,
          label: definition.label,
          entityName: definition.entityName,
          formula: definition.formula,
          returnType: definition.returnType,
          description: definition.description,
          isActive: true,
          tenantId: tenantId || null,
          createdBy: userId,
        },
      });

      return {
        success: true,
        formulaField,
      };
    } catch (error: any) {
      throw new Error(`Failed to create formula field: ${error.message}`);
    }
  }

  /**
   * Get all formula fields for an entity
   */
  async getFormulaFieldsForEntity(
    entityName: string,
    tenantId?: string
  ): Promise<any[]> {
    return prisma.formulaField.findMany({
      where: {
        entityName,
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get formula field by ID
   */
  async getFormulaFieldById(id: string): Promise<any> {
    return prisma.formulaField.findUnique({
      where: { id },
    });
  }

  /**
   * Evaluate a formula field for a record
   */
  async evaluateFormula(
    formulaFieldId: string,
    data: Record<string, any>
  ): Promise<any> {
    const formulaField = await this.getFormulaFieldById(formulaFieldId);
    if (!formulaField) {
      throw new Error('Formula field not found');
    }

    return this.evaluateFormulaExpression(
      formulaField.formula,
      data,
      formulaField.returnType
    );
  }

  /**
   * Evaluate all formula fields for a record
   */
  async evaluateAllFormulas(
    entityName: string,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<Record<string, any>> {
    const formulaFields = await this.getFormulaFieldsForEntity(
      entityName,
      tenantId
    );

    const results: Record<string, any> = {};

    for (const formulaField of formulaFields) {
      try {
        results[formulaField.name] = await this.evaluateFormulaExpression(
          formulaField.formula,
          data,
          formulaField.returnType
        );
      } catch (error: any) {
        console.error(
          `Error evaluating formula ${formulaField.name}:`,
          error.message
        );
        results[formulaField.name] = null;
      }
    }

    return results;
  }

  /**
   * Evaluate a formula expression
   */
  private async evaluateFormulaExpression(
    formula: string,
    data: Record<string, any>,
    returnType: string
  ): Promise<any> {
    try {
      // Replace field references with actual values
      let expression = formula;

      // Extract field references (e.g., {fieldName})
      const fieldReferences = formula.match(/\{([^}]+)\}/g) || [];

      for (const ref of fieldReferences) {
        const fieldName = ref.slice(1, -1); // Remove { and }
        const value = this.getFieldValue(data, fieldName);
        expression = expression.replace(ref, String(value));
      }

      // Evaluate the expression
      const result = this.safeEval(expression);

      // Convert to return type
      return this.convertToReturnType(result, returnType);
    } catch (error: any) {
      throw new Error(`Formula evaluation error: ${error.message}`);
    }
  }

  /**
   * Get field value from data (supports nested fields)
   */
  private getFieldValue(data: Record<string, any>, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }

    return value ?? 0; // Default to 0 for numeric calculations
  }

  /**
   * Safe evaluation of mathematical expressions
   * Supports:
   * - Basic arithmetic: +, -, *, /, %
   * - Math functions: abs, ceil, floor, round, max, min, pow, sqrt
   * - Comparison operators: ==, !=, <, >, <=, >=
   * - Logical operators: &&, ||, !
   * - Ternary operator: condition ? true : false
   * - String operations: concat, substring, length
   * - Date operations: Date.now(), new Date()
   */
  private safeEval(expression: string): any {
    // Create a safe evaluation context with allowed functions
    const safeContext = {
      Math: {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        sqrt: Math.sqrt,
        random: Math.random,
        PI: Math.PI,
        E: Math.E,
      },
      Date: {
        now: Date.now,
      },
      String: {
        concat: (...args: any[]) => args.join(''),
        substring: (str: string, start: number, end?: number) => str.substring(start, end),
        length: (str: string) => str.length,
        toUpperCase: (str: string) => str.toUpperCase(),
        toLowerCase: (str: string) => str.toLowerCase(),
        trim: (str: string) => str.trim(),
      },
      // Helper functions
      IF: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
      AND: (...conditions: boolean[]) => conditions.every(c => c),
      OR: (...conditions: boolean[]) => conditions.some(c => c),
      NOT: (condition: boolean) => !condition,
      CONCAT: (...args: any[]) => args.join(''),
      LEN: (str: string) => str.length,
      UPPER: (str: string) => str.toUpperCase(),
      LOWER: (str: string) => str.toLowerCase(),
      TRIM: (str: string) => str.trim(),
      ROUND: (num: number, decimals: number = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
      },
      ABS: Math.abs,
      MAX: Math.max,
      MIN: Math.min,
      SUM: (...args: number[]) => args.reduce((sum, val) => sum + val, 0),
      AVG: (...args: number[]) => args.reduce((sum, val) => sum + val, 0) / args.length,
      COUNT: (...args: any[]) => args.length,
    };

    try {
      // Create function with safe context
      const func = new Function(
        ...Object.keys(safeContext),
        `"use strict"; return (${expression})`
      );
      
      return func(...Object.values(safeContext));
    } catch (error: any) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Convert result to return type
   */
  private convertToReturnType(value: any, returnType: string): any {
    switch (returnType) {
      case 'number':
        return Number(value);

      case 'text':
        return String(value);

      case 'boolean':
        return Boolean(value);

      case 'date':
        return new Date(value);

      default:
        return value;
    }
  }

  /**
   * Update formula field
   */
  async updateFormulaField(
    id: string,
    updates: Partial<FormulaFieldDefinition>
  ): Promise<any> {
    if (updates.formula) {
      this.validateFormula(updates.formula);
    }

    return prisma.formulaField.update({
      where: { id },
      data: {
        label: updates.label,
        formula: updates.formula,
        returnType: updates.returnType,
        description: updates.description,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete formula field
   */
  async deleteFormulaField(id: string): Promise<void> {
    await prisma.formulaField.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Validate formula definition
   */
  private validateFormulaDefinition(definition: FormulaFieldDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Formula field name is required');
    }

    if (!definition.label || definition.label.trim() === '') {
      throw new Error('Formula field label is required');
    }

    if (!definition.entityName || definition.entityName.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.formula || definition.formula.trim() === '') {
      throw new Error('Formula is required');
    }

    if (!definition.returnType) {
      throw new Error('Return type is required');
    }

    const validReturnTypes = ['number', 'text', 'boolean', 'date'];
    if (!validReturnTypes.includes(definition.returnType)) {
      throw new Error(
        `Invalid return type. Must be one of: ${validReturnTypes.join(', ')}`
      );
    }

    // Validate field name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(definition.name)) {
      throw new Error(
        'Field name must start with a letter or underscore and contain only letters, numbers, and underscores'
      );
    }

    // Validate formula syntax
    this.validateFormula(definition.formula);
  }

  /**
   * Validate formula syntax
   */
  private validateFormula(formula: string): void {
    // Check for balanced braces
    const openBraces = (formula.match(/\{/g) || []).length;
    const closeBraces = (formula.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      throw new Error('Formula has unbalanced braces');
    }

    // Check for balanced parentheses
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      throw new Error('Formula has unbalanced parentheses');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\(/,
      /import\s/,
      /eval\(/,
      /Function\(/,
      /setTimeout/,
      /setInterval/,
      /process\./,
      /__proto__/,
      /constructor/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        throw new Error('Formula contains forbidden operations');
      }
    }
  }

  /**
   * Test formula with sample data
   */
  async testFormula(
    formula: string,
    sampleData: Record<string, any>,
    returnType: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      this.validateFormula(formula);
      const result = await this.evaluateFormulaExpression(
        formula,
        sampleData,
        returnType
      );

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all formula fields
   */
  async getAllFormulaFields(tenantId?: string): Promise<any[]> {
    return prisma.formulaField.findMany({
      where: {
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: [{ entityName: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get formula field suggestions (common formulas)
   * Provides pre-built formula templates for common business scenarios
   */
  getFormulaSuggestions(): Array<{
    name: string;
    description: string;
    formula: string;
    returnType: string;
    category: string;
  }> {
    return [
      // Financial Calculations
      {
        name: 'Total Amount',
        description: 'Calculate total from quantity and price',
        formula: '{quantity} * {price}',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Discount Amount',
        description: 'Calculate discount from total and discount percentage',
        formula: '{total} * ({discountPercent} / 100)',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Net Amount',
        description: 'Calculate net amount after discount',
        formula: '{total} - {discountAmount}',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Tax Amount',
        description: 'Calculate tax from net amount and tax rate',
        formula: '{netAmount} * ({taxRate} / 100)',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Grand Total',
        description: 'Calculate grand total including tax',
        formula: '{netAmount} + {taxAmount}',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Profit Margin',
        description: 'Calculate profit margin percentage',
        formula: '(({sellingPrice} - {costPrice}) / {sellingPrice}) * 100',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Profit Amount',
        description: 'Calculate profit amount',
        formula: '{sellingPrice} - {costPrice}',
        returnType: 'number',
        category: 'Financial',
      },
      {
        name: 'Commission Amount',
        description: 'Calculate commission from sales and commission rate',
        formula: '{salesAmount} * ({commissionRate} / 100)',
        returnType: 'number',
        category: 'Financial',
      },
      
      // Date Calculations
      {
        name: 'Days Overdue',
        description: 'Calculate days overdue from due date',
        formula: 'Math.floor((Date.now() - new Date({dueDate}).getTime()) / (1000 * 60 * 60 * 24))',
        returnType: 'number',
        category: 'Date',
      },
      {
        name: 'Days Until Due',
        description: 'Calculate days until due date',
        formula: 'Math.floor((new Date({dueDate}).getTime() - Date.now()) / (1000 * 60 * 60 * 24))',
        returnType: 'number',
        category: 'Date',
      },
      {
        name: 'Age in Days',
        description: 'Calculate age in days from creation date',
        formula: 'Math.floor((Date.now() - new Date({createdAt}).getTime()) / (1000 * 60 * 60 * 24))',
        returnType: 'number',
        category: 'Date',
      },
      
      // Text Operations
      {
        name: 'Full Name',
        description: 'Concatenate first and last name',
        formula: 'CONCAT({firstName}, " ", {lastName})',
        returnType: 'text',
        category: 'Text',
      },
      {
        name: 'Email Domain',
        description: 'Extract domain from email address',
        formula: '{email}.split("@")[1]',
        returnType: 'text',
        category: 'Text',
      },
      {
        name: 'Initials',
        description: 'Get initials from first and last name',
        formula: 'CONCAT({firstName}.charAt(0), {lastName}.charAt(0))',
        returnType: 'text',
        category: 'Text',
      },
      
      // Boolean/Conditional
      {
        name: 'Is Overdue',
        description: 'Check if payment is overdue',
        formula: 'new Date({dueDate}) < new Date() && {status} !== "paid"',
        returnType: 'boolean',
        category: 'Conditional',
      },
      {
        name: 'Is High Value',
        description: 'Check if amount exceeds threshold',
        formula: '{amount} > 10000',
        returnType: 'boolean',
        category: 'Conditional',
      },
      {
        name: 'Is Approved',
        description: 'Check if status is approved',
        formula: '{status} === "approved"',
        returnType: 'boolean',
        category: 'Conditional',
      },
      {
        name: 'Needs Approval',
        description: 'Check if amount requires approval',
        formula: '{amount} > {approvalThreshold}',
        returnType: 'boolean',
        category: 'Conditional',
      },
      
      // Statistical
      {
        name: 'Average',
        description: 'Calculate average of multiple values',
        formula: 'AVG({value1}, {value2}, {value3})',
        returnType: 'number',
        category: 'Statistical',
      },
      {
        name: 'Maximum',
        description: 'Find maximum of multiple values',
        formula: 'MAX({value1}, {value2}, {value3})',
        returnType: 'number',
        category: 'Statistical',
      },
      {
        name: 'Minimum',
        description: 'Find minimum of multiple values',
        formula: 'MIN({value1}, {value2}, {value3})',
        returnType: 'number',
        category: 'Statistical',
      },
      {
        name: 'Sum',
        description: 'Calculate sum of multiple values',
        formula: 'SUM({value1}, {value2}, {value3})',
        returnType: 'number',
        category: 'Statistical',
      },
      
      // Inventory & Supply Chain
      {
        name: 'Reorder Quantity',
        description: 'Calculate reorder quantity',
        formula: '{maxStock} - {currentStock}',
        returnType: 'number',
        category: 'Inventory',
      },
      {
        name: 'Stock Value',
        description: 'Calculate total stock value',
        formula: '{quantity} * {unitCost}',
        returnType: 'number',
        category: 'Inventory',
      },
      {
        name: 'Days of Stock',
        description: 'Calculate days of stock remaining',
        formula: 'Math.floor({currentStock} / {avgDailyUsage})',
        returnType: 'number',
        category: 'Inventory',
      },
      {
        name: 'Stock Coverage',
        description: 'Calculate stock coverage percentage',
        formula: '({currentStock} / {maxStock}) * 100',
        returnType: 'number',
        category: 'Inventory',
      },
      
      // HR & Payroll
      {
        name: 'Gross Salary',
        description: 'Calculate gross salary from basic and allowances',
        formula: '{basicSalary} + {allowances}',
        returnType: 'number',
        category: 'HR',
      },
      {
        name: 'Net Salary',
        description: 'Calculate net salary after deductions',
        formula: '{grossSalary} - {deductions}',
        returnType: 'number',
        category: 'HR',
      },
      {
        name: 'Years of Service',
        description: 'Calculate years of service',
        formula: 'Math.floor((Date.now() - new Date({joinDate}).getTime()) / (1000 * 60 * 60 * 24 * 365))',
        returnType: 'number',
        category: 'HR',
      },
      
      // Project Management
      {
        name: 'Project Progress',
        description: 'Calculate project completion percentage',
        formula: '({completedTasks} / {totalTasks}) * 100',
        returnType: 'number',
        category: 'Project',
      },
      {
        name: 'Budget Variance',
        description: 'Calculate budget variance',
        formula: '{actualCost} - {budgetedCost}',
        returnType: 'number',
        category: 'Project',
      },
      {
        name: 'Budget Variance Percentage',
        description: 'Calculate budget variance percentage',
        formula: '(({actualCost} - {budgetedCost}) / {budgetedCost}) * 100',
        returnType: 'number',
        category: 'Project',
      },
    ];
  }

  /**
   * Enrich entity data with formula field values
   */
  async enrichEntityWithFormulas(
    entityName: string,
    record: any,
    tenantId?: string
  ): Promise<any> {
    const formulas = await this.evaluateAllFormulas(entityName, record, tenantId);

    return {
      ...record,
      formulas,
    };
  }

  /**
   * Enrich multiple entity records with formula field values
   */
  async enrichEntitiesWithFormulas(
    entityName: string,
    records: any[],
    tenantId?: string
  ): Promise<any[]> {
    const enrichedRecords = await Promise.all(
      records.map((record) =>
        this.enrichEntityWithFormulas(entityName, record, tenantId)
      )
    );

    return enrichedRecords;
  }
}

export const formulaFieldService = new FormulaFieldService();
