/**
 * Business Rule Engine Service
 * Create and execute business rules on events
 * Requirements: 19.8
 * Task: 37.7
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BusinessRuleDefinition {
  name: string;
  description?: string;
  entityName: string;
  triggerEvent:
    | 'before_create'
    | 'after_create'
    | 'before_update'
    | 'after_update'
    | 'before_delete'
    | 'after_delete';
  condition?: RuleCondition;
  actions: RuleAction[];
  priority?: number;
}

export interface RuleCondition {
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'and'
    | 'or';
  field?: string;
  value?: any;
  conditions?: RuleCondition[];
}

export interface RuleAction {
  type:
    | 'set_field'
    | 'send_email'
    | 'send_notification'
    | 'create_record'
    | 'update_record'
    | 'call_webhook'
    | 'execute_workflow';
  parameters: Record<string, any>;
}

export class BusinessRuleService {
  /**
   * Create a business rule
   */
  async createRule(
    definition: BusinessRuleDefinition,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    try {
      this.validateRuleDefinition(definition);

      const rule = await prisma.businessRule.create({
        data: {
          name: definition.name,
          description: definition.description,
          entityName: definition.entityName,
          triggerEvent: definition.triggerEvent,
          condition: definition.condition as any,
          actions: definition.actions as any,
          priority: definition.priority ?? 0,
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
      throw new Error(`Failed to create business rule: ${error.message}`);
    }
  }

  /**
   * Get all rules for an entity and event
   */
  async getRulesForEvent(
    entityName: string,
    triggerEvent: string,
    tenantId?: string
  ): Promise<any[]> {
    return prisma.businessRule.findMany({
      where: {
        entityName,
        triggerEvent,
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Execute rules for an event
   */
  async executeRules(
    entityName: string,
    triggerEvent: string,
    data: Record<string, any>,
    recordId?: string,
    tenantId?: string
  ): Promise<{
    success: boolean;
    executedRules: number;
    modifiedData?: Record<string, any>;
    errors?: string[];
  }> {
    const rules = await this.getRulesForEvent(entityName, triggerEvent, tenantId);
    let modifiedData = { ...data };
    const errors: string[] = [];
    let executedCount = 0;

    for (const rule of rules) {
      const startTime = Date.now();

      try {
        // Evaluate condition
        const shouldExecute = rule.condition
          ? this.evaluateCondition(rule.condition as any, modifiedData)
          : true;

        if (shouldExecute) {
          // Execute actions
          const actionResults = await this.executeActions(
            rule.actions as any,
            modifiedData,
            recordId,
            entityName,
            tenantId
          );

          // Update modified data if actions modified it
          if (actionResults.modifiedData) {
            modifiedData = actionResults.modifiedData;
          }

          executedCount++;

          // Log execution
          await this.logExecution(
            rule.id,
            entityName,
            recordId || 'new',
            'success',
            Date.now() - startTime,
            null,
            { triggerEvent, data: modifiedData }
          );
        } else {
          // Log skipped execution
          await this.logExecution(
            rule.id,
            entityName,
            recordId || 'new',
            'skipped',
            Date.now() - startTime,
            null,
            { triggerEvent, reason: 'condition_not_met' }
          );
        }
      } catch (error: any) {
        errors.push(`Rule ${rule.name}: ${error.message}`);

        // Log failed execution
        await this.logExecution(
          rule.id,
          entityName,
          recordId || 'new',
          'failure',
          Date.now() - startTime,
          error.message,
          { triggerEvent, data: modifiedData }
        );
      }
    }

    return {
      success: errors.length === 0,
      executedRules: executedCount,
      modifiedData,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    data: Record<string, any>
  ): boolean {
    const { operator, field, value, conditions } = condition;

    switch (operator) {
      case 'equals':
        return data[field!] === value;

      case 'not_equals':
        return data[field!] !== value;

      case 'greater_than':
        return Number(data[field!]) > Number(value);

      case 'less_than':
        return Number(data[field!]) < Number(value);

      case 'contains':
        return String(data[field!]).includes(String(value));

      case 'and':
        return conditions!.every((c) => this.evaluateCondition(c, data));

      case 'or':
        return conditions!.some((c) => this.evaluateCondition(c, data));

      default:
        return true;
    }
  }

  /**
   * Execute actions
   */
  private async executeActions(
    actions: RuleAction[],
    data: Record<string, any>,
    recordId: string | undefined,
    entityName: string,
    tenantId?: string
  ): Promise<{ modifiedData?: Record<string, any> }> {
    let modifiedData = { ...data };

    for (const action of actions) {
      switch (action.type) {
        case 'set_field':
          modifiedData = await this.executeSetFieldAction(action, modifiedData);
          break;

        case 'send_email':
          await this.executeSendEmailAction(action, modifiedData);
          break;

        case 'send_notification':
          await this.executeSendNotificationAction(action, modifiedData);
          break;

        case 'create_record':
          await this.executeCreateRecordAction(action, modifiedData, tenantId);
          break;

        case 'update_record':
          await this.executeUpdateRecordAction(action, modifiedData, tenantId);
          break;

        case 'call_webhook':
          await this.executeCallWebhookAction(action, modifiedData);
          break;

        case 'execute_workflow':
          await this.executeWorkflowAction(action, modifiedData, tenantId);
          break;
      }
    }

    return { modifiedData };
  }

  /**
   * Execute set field action
   */
  private async executeSetFieldAction(
    action: RuleAction,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    const { fieldName, value, valueType } = action.parameters;

    let computedValue = value;

    // Support dynamic values
    if (valueType === 'formula') {
      computedValue = this.evaluateFormula(value, data);
    } else if (valueType === 'field') {
      computedValue = data[value];
    } else if (valueType === 'current_date') {
      computedValue = new Date().toISOString();
    } else if (valueType === 'current_user') {
      computedValue = data.createdBy || data.updatedBy;
    }

    return {
      ...data,
      [fieldName]: computedValue,
    };
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(
    action: RuleAction,
    data: Record<string, any>
  ): Promise<void> {
    const { to, subject, body, template } = action.parameters;

    // Replace placeholders in email content
    const replacedSubject = this.replacePlaceholders(subject, data);
    const replacedBody = this.replacePlaceholders(body, data);

    // TODO: Integrate with email service
    console.log('Sending email:', {
      to,
      subject: replacedSubject,
      body: replacedBody,
      template,
    });
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(
    action: RuleAction,
    data: Record<string, any>
  ): Promise<void> {
    const { userId, message, type } = action.parameters;

    const replacedMessage = this.replacePlaceholders(message, data);

    // TODO: Integrate with notification service
    console.log('Sending notification:', {
      userId,
      message: replacedMessage,
      type,
    });
  }

  /**
   * Execute create record action
   */
  private async executeCreateRecordAction(
    action: RuleAction,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<void> {
    const { entityName, recordData } = action.parameters;

    // Replace placeholders in record data
    const processedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(recordData)) {
      processedData[key] =
        typeof value === 'string' ? this.replacePlaceholders(value, data) : value;
    }

    // TODO: Create record in the specified entity
    console.log('Creating record:', {
      entityName,
      data: processedData,
      tenantId,
    });
  }

  /**
   * Execute update record action
   */
  private async executeUpdateRecordAction(
    action: RuleAction,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<void> {
    const { entityName, recordId, updates } = action.parameters;

    // Replace placeholders in updates
    const processedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      processedUpdates[key] =
        typeof value === 'string' ? this.replacePlaceholders(value, data) : value;
    }

    // TODO: Update record in the specified entity
    console.log('Updating record:', {
      entityName,
      recordId,
      updates: processedUpdates,
      tenantId,
    });
  }

  /**
   * Execute call webhook action
   */
  private async executeCallWebhookAction(
    action: RuleAction,
    data: Record<string, any>
  ): Promise<void> {
    const { url, method, headers, body } = action.parameters;

    // TODO: Make HTTP request to webhook
    console.log('Calling webhook:', {
      url,
      method,
      headers,
      body: body || data,
    });
  }

  /**
   * Execute workflow action
   */
  private async executeWorkflowAction(
    action: RuleAction,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<void> {
    const { workflowId, parameters } = action.parameters;

    // TODO: Trigger workflow execution
    console.log('Executing workflow:', {
      workflowId,
      parameters,
      data,
      tenantId,
    });
  }

  /**
   * Evaluate formula
   */
  private evaluateFormula(formula: string, data: Record<string, any>): any {
    // Simple formula evaluation (can be enhanced)
    let expression = formula;

    // Replace field references
    const fieldReferences = formula.match(/\{([^}]+)\}/g) || [];
    for (const ref of fieldReferences) {
      const fieldName = ref.slice(1, -1);
      const value = data[fieldName] || 0;
      expression = expression.replace(ref, String(value));
    }

    try {
      // Safe evaluation
      const func = new Function('Math', `return ${expression}`);
      return func(Math);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return null;
    }
  }

  /**
   * Replace placeholders in text
   */
  private replacePlaceholders(text: string, data: Record<string, any>): string {
    let result = text;

    // Replace {fieldName} with actual values
    const placeholders = text.match(/\{([^}]+)\}/g) || [];
    for (const placeholder of placeholders) {
      const fieldName = placeholder.slice(1, -1);
      const value = data[fieldName] || '';
      result = result.replace(placeholder, String(value));
    }

    return result;
  }

  /**
   * Log rule execution
   */
  private async logExecution(
    ruleId: string,
    entityName: string,
    recordId: string,
    status: string,
    executionTime: number,
    errorMessage: string | null,
    context: any
  ): Promise<void> {
    await prisma.businessRuleExecution.create({
      data: {
        ruleId,
        entityName,
        recordId,
        status,
        executionTime,
        errorMessage,
        context,
      },
    });
  }

  /**
   * Get rule by ID
   */
  async getRuleById(id: string): Promise<any> {
    return prisma.businessRule.findUnique({
      where: { id },
    });
  }

  /**
   * Update business rule
   */
  async updateRule(
    id: string,
    updates: Partial<BusinessRuleDefinition>
  ): Promise<any> {
    return prisma.businessRule.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        condition: updates.condition as any,
        actions: updates.actions as any,
        priority: updates.priority,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete business rule
   */
  async deleteRule(id: string): Promise<void> {
    await prisma.businessRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(id: string, isActive: boolean): Promise<any> {
    return prisma.businessRule.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Get all rules
   */
  async getAllRules(tenantId?: string): Promise<any[]> {
    return prisma.businessRule.findMany({
      where: {
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: [{ entityName: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get rule execution history
   */
  async getRuleExecutionHistory(
    ruleId: string,
    limit: number = 100
  ): Promise<any[]> {
    return prisma.businessRuleExecution.findMany({
      where: { ruleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(ruleId: string): Promise<any> {
    const executions = await prisma.businessRuleExecution.findMany({
      where: { ruleId },
    });

    const total = executions.length;
    const successful = executions.filter((e) => e.status === 'success').length;
    const failed = executions.filter((e) => e.status === 'failure').length;
    const skipped = executions.filter((e) => e.status === 'skipped').length;

    const avgExecutionTime =
      total > 0
        ? executions.reduce((sum, e) => sum + e.executionTime, 0) / total
        : 0;

    return {
      total,
      successful,
      failed,
      skipped,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
    };
  }

  /**
   * Validate rule definition
   */
  private validateRuleDefinition(definition: BusinessRuleDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Rule name is required');
    }

    if (!definition.entityName || definition.entityName.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.triggerEvent) {
      throw new Error('Trigger event is required');
    }

    const validEvents = [
      'before_create',
      'after_create',
      'before_update',
      'after_update',
      'before_delete',
      'after_delete',
    ];

    if (!validEvents.includes(definition.triggerEvent)) {
      throw new Error(
        `Invalid trigger event. Must be one of: ${validEvents.join(', ')}`
      );
    }

    if (!definition.actions || definition.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    // Validate actions
    definition.actions.forEach((action, index) => {
      if (!action.type) {
        throw new Error(`Action ${index + 1} must have a type`);
      }

      const validActionTypes = [
        'set_field',
        'send_email',
        'send_notification',
        'create_record',
        'update_record',
        'call_webhook',
        'execute_workflow',
      ];

      if (!validActionTypes.includes(action.type)) {
        throw new Error(
          `Invalid action type for action ${index + 1}. Must be one of: ${validActionTypes.join(', ')}`
        );
      }

      if (!action.parameters || Object.keys(action.parameters).length === 0) {
        throw new Error(`Action ${index + 1} must have parameters`);
      }
    });
  }

  /**
   * Test rule with sample data
   */
  async testRule(
    ruleId: string,
    sampleData: Record<string, any>
  ): Promise<{
    success: boolean;
    conditionMet: boolean;
    modifiedData?: Record<string, any>;
    errors?: string[];
  }> {
    const rule = await this.getRuleById(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    try {
      // Evaluate condition
      const conditionMet = rule.condition
        ? this.evaluateCondition(rule.condition as any, sampleData)
        : true;

      if (!conditionMet) {
        return {
          success: true,
          conditionMet: false,
        };
      }

      // Execute actions
      const actionResults = await this.executeActions(
        rule.actions as any,
        sampleData,
        'test',
        rule.entityName
      );

      return {
        success: true,
        conditionMet: true,
        modifiedData: actionResults.modifiedData,
      };
    } catch (error: any) {
      return {
        success: false,
        conditionMet: false,
        errors: [error.message],
      };
    }
  }
}

export const businessRuleService = new BusinessRuleService();
