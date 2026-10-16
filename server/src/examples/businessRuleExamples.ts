/**
 * Business Rule Engine Examples
 * Demonstrates various use cases for the business rule engine
 */

import { businessRuleEngine } from '../services/BusinessRuleEngine';
import {
  BusinessRule,
  RuleStatus,
  RulePriority,
  RuleTriggerType,
  ConditionOperator,
  LogicalOperator,
  ActionType
} from '../types/businessRule.types';

/**
 * Example 1: Automatic Discount Rule
 * Apply 10% discount when order total exceeds $1000
 */
export const automaticDiscountRule: BusinessRule = {
  id: 'rule-001',
  name: 'Automatic Bulk Order Discount',
  description: 'Apply 10% discount for orders over $1000',
  entity: 'Order',
  trigger: {
    type: RuleTriggerType.BEFORE_CREATE
  },
  conditions: {
    field: 'total',
    operator: ConditionOperator.GREATER_THAN,
    value: 1000
  },
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
    },
    {
      type: ActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Bulk discount applied: 10% off',
        type: 'success'
      },
      order: 3
    }
  ],
  priority: RulePriority.MEDIUM,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['discount', 'sales']
  }
};

/**
 * Example 2: Low Stock Alert Rule
 * Send notification when inventory falls below reorder point
 */
export const lowStockAlertRule: BusinessRule = {
  id: 'rule-002',
  name: 'Low Stock Alert',
  description: 'Alert when inventory falls below reorder point',
  entity: 'InventoryItem',
  trigger: {
    type: RuleTriggerType.AFTER_UPDATE
  },
  conditions: {
    logicalOperator: LogicalOperator.AND,
    conditions: [
      {
        field: 'quantity',
        operator: ConditionOperator.LESS_THAN_OR_EQUAL,
        value: 0,
        valueType: 'field',
        value: 'reorderPoint'
      },
      {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'active'
      }
    ]
  },
  actions: [
    {
      type: ActionType.SEND_EMAIL,
      parameters: {
        to: 'inventory@company.com',
        subject: 'Low Stock Alert',
        template: 'low-stock-alert',
        data: {
          productName: '{productName}',
          currentQuantity: '{quantity}',
          reorderPoint: '{reorderPoint}'
        }
      },
      order: 1
    },
    {
      type: ActionType.CREATE_RECORD,
      target: 'PurchaseRequisition',
      parameters: {
        productId: '{productId}',
        quantity: '{reorderQuantity}',
        priority: 'high',
        reason: 'Low stock alert'
      },
      order: 2
    }
  ],
  priority: RulePriority.HIGH,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['inventory', 'alerts']
  }
};

/**
 * Example 3: Credit Limit Validation Rule
 * Prevent order creation if customer exceeds credit limit
 */
export const creditLimitValidationRule: BusinessRule = {
  id: 'rule-003',
  name: 'Credit Limit Validation',
  description: 'Prevent orders that exceed customer credit limit',
  entity: 'Order',
  trigger: {
    type: RuleTriggerType.BEFORE_CREATE
  },
  conditions: {
    logicalOperator: LogicalOperator.AND,
    conditions: [
      {
        field: 'customer.creditLimit',
        operator: ConditionOperator.IS_NOT_NULL
      },
      {
        field: 'total',
        operator: ConditionOperator.GREATER_THAN,
        value: 0,
        valueType: 'formula',
        value: '{customer.creditLimit} - {customer.currentBalance}'
      }
    ]
  },
  actions: [
    {
      type: ActionType.LOG_MESSAGE,
      value: 'Order rejected: Customer credit limit exceeded',
      order: 1,
      stopOnError: true
    },
    {
      type: ActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Order cannot be created: Credit limit exceeded',
        type: 'error',
        userId: '{createdBy}'
      },
      order: 2
    }
  ],
  priority: RulePriority.CRITICAL,
  status: RuleStatus.ACTIVE,
  errorHandling: {
    continueOnError: false,
    notifyOnError: true
  },
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['credit', 'validation', 'finance']
  }
};

/**
 * Example 4: Order Status Workflow Rule
 * Automatically update related records when order status changes
 */
export const orderStatusWorkflowRule: BusinessRule = {
  id: 'rule-004',
  name: 'Order Status Workflow',
  description: 'Update inventory and notify customer when order is shipped',
  entity: 'Order',
  trigger: {
    type: RuleTriggerType.AFTER_UPDATE
  },
  conditions: {
    logicalOperator: LogicalOperator.AND,
    conditions: [
      {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'shipped'
      },
      {
        field: 'oldData.status',
        operator: ConditionOperator.NOT_EQUALS,
        value: 'shipped'
      }
    ]
  },
  actions: [
    {
      type: ActionType.UPDATE_RECORD,
      target: 'InventoryItem',
      parameters: {
        operation: 'decrementQuantity',
        items: '{orderItems}'
      },
      order: 1
    },
    {
      type: ActionType.SEND_EMAIL,
      parameters: {
        to: '{customer.email}',
        subject: 'Your order has been shipped',
        template: 'order-shipped',
        data: {
          orderNumber: '{orderNumber}',
          trackingNumber: '{trackingNumber}'
        }
      },
      order: 2
    },
    {
      type: ActionType.CREATE_RECORD,
      target: 'ActivityLog',
      parameters: {
        entityType: 'Order',
        entityId: '{id}',
        action: 'shipped',
        timestamp: new Date().toISOString()
      },
      order: 3
    }
  ],
  priority: RulePriority.HIGH,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['order', 'workflow', 'inventory']
  }
};

