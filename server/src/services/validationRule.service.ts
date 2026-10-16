/**
 * Validation Rule Engine Service
 * Defines and enforces validation rules without code
 * Requirements: 26.4
 * Task: 37.4
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationRuleDefinition {
  name: string;
  description?: string;
  entityName: string;
  ruleType: 'field_validation' | 'cross_field' | 'record_validation';
  condition: ValidationCondition;
  errorMessage: string;
}

export interface ValidationCondition {
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'matches_pattern' | 'and' | 'or';
  field?: string;
  value?: any;
  conditions?: ValidationCondition[]; // For AND/OR operators
  pattern?: string; // For regex matching
}

export class ValidationRuleService {
  /**
   * Create a validation rule
   */
  async createRule(
    definition: ValidationRuleDefinition,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    try {
      this.validateRuleDefinition(definition);

      const rule = await prisma.validationRule.create({
        data: {
          name: definition.name,
          description: definition.description,
          entityName: definition.entityName,
          ruleType: definition.ruleType,
          condition: definition.condition as any,
          errorMessage: definition.errorMessage,
          isActive: true,
          tenantId: tenantId || null,
          createdBy: userId,
        },
      });

      return {
        success: true,
        rule,
      };
    } catch (error: any) {
      throw new Error(`Failed to create validation rule: ${error.message}`);
    }
  }

  /**
   * Get all validation rules for an entity
   */
  async getRulesForEntity(
    entityName: string,
    tenantId?: string
  ): Promise<any[]> {
    return prisma.validationRule.findMany({
      where: {
        entityName,
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Validate a record against all rules
   */
  async validateRecord(
    entityName: string,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const rules = await this.getRulesForEntity(entityName, tenantId);
    const errors: string[] = [];

    for (const rule of rules) {
      const isValid = this.evaluateCondition(rule.condition, data);
      if (!isValid) {
        errors.push(rule.errorMessage);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a specific field
   */
  async validateField(
    entityName: string,
    fieldName: string,
    value: any,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const rules = await prisma.validationRule.findMany({
      where: {
        entityName,
        ruleType: 'field_validation',
        tenantId: tenantId || null,
        isActive: true,
      },
    });

    const errors: string[] = [];

    for (const rule of rules) {
      const condition = rule.condition as any;
      if (condition.field === fieldName) {
        const testData = { ...data, [fieldName]: value };
        const isValid = this.evaluateCondition(condition, testData);
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate a validation condition
   */
  private evaluateCondition(
    condition: any,
    data: Record<string, any>
  ): boolean {
    const { operator, field, value, conditions, pattern } = condition;

    switch (operator) {
      case 'equals':
        return data[field!] === value;

      case 'not_equals':
        return data[field!] !== value;

      case 'greater_than':
        return Number(data[field!]) > Number(value);

      case 'less_than':
        return Number(data[field!]) < Number(value);

      case 'greater_than_or_equal':
        return Number(data[field!]) >= Number(value);

      case 'less_than_or_equal':
        return Number(data[field!]) <= Number(value);

      case 'contains':
        return String(data[field!]).includes(String(value));

      case 'not_contains':
        return !String(data[field!]).includes(String(value));

      case 'starts_with':
        return String(data[field!]).startsWith(String(value));

      case 'ends_with':
        return String(data[field!]).endsWith(String(value));

      case 'is_empty':
        return (
          data[field!] === null ||
          data[field!] === undefined ||
          data[field!] === ''
        );

      case 'is_not_empty':
        return (
          data[field!] !== null &&
          data[field!] !== undefined &&
          data[field!] !== ''
        );

      case 'matches_pattern':
        return new RegExp(pattern!).test(String(data[field!]));

      case 'and':
        return conditions!.every((c) => this.evaluateCondition(c, data));

      case 'or':
        return conditions!.some((c) => this.evaluateCondition(c, data));

      default:
        return true;
    }
  }

  /**
   * Update validation rule
   */
  async updateRule(
    id: string,
    updates: Partial<ValidationRuleDefinition>
  ): Promise<any> {
    return prisma.validationRule.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        condition: updates.condition as any,
        errorMessage: updates.errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete validation rule
   */
  async deleteRule(id: string): Promise<void> {
    await prisma.validationRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate/deactivate validation rule
   */
  async toggleRule(id: string, isActive: boolean): Promise<any> {
    return prisma.validationRule.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Validate rule definition
   */
  private validateRuleDefinition(definition: ValidationRuleDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Rule name is required');
    }

    if (!definition.entityName || definition.entityName.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.ruleType) {
      throw new Error('Rule type is required');
    }

    if (!definition.condition) {
      throw new Error('Condition is required');
    }

    if (!definition.errorMessage || definition.errorMessage.trim() === '') {
      throw new Error('Error message is required');
    }

    this.validateCondition(definition.condition);
  }

  /**
   * Validate condition structure
   */
  private validateCondition(condition: ValidationCondition): void {
    if (!condition.operator) {
      throw new Error('Condition operator is required');
    }

    const validOperators = [
      'equals',
      'not_equals',
      'greater_than',
      'less_than',
      'greater_than_or_equal',
      'less_than_or_equal',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'is_empty',
      'is_not_empty',
      'matches_pattern',
      'and',
      'or',
    ];

    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid operator: ${condition.operator}`);
    }

    // Validate nested conditions for AND/OR
    if (condition.operator === 'and' || condition.operator === 'or') {
      if (!condition.conditions || condition.conditions.length === 0) {
        throw new Error(`${condition.operator} operator requires conditions array`);
      }
      condition.conditions.forEach((c) => this.validateCondition(c));
    } else if (condition.operator === 'matches_pattern') {
      if (!condition.pattern) {
        throw new Error('matches_pattern operator requires pattern');
      }
      // Validate regex pattern
      try {
        new RegExp(condition.pattern);
      } catch (error) {
        throw new Error('Invalid regex pattern');
      }
    } else if (
      condition.operator !== 'is_empty' &&
      condition.operator !== 'is_not_empty'
    ) {
      if (!condition.field) {
        throw new Error('Field is required for this operator');
      }
    }
  }

  /**
   * Get validation rule by ID
   */
  async getRuleById(id: string): Promise<any> {
    return prisma.validationRule.findUnique({
      where: { id },
    });
  }

  /**
   * Get all validation rules
   */
  async getAllRules(tenantId?: string): Promise<any[]> {
    return prisma.validationRule.findMany({
      where: {
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const validationRuleService = new ValidationRuleService();
