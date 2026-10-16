/**
 * Business Rule Engine Type Definitions
 * Supports complex rule logic with conditions, actions, and event-driven execution
 */

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

export enum RulePriority {
  LOW = 1,
  MEDIUM = 5,
  HIGH = 10,
  CRITICAL = 20
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  MATCHES_REGEX = 'matches_regex',
  BETWEEN = 'between'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export enum ActionType {
  SET_FIELD = 'set_field',
  CALCULATE = 'calculate',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_RECORD = 'create_record',
  UPDATE_RECORD = 'update_record',
  DELETE_RECORD = 'delete_record',
  CALL_WEBHOOK = 'call_webhook',
  EXECUTE_WORKFLOW = 'execute_workflow',
  TRIGGER_EVENT = 'trigger_event',
  LOG_MESSAGE = 'log_message',
  CUSTOM_FUNCTION = 'custom_function'
}

export enum RuleTriggerType {
  BEFORE_CREATE = 'before_create',
  AFTER_CREATE = 'after_create',
  BEFORE_UPDATE = 'before_update',
  AFTER_UPDATE = 'after_update',
  BEFORE_DELETE = 'before_delete',
  AFTER_DELETE = 'after_delete',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  EVENT = 'event'
}

export interface RuleCondition {
  id?: string;
  field: string;
  operator: ConditionOperator;
  value?: any;
  valueType?: 'static' | 'field' | 'formula' | 'function';
  logicalOperator?: LogicalOperator;
  conditions?: RuleCondition[]; // For nested conditions
}

export interface RuleAction {
  id?: string;
  type: ActionType;
  target?: string; // Field name or entity
  value?: any;
  formula?: string;
  parameters?: Record<string, any>;
  order: number;
  stopOnError?: boolean;
}

export interface RuleTrigger {
  type: RuleTriggerType;
  entity?: string; // Entity/table name
  events?: string[]; // Custom event names
  schedule?: string; // Cron expression for scheduled rules
  conditions?: RuleCondition; // Additional trigger conditions
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  entity: string; // Primary entity this rule applies to
  trigger: RuleTrigger;
  conditions?: RuleCondition;
  actions: RuleAction[];
  priority: RulePriority;
  status: RuleStatus;
  errorHandling?: {
    continueOnError: boolean;
    fallbackActions?: RuleAction[];
    notifyOnError?: boolean;
  };
  metadata?: {
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt?: Date;
    version: number;
    tags?: string[];
  };
  tenantId?: string;
}

export interface RuleExecutionContext {
  ruleId: string;
  entity: string;
  recordId?: string;
  triggerType: RuleTriggerType;
  data: Record<string, any>; // Current record data
  oldData?: Record<string, any>; // Previous record data (for updates)
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  success: boolean;
  executedAt: Date;
  duration: number; // milliseconds
  conditionsMet: boolean;
  actionsExecuted: number;
  actionResults: ActionExecutionResult[];
  errors?: RuleExecutionError[];
  modifiedData?: Record<string, any>;
}

export interface ActionExecutionResult {
  actionId?: string;
  actionType: ActionType;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export interface RuleExecutionError {
  stage: 'condition' | 'action' | 'validation';
  actionId?: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  executionContext: RuleExecutionContext;
  result: RuleExecutionResult;
  createdAt: Date;
}
