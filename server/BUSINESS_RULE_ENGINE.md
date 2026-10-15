# Business Rule Engine Implementation

## Overview

The Business Rule Engine provides a flexible, event-driven system for defining and executing business logic without hardcoding rules into application code. It supports complex conditional logic, multiple action types, and automatic execution based on entity lifecycle events.

## Features

### Core Capabilities

1. **Rule Definition Interface**
   - Declarative rule syntax with JSON/TypeScript
   - Support for complex nested conditions
   - Multiple action types (field updates, calculations, notifications, webhooks)
   - Priority-based execution order
   - Version control and metadata tracking

2. **Event-Driven Execution**
   - Before/After Create, Update, Delete triggers
   - Scheduled execution (cron-based)
   - Manual execution
   - Custom event triggers

3. **Complex Rule Logic**
   - Nested conditions with AND/OR/NOT operators
   - 15+ comparison operators (equals, greater than, contains, regex, etc.)
   - Field references and formula evaluation
   - Custom function support

4. **Action Types**
   - SET_FIELD: Update field values
   - CALCULATE: Evaluate formulas
   - SEND_EMAIL: Send email notifications
   - SEND_NOTIFICATION: In-app notifications
   - CREATE_RECORD: Create related records
   - UPDATE_RECORD: Update related records
   - CALL_WEBHOOK: External API calls
   - EXECUTE_WORKFLOW: Trigger workflows
   - CUSTOM_FUNCTION: Execute custom logic
   - LOG_MESSAGE: Audit logging

## Architecture

### Components

```
BusinessRuleEngine (Service)
├── Rule Registry (Map<string, BusinessRule>)
├── Custom Functions (Map<string, Function>)
├── Condition Evaluator
├── Action Executor
└── Validation Engine

BusinessRuleController (HTTP API)
├── CRUD Operations
├── Rule Execution
└── Validation Endpoints

BusinessRuleMiddleware (Express)
├── Before Create/Update/Delete
└── After Create/Update/Delete
```

### Data Flow

```
Event Trigger → Middleware → Rule Engine → Condition Evaluation → Action Execution → Result
```

## Usage

### 1. Define a Business Rule

```typescript
import {
  BusinessRule,
  RuleStatus,
  RulePriority,
  RuleTriggerType,
  ConditionOperator,
  ActionType
} from './types/businessRule.types';

const discountRule: BusinessRule = {
  id: 'rule-001',
  name: 'Bulk Order Discount',
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
    }
  ],
  priority: RulePriority.MEDIUM,
  status: RuleStatus.ACTIVE,
  metadata: {
    createdBy: 'admin',
    createdAt: new Date(),
    version: 1
  }
};
```

### 2. Register the Rule

```typescript
import { businessRuleEngine } from './services/BusinessRuleEngine';

businessRuleEngine.registerRule(discountRule);
```

### 3. Apply Middleware to Routes

```typescript
import { Router } from 'express';
import { executeBeforeCreate, executeAfterCreate } from './middleware/businessRuleMiddleware';

const router = Router();

router.post('/orders',
  executeBeforeCreate('Order'),
  orderController.create,
  executeAfterCreate('Order')
);
```

### 4. Execute Rules Manually

```typescript
import { RuleExecutionContext, RuleTriggerType } from './types/businessRule.types';

const context: RuleExecutionContext = {
  ruleId: 'rule-001',
  entity: 'Order',
  triggerType: RuleTriggerType.MANUAL,
  data: {
    total: 1500,
    customerId: 'cust-123'
  },
  userId: 'user-456'
};

const result = await businessRuleEngine.executeRule(discountRule, context);
console.log(result);
```

## API Endpoints

### Rule Management

```
POST   /api/business-rules/rules              Create a new rule
GET    /api/business-rules/rules              Get all rules
GET    /api/business-rules/rules/:id          Get specific rule
PUT    /api/business-rules/rules/:id          Update rule
DELETE /api/business-rules/rules/:id          Delete rule
POST   /api/business-rules/rules/validate     Validate rule definition
```

