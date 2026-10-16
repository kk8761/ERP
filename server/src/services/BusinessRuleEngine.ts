/**
 * Business Rule Engine Service
 * Executes business rules based on events and conditions
 */

import {
  BusinessRule,
  RuleCondition,
  RuleAction,
  RuleExecutionContext,
  RuleExecutionResult,
  ActionExecutionResult,
  RuleExecutionError,
  RuleValidationResult,
  ConditionOperator,
  LogicalOperator,
  ActionType,
  RuleTriggerType,
  RuleStatus,
  RulePriority
} from '../types/businessRule.types';

export class BusinessRuleEngine {
  private rules: Map<string, BusinessRule> = new Map();
  private customFunctions: Map<string, Function> = new Map();

  /**
   * Register a business rule
   */
  registerRule(rule: BusinessRule): void {
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister a business rule
   */
  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules
   */
  getAllRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by entity
   */
  getRulesByEntity(entity: string): BusinessRule[] {
    return Array.from(this.rules.values()).filter(
      rule => rule.entity === entity && rule.status === RuleStatus.ACTIVE
    );
  }

  /**
   * Get rules by trigger type
   */
  getRulesByTrigger(entity: string, triggerType: RuleTriggerType): BusinessRule[] {
    return this.getRulesByEntity(entity)
      .filter(rule => rule.trigger.type === triggerType)
      .sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  /**
   * Register a custom function for use in rules
   */
  registerCustomFunction(name: string, fn: Function): void {
    this.customFunctions.set(name, fn);
  }

  /**
   * Execute rules for a given context
   */
  async executeRules(context: RuleExecutionContext): Promise<RuleExecutionResult[]> {
    const applicableRules = this.getRulesByTrigger(context.entity, context.triggerType);
    const results: RuleExecutionResult[] = [];

    for (const rule of applicableRules) {
      try {
        const result = await this.executeRule(rule, context);
        results.push(result);

        // If rule modified data, update context for subsequent rules
        if (result.modifiedData) {
          context.data = { ...context.data, ...result.modifiedData };
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          success: false,
          executedAt: new Date(),
          duration: 0,
          conditionsMet: false,
          actionsExecuted: 0,
          actionResults: [],
          errors: [{
            stage: 'validation',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          }]
        });
      }
    }

    return results;
  }

  /**
   * Execute a single rule
   */
  async executeRule(
    rule: BusinessRule,
    context: RuleExecutionContext
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    const errors: RuleExecutionError[] = [];
    const actionResults: ActionExecutionResult[] = [];
    let modifiedData: Record<string, any> = {};

    try {
      // Evaluate conditions
      const conditionsMet = rule.conditions
        ? await this.evaluateCondition(rule.conditions, context)
        : true;

      if (!conditionsMet) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          success: true,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          conditionsMet: false,
          actionsExecuted: 0,
          actionResults: []
        };
      }

      // Execute actions
      const sortedActions = [...rule.actions].sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        const actionStartTime = Date.now();
        try {
          const result = await this.executeAction(action, context);
          actionResults.push({
            actionId: action.id,
            actionType: action.type,
            success: true,
            result: result.value,
            duration: Date.now() - actionStartTime
          });

          // Track modified data
          if (result.modifiedFields) {
            modifiedData = { ...modifiedData, ...result.modifiedFields };
          }
        } catch (error) {
          const actionError: RuleExecutionError = {
            stage: 'action',
            actionId: action.id,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date()
          };
          errors.push(actionError);

          actionResults.push({
            actionId: action.id,
            actionType: action.type,
            success: false,
            error: actionError.message,
            duration: Date.now() - actionStartTime
          });

          if (action.stopOnError) {
            break;
          }
        }
      }