/**
 * Example 5: Complex Pricing Rule
 * Calculate dynamic pricing based on multiple factors
 */
export const dynamicPricingRule: BusinessRule = {
  id: 'rule-005',
  name: 'Dynamic Pricing Calculator',
  description: 'Calculate price based on quantity, customer tier, and season',
  entity: 'OrderItem',
  trigger: {
    type: RuleTriggerType.BEFORE_CREATE
  },
  conditions: {
    field: 'product.dynamicPricing',
    operator: ConditionOperator.EQUALS,
    value: true
  },
  actions: [
    {
      type: ActionType.CUSTOM_FUNCTION,
      target: 'calculateDynamicPrice',
      parameters: {
        basePrice: '{product.basePrice}',
        quantity: '{quantity}',
        customerTier: '{customer.tier}',
        season: '{currentSeason}'
      },
      order: 1
    },
    {
      type: ActionType.SET_FIELD,
      target: 'unitPrice',
      value: '{calculatedPrice}',
      order: 2
    },
    {
      type: ActionType.CALCULATE,
      target: 'lineTotal',
      formula: '{unitPrice} * {quantity}',
      order: 3
    }
  ],
  priority: RulePriority.MEDIUM,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['pricing', 'sales']
  }
};

/**
 * Example 6: Scheduled Maintenance Rule
 * Create maintenance tasks based on equipment usage
 */
export const scheduledMaintenanceRule: BusinessRule = {
  id: 'rule-006',
  name: 'Preventive Maintenance Scheduler',
  description: 'Create maintenance tasks when equipment reaches usage threshold',
  entity: 'Equipment',
  trigger: {
    type: RuleTriggerType.SCHEDULED,
    schedule: '0 0 * * *' // Daily at midnight
  },
  conditions: {
    logicalOperator: LogicalOperator.OR,
    conditions: [
      {
        field: 'operatingHours',
        operator: ConditionOperator.GREATER_THAN_OR_EQUAL,
        value: 0,
        valueType: 'field',
        value: 'maintenanceInterval'
      },
      {
        field: 'daysSinceLastMaintenance',
        operator: ConditionOperator.GREATER_THAN,
        value: 90
      }
    ]
  },
  actions: [
    {
      type: ActionType.CREATE_RECORD,
      target: 'MaintenanceTask',
      parameters: {
        equipmentId: '{id}',
        type: 'preventive',
        priority: 'medium',
        scheduledDate: '{nextMaintenanceDate}',
        description: 'Scheduled preventive maintenance'
      },
      order: 1
    },
    {
      type: ActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Maintenance task created for {equipmentName}',
        type: 'info',
        recipients: '{maintenanceTeam}'
      },
      order: 2
    }
  ],
  priority: RulePriority.MEDIUM,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'system',
    createdAt: new Date(),
    version: 1,
    tags: ['maintenance', 'equipment', 'scheduled']
  }
};

/**
 * Register all example rules
 */
export function registerExampleRules(): void {
  businessRuleEngine.registerRule(automaticDiscountRule);
  businessRuleEngine.registerRule(lowStockAlertRule);
  businessRuleEngine.registerRule(creditLimitValidationRule);
  businessRuleEngine.registerRule(orderStatusWorkflowRule);
  businessRuleEngine.registerRule(dynamicPricingRule);
  businessRuleEngine.registerRule(scheduledMaintenanceRule);

  console.log('Example business rules registered successfully');
}

/**
 * Register custom functions used by rules
 */
export function registerCustomFunctions(): void {
  // Dynamic pricing calculator
  businessRuleEngine.registerCustomFunction(
    'calculateDynamicPrice',
    async (context: any, params: any) => {
      const { basePrice, quantity, customerTier, season } = params;

      let price = basePrice;

      // Volume discount
      if (quantity >= 100) price *= 0.85;
      else if (quantity >= 50) price *= 0.90;
      else if (quantity >= 10) price *= 0.95;

      // Customer tier discount
      const tierDiscounts: Record<string, number> = {
        platinum: 0.85,
        gold: 0.90,
        silver: 0.95,
        bronze: 1.0
      };
      price *= tierDiscounts[customerTier] || 1.0;

      // Seasonal adjustment
      const seasonalMultipliers: Record<string, number> = {
        peak: 1.2,
        high: 1.1,
        normal: 1.0,
        low: 0.9
      };
      price *= seasonalMultipliers[season] || 1.0;

      return Math.round(price * 100) / 100; // Round to 2 decimals
    }
  );

  console.log('Custom functions registered successfully');
}