### Rule Execution

```
POST   /api/business-rules/rules/:id/execute  Execute specific rule
POST   /api/business-rules/rules/execute      Execute rules for event
GET    /api/business-rules/rules/entity/:entity  Get rules by entity
```

### Custom Functions

```
POST   /api/business-rules/rules/functions    Register custom function
```

## Examples

### Example 1: Low Stock Alert

```typescript
const lowStockAlert: BusinessRule = {
  id: 'rule-002',
  name: 'Low Stock Alert',
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
        template: 'low-stock-alert'
      },
      order: 1
    },
    {
      type: ActionType.CREATE_RECORD,
      target: 'PurchaseRequisition',
      parameters: {
        productId: '{productId}',
        quantity: '{reorderQuantity}'
      },
      order: 2
    }
  ],
  priority: RulePriority.HIGH,
  status: RuleStatus.ACTIVE
};
```

### Example 2: Credit Limit Validation

```typescript
const creditLimitValidation: BusinessRule = {
  id: 'rule-003',
  name: 'Credit Limit Validation',
  entity: 'Order',
  trigger: {
    type: RuleTriggerType.BEFORE_CREATE
  },
  conditions: {
    field: 'total',
    operator: ConditionOperator.GREATER_THAN,
    valueType: 'formula',
    value: '{customer.creditLimit} - {customer.currentBalance}'
  },
  actions: [
    {
      type: ActionType.LOG_MESSAGE,
      value: 'Order rejected: Credit limit exceeded',
      order: 1,
      stopOnError: true
    }
  ],
  priority: RulePriority.CRITICAL,
  status: RuleStatus.ACTIVE,
  errorHandling: {
    continueOnError: false,
    notifyOnError: true
  }
};
```

### Example 3: Dynamic Pricing

```typescript
// Register custom function
businessRuleEngine.registerCustomFunction(
  'calculateDynamicPrice',
  async (context, params) => {
    const { basePrice, quantity, customerTier } = params;
    let price = basePrice;
    
    // Volume discount
    if (quantity >= 100) price *= 0.85;
    else if (quantity >= 50) price *= 0.90;
    
    // Tier discount
    const tierDiscounts = {
      platinum: 0.85,
      gold: 0.90,
      silver: 0.95
    };
    price *= tierDiscounts[customerTier] || 1.0;
    
    return price;
  }
);

// Use in rule
const dynamicPricing: BusinessRule = {
  id: 'rule-005',
  name: 'Dynamic Pricing',
  entity: 'OrderItem',
  trigger: {
    type: RuleTriggerType.BEFORE_CREATE
  },
  actions: [
    {
      type: ActionType.CUSTOM_FUNCTION,
      target: 'calculateDynamicPrice',
      parameters: {
        basePrice: '{product.basePrice}',
        quantity: '{quantity}',
        customerTier: '{customer.tier}'
      },
      order: 1
    },
    {
      type: ActionType.SET_FIELD,
      target: 'unitPrice',
      value: '{calculatedPrice}',
      order: 2
    }
  ],
  priority: RulePriority.MEDIUM,
  status: RuleStatus.ACTIVE
};
```

## Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `field: 'status', operator: 'equals', value: 'active'` |
| `not_equals` | Not equal | `field: 'status', operator: 'not_equals', value: 'deleted'` |
| `greater_than` | Greater than | `field: 'total', operator: 'greater_than', value: 1000` |
| `greater_than_or_equal` | Greater than or equal | `field: 'quantity', operator: 'greater_than_or_equal', value: 10` |
| `less_than` | Less than | `field: 'stock', operator: 'less_than', value: 5` |
| `less_than_or_equal` | Less than or equal | `field: 'age', operator: 'less_than_or_equal', value: 18` |
| `contains` | String contains | `field: 'email', operator: 'contains', value: '@company.com'` |
| `not_contains` | String doesn't contain | `field: 'name', operator: 'not_contains', value: 'test'` |
| `starts_with` | String starts with | `field: 'code', operator: 'starts_with', value: 'PRD'` |
| `ends_with` | String ends with | `field: 'email', operator: 'ends_with', value: '.com'` |
| `in` | Value in array | `field: 'status', operator: 'in', value: ['active', 'pending']` |
| `not_in` | Value not in array | `field: 'type', operator: 'not_in', value: ['deleted', 'archived']` |
| `is_null` | Field is null | `field: 'deletedAt', operator: 'is_null'` |
| `is_not_null` | Field is not null | `field: 'approvedAt', operator: 'is_not_null'` |
| `matches_regex` | Regex match | `field: 'phone', operator: 'matches_regex', value: '^\\+1'` |
| `between` | Value in range | `field: 'price', operator: 'between', value: [10, 100]` |