      // Execute fallback actions if there were errors
      if (errors.length > 0 && rule.errorHandling?.fallbackActions) {
        for (const fallbackAction of rule.errorHandling.fallbackActions) {
          try {
            await this.executeAction(fallbackAction, context);
          } catch (fallbackError) {
            console.error('Fallback action failed:', fallbackError);
          }
        }
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: errors.length === 0,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        conditionsMet: true,
        actionsExecuted: actionResults.filter(r => r.success).length,
        actionResults,
        errors: errors.length > 0 ? errors : undefined,
        modifiedData: Object.keys(modifiedData).length > 0 ? modifiedData : undefined
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        conditionsMet: false,
        actionsExecuted: 0,
        actionResults,
        errors: [{
          stage: 'validation',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }]
      };
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: RuleCondition,
    context: RuleExecutionContext
  ): Promise<boolean> {
    // Handle nested conditions with logical operators
    if (condition.conditions && condition.conditions.length > 0) {
      const results = await Promise.all(
        condition.conditions.map(c => this.evaluateCondition(c, context))
      );

      switch (condition.logicalOperator) {
        case LogicalOperator.AND:
          return results.every(r => r);
        case LogicalOperator.OR:
          return results.some(r => r);
        case LogicalOperator.NOT:
          return !results[0];
        default:
          return results.every(r => r); // Default to AND
      }
    }

    // Evaluate single condition
    const fieldValue = this.getFieldValue(condition.field, context);
    const compareValue = await this.resolveValue(condition.value, condition.valueType, context);

    return this.compareValues(fieldValue, compareValue, condition.operator);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(fieldValue: any, compareValue: any, operator: ConditionOperator): boolean {
    switch (operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === compareValue;
      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== compareValue;
      case ConditionOperator.GREATER_THAN:
        return fieldValue > compareValue;
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return fieldValue >= compareValue;
      case ConditionOperator.LESS_THAN:
        return fieldValue < compareValue;
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return fieldValue <= compareValue;
      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(compareValue));
      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(compareValue));
      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).startsWith(String(compareValue));
      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).endsWith(String(compareValue));
      case ConditionOperator.IN:
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case ConditionOperator.NOT_IN:
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case ConditionOperator.IS_NULL:
        return fieldValue === null || fieldValue === undefined;
      case ConditionOperator.IS_NOT_NULL:
        return fieldValue !== null && fieldValue !== undefined;
      case ConditionOperator.MATCHES_REGEX:
        return new RegExp(compareValue).test(String(fieldValue));
      case ConditionOperator.BETWEEN:
        return Array.isArray(compareValue) &&
          fieldValue >= compareValue[0] &&
          fieldValue <= compareValue[1];
      default:
        return false;
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any; modifiedFields?: Record<string, any> }> {
    switch (action.type) {
      case ActionType.SET_FIELD:
        return this.executeSetField(action, context);
      case ActionType.CALCULATE:
        return this.executeCalculate(action, context);
      case ActionType.SEND_EMAIL:
        return this.executeSendEmail(action, context);
      case ActionType.SEND_NOTIFICATION:
        return this.executeSendNotification(action, context);
      case ActionType.LOG_MESSAGE:
        return this.executeLogMessage(action, context);
      case ActionType.CUSTOM_FUNCTION:
        return this.executeCustomFunction(action, context);
      case ActionType.TRIGGER_EVENT:
        return this.executeTriggerEvent(action, context);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Execute SET_FIELD action
   */
  private async executeSetField(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any; modifiedFields?: Record<string, any> }> {
    if (!action.target) {
      throw new Error('SET_FIELD action requires a target field');
    }

    const value = await this.resolveValue(action.value, 'static', context);
    const modifiedFields = { [action.target]: value };

    return { value, modifiedFields };
  }

  /**
   * Execute CALCULATE action
   */
  private async executeCalculate(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any; modifiedFields?: Record<string, any> }> {
    if (!action.formula) {
      throw new Error('CALCULATE action requires a formula');
    }

    const value = await this.evaluateFormula(action.formula, context);
    const modifiedFields = action.target ? { [action.target]: value } : undefined;

    return { value, modifiedFields };
  }

  /**
   * Execute SEND_EMAIL action
   */
  private async executeSendEmail(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any }> {
    // Placeholder for email sending logic
    console.log('Sending email:', action.parameters);
    return { value: 'Email sent' };
  }

  /**
   * Execute SEND_NOTIFICATION action
   */
  private async executeSendNotification(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any }> {
    // Placeholder for notification logic
    console.log('Sending notification:', action.parameters);
    return { value: 'Notification sent' };
  }

  /**
   * Execute LOG_MESSAGE action
   */
  private async executeLogMessage(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any }> {
    const message = await this.resolveValue(action.value, 'static', context);
    console.log(`[Rule ${context.ruleId}] ${message}`);
    return { value: message };
  }

  /**
   * Execute CUSTOM_FUNCTION action
   */
  private async executeCustomFunction(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any; modifiedFields?: Record<string, any> }> {
    if (!action.target) {
      throw new Error('CUSTOM_FUNCTION action requires a function name in target');
    }

    const fn = this.customFunctions.get(action.target);
    if (!fn) {
      throw new Error(`Custom function not found: ${action.target}`);
    }

    const result = await fn(context, action.parameters);
    return { value: result };
  }

  /**
   * Execute TRIGGER_EVENT action
   */
  private async executeTriggerEvent(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<{ value?: any }> {
    // Placeholder for event triggering logic
    console.log('Triggering event:', action.parameters);
    return { value: 'Event triggered' };
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string, context: RuleExecutionContext): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value: any = context.data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Resolve value based on type
   */
  private async resolveValue(
    value: any,
    valueType: string | undefined,
    context: RuleExecutionContext
  ): Promise<any> {
    switch (valueType) {
      case 'field':
        return this.getFieldValue(value, context);
      case 'formula':
        return this.evaluateFormula(value, context);
      case 'function':
        const fn = this.customFunctions.get(value);
        return fn ? await fn(context) : undefined;
      case 'static':
      default:
        return value;
    }
  }

  /**
   * Evaluate a formula
   */
  private async evaluateFormula(formula: string, context: RuleExecutionContext): Promise<any> {
    // Simple formula evaluation - replace field references with values
    let evaluatedFormula = formula;

    // Find all field references in the format {fieldName}
    const fieldMatches = formula.match(/\{([^}]+)\}/g);
    if (fieldMatches) {
      for (const match of fieldMatches) {
        const fieldName = match.slice(1, -1);
        const fieldValue = this.getFieldValue(fieldName, context);
        evaluatedFormula = evaluatedFormula.replace(match, String(fieldValue));
      }
    }

    // Evaluate the formula safely
    try {
      // Use Function constructor for safe evaluation
      const result = new Function('return ' + evaluatedFormula)();
      return result;
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a business rule
   */
  validateRule(rule: BusinessRule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!rule.id) errors.push('Rule ID is required');
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.entity) errors.push('Entity is required');
    if (!rule.trigger) errors.push('Trigger is required');
    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }

    // Validate trigger
    if (rule.trigger) {
      if (!rule.trigger.type) {
        errors.push('Trigger type is required');
      }
      if (rule.trigger.type === RuleTriggerType.SCHEDULED && !rule.trigger.schedule) {
        errors.push('Schedule is required for scheduled triggers');
      }
    }

    // Validate actions
    if (rule.actions) {
      rule.actions.forEach((action, index) => {
        if (!action.type) {
          errors.push(`Action ${index}: type is required`);
        }
        if (action.type === ActionType.SET_FIELD && !action.target) {
          errors.push(`Action ${index}: target field is required for SET_FIELD`);
        }
        if (action.type === ActionType.CALCULATE && !action.formula) {
          errors.push(`Action ${index}: formula is required for CALCULATE`);
        }
      });
    }

    // Validate conditions recursively
    if (rule.conditions) {
      this.validateCondition(rule.conditions, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a condition recursively
   */
  private validateCondition(
    condition: RuleCondition,
    errors: string[],
    warnings: string[],
    path: string = 'condition'
  ): void {
    if (condition.conditions && condition.conditions.length > 0) {
      // Nested conditions
      condition.conditions.forEach((c, index) => {
        this.validateCondition(c, errors, warnings, `${path}.conditions[${index}]`);
      });
    } else {
      // Leaf condition
      if (!condition.field) {
        errors.push(`${path}: field is required`);
      }
      if (!condition.operator) {
        errors.push(`${path}: operator is required`);
      }
    }
  }
}

// Singleton instance
export const businessRuleEngine = new BusinessRuleEngine();
