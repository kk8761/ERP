/**
 * Business Rule Engine Tests
 * Unit tests for the business rule engine
 */

import { businessRuleEngine } from '../services/BusinessRuleEngine';
import {
  BusinessRule,
  RuleStatus,
  RulePriority,
  RuleTriggerType,
  ConditionOperator,
  LogicalOperator,
  ActionType,
  RuleExecutionContext
} from '../types/businessRule.types';

describe('BusinessRuleEngine', () => {
  beforeEach(() => {
    // Clear all rules before each test
    const allRules = businessRuleEngine.getAllRules();
    allRules.forEach(rule => businessRuleEngine.unregisterRule(rule.id));
  });

  describe('Rule Registration', () => {
    it('should register a valid rule', () => {
      const rule: BusinessRule = {
        id: 'test-rule-001',
        name: 'Test Rule',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.SET_FIELD,
            target: 'status',
            value: 'pending',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);
      const rules = businessRuleEngine.getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test-rule-001');
    });

    it('should reject invalid rule without actions', () => {
      const rule: BusinessRule = {
        id: 'invalid-rule',
        name: 'Invalid Rule',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      expect(() => businessRuleEngine.registerRule(rule)).toThrow();
    });
  });

  describe('Rule Validation', () => {
    it('should validate a correct rule', () => {
      const rule: BusinessRule = {
        id: 'valid-rule',
        name: 'Valid Rule',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.SET_FIELD,
            target: 'status',
            value: 'pending',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      const validation = businessRuleEngine.validateRule(rule);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const rule: any = {
        name: 'Incomplete Rule',
        trigger: { type: RuleTriggerType.BEFORE_CREATE }
      };

      const validation = businessRuleEngine.validateRule(rule);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate simple equals condition', async () => {
      const rule: BusinessRule = {
        id: 'equals-test',
        name: 'Equals Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        conditions: {
          field: 'status',
          operator: ConditionOperator.EQUALS,
          value: 'pending'
        },
        actions: [
          {
            type: ActionType.LOG_MESSAGE,
            value: 'Status is pending',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'equals-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { status: 'pending' }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(true);
      expect(result.conditionsMet).toBe(true);
      expect(result.actionsExecuted).toBe(1);
    });

    it('should evaluate greater than condition', async () => {
      const rule: BusinessRule = {
        id: 'gt-test',
        name: 'Greater Than Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        conditions: {
          field: 'total',
          operator: ConditionOperator.GREATER_THAN,
          value: 1000
        },
        actions: [
          {
            type: ActionType.LOG_MESSAGE,
            value: 'Large order',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'gt-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { total: 1500 }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.conditionsMet).toBe(true);
    });

    it('should evaluate AND conditions', async () => {
      const rule: BusinessRule = {
        id: 'and-test',
        name: 'AND Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        conditions: {
          logicalOperator: LogicalOperator.AND,
          conditions: [
            {
              field: 'total',
              operator: ConditionOperator.GREATER_THAN,
              value: 1000
            },
            {
              field: 'status',
              operator: ConditionOperator.EQUALS,
              value: 'pending'
            }
          ]
        },
        actions: [
          {
            type: ActionType.LOG_MESSAGE,
            value: 'Large pending order',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'and-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { total: 1500, status: 'pending' }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.conditionsMet).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should execute SET_FIELD action', async () => {
      const rule: BusinessRule = {
        id: 'set-field-test',
        name: 'Set Field Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.SET_FIELD,
            target: 'status',
            value: 'approved',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'set-field-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { status: 'pending' }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(true);
      expect(result.modifiedData).toHaveProperty('status', 'approved');
    });

    it('should execute CALCULATE action', async () => {
      const rule: BusinessRule = {
        id: 'calculate-test',
        name: 'Calculate Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.CALCULATE,
            target: 'discount',
            formula: '{total} * 0.10',
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'calculate-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { total: 1000 }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(true);
      expect(result.modifiedData).toHaveProperty('discount', 100);
    });

    it('should execute multiple actions in order', async () => {
      const rule: BusinessRule = {
        id: 'multi-action-test',
        name: 'Multi Action Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.CALCULATE,
            target: 'discount',
            formula: '{total} * 0.10',
            order: 1
          },
          {
            type: ActionType.CALCULATE,
            target: 'finalTotal',
            formula: '{total} - {discount}',
            order: 2
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'multi-action-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: { total: 1000 }
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(2);
      expect(result.modifiedData).toHaveProperty('discount', 100);
      expect(result.modifiedData).toHaveProperty('finalTotal', 900);
    });
  });

  describe('Custom Functions', () => {
    it('should register and execute custom function', async () => {
      // Register custom function
      businessRuleEngine.registerCustomFunction(
        'testFunction',
        async (context: any, params: any) => {
          return params.value * 2;
        }
      );

      const rule: BusinessRule = {
        id: 'custom-fn-test',
        name: 'Custom Function Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.CUSTOM_FUNCTION,
            target: 'testFunction',
            parameters: { value: 10 },
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'custom-fn-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: {}
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(true);
      expect(result.actionResults[0].result).toBe(20);
    });
  });

  describe('Rule Priority', () => {
    it('should execute rules in priority order', async () => {
      const lowPriorityRule: BusinessRule = {
        id: 'low-priority',
        name: 'Low Priority',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.LOG_MESSAGE,
            value: 'Low priority',
            order: 1
          }
        ],
        priority: RulePriority.LOW,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      const highPriorityRule: BusinessRule = {
        id: 'high-priority',
        name: 'High Priority',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.LOG_MESSAGE,
            value: 'High priority',
            order: 1
          }
        ],
        priority: RulePriority.HIGH,
        status: RuleStatus.ACTIVE,
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(lowPriorityRule);
      businessRuleEngine.registerRule(highPriorityRule);

      const rules = businessRuleEngine.getRulesByTrigger('Order', RuleTriggerType.BEFORE_CREATE);
      expect(rules[0].id).toBe('high-priority');
      expect(rules[1].id).toBe('low-priority');
    });
  });

  describe('Error Handling', () => {
    it('should handle action errors gracefully', async () => {
      const rule: BusinessRule = {
        id: 'error-test',
        name: 'Error Test',
        entity: 'Order',
        trigger: { type: RuleTriggerType.BEFORE_CREATE },
        actions: [
          {
            type: ActionType.CALCULATE,
            target: 'result',
            formula: '{nonexistent} * 2', // This will cause an error
            order: 1
          }
        ],
        priority: RulePriority.MEDIUM,
        status: RuleStatus.ACTIVE,
        errorHandling: {
          continueOnError: true,
          notifyOnError: false
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: 1
        }
      };

      businessRuleEngine.registerRule(rule);

      const context: RuleExecutionContext = {
        ruleId: 'error-test',
        entity: 'Order',
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: {}
      };

      const result = await businessRuleEngine.executeRule(rule, context);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