## Logical Operators

- **AND**: All conditions must be true
- **OR**: At least one condition must be true
- **NOT**: Negates the condition result

## Formula Syntax

Formulas support field references using `{fieldName}` syntax:

```typescript
// Simple calculation
formula: '{total} * 0.10'

// Multiple fields
formula: '{quantity} * {unitPrice}'

// Nested fields
formula: '{customer.creditLimit} - {customer.currentBalance}'

// Complex expressions
formula: '({basePrice} * {quantity}) * (1 - {discountRate})'
```

## Error Handling

Rules support comprehensive error handling:

```typescript
errorHandling: {
  continueOnError: true,        // Continue executing other actions
  fallbackActions: [            // Execute if errors occur
    {
      type: ActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Rule execution failed',
        type: 'error'
      },
      order: 1
    }
  ],
  notifyOnError: true            // Send error notifications
}
```

## Best Practices

1. **Rule Naming**: Use descriptive names that explain the business logic
2. **Priority**: Set appropriate priorities to control execution order
3. **Error Handling**: Always define error handling for critical rules
4. **Testing**: Test rules in draft mode before activating
5. **Documentation**: Add descriptions and tags for maintainability
6. **Performance**: Avoid complex formulas in high-frequency triggers
7. **Security**: Validate custom functions before registration
8. **Versioning**: Increment version numbers when updating rules

## Performance Considerations

- Rules are executed synchronously for before-* triggers
- After-* triggers execute asynchronously to avoid blocking responses
- Use priority to control execution order
- Consider caching for frequently accessed data
- Limit the number of actions per rule
- Use scheduled rules for batch operations

## Security

- Custom functions should be sandboxed in production
- Validate all rule inputs before execution
- Implement role-based access control for rule management
- Audit all rule executions
- Sanitize formula inputs to prevent injection attacks

## Testing

```typescript
// Test rule validation
const validation = businessRuleEngine.validateRule(myRule);
console.log(validation.valid, validation.errors);

// Test rule execution
const context: RuleExecutionContext = {
  ruleId: 'test-rule',
  entity: 'Order',
  triggerType: RuleTriggerType.MANUAL,
  data: { total: 1500 }
};

const result = await businessRuleEngine.executeRule(myRule, context);
console.log(result.success, result.actionsExecuted);
```

## Integration with Existing Modules

The business rule engine integrates seamlessly with existing ERP modules:

- **Orders**: Automatic discounts, credit validation, status workflows
- **Inventory**: Stock alerts, reorder automation, expiry notifications
- **CRM**: Lead scoring, opportunity workflows, customer segmentation
- **Finance**: Budget validation, approval workflows, payment reminders
- **Manufacturing**: Production scheduling, quality checks, maintenance alerts
- **HR**: Leave approval, performance reviews, onboarding workflows

## Future Enhancements

- Visual rule builder UI
- Rule templates library
- A/B testing for rules
- Machine learning-based rule suggestions
- Rule performance analytics
- Import/export rule definitions
- Rule dependency management
- Sandbox environment for testing

## Support

For questions or issues, refer to:
- API documentation: `/api/docs`
- Example rules: `server/src/examples/businessRuleExamples.ts`
- Type definitions: `server/src/types/businessRule.types.ts`
