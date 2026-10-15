/**
 * Multi-Tenant Platform Types
 * 
 * Defines TypeScript types for the multi-tenant SaaS platform including
 * tenant management, provisioning, and customization.
 */

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled'
}

export enum TenantPlan {
  TRIAL = 'trial',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum IsolationStrategy {
  SHARED = 'shared',      // Shared database with tenantId filtering
  SCHEMA = 'schema',      // Separate schema per tenant
  DATABASE = 'database'   // Separate database per tenant
}

export interface TenantConfiguration {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  branding?: {
    companyName?: string;
    tagline?: string;
    favicon?: string;
  };
  features?: {
    [key: string]: boolean;
  };
  settings?: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
  };
  limits?: {
    maxUsers?: number;
    maxStorage?: number;
    maxApiCalls?: number;
  };
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CreateTenantDTO {
  name: string;
  domain: string;
  slug: string;
  plan: TenantPlan;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  features?: string[];
  configuration?: TenantConfiguration;
  isolationStrategy?: IsolationStrategy;
}

export interface UpdateTenantDTO {
  name?: string;
  domain?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  features?: string[];
  configuration?: TenantConfiguration;
  maxUsers?: number;
  maxStorage?: number;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TenantProvisioningOptions {
  seedData?: boolean;
  createDefaultRoles?: boolean;
  createDefaultWorkflows?: boolean;
  sendWelcomeEmail?: boolean;
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantDomain: string;
  tenantPlan: TenantPlan;
  tenantStatus: TenantStatus;
  tenantFeatures: string[];
  isolationStrategy: IsolationStrategy;
}

export interface CustomFieldDefinition {
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  options?: string[];
  isRequired?: boolean;
  defaultValue?: string;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    [key: string]: any;
  };
  displayOrder?: number;
  helpText?: string;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  entityType: string;
  triggerType: 'on_create' | 'on_update' | 'on_delete' | 'scheduled' | 'manual';
  triggerConditions?: any;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  type: 'email' | 'notification' | 'webhook' | 'update_field' | 'create_record';
  config: {
    [key: string]: any;
  };
}

export interface TenantMetrics {
  totalUsers: number;
  activeUsers: number;
  storageUsed: number;
  storageLimit: number;
  apiCallsToday: number;
  apiCallsLimit: number;
  lastActivityAt: Date;
}

export interface ProvisioningStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}
