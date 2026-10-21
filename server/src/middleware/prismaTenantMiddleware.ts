/**
 * Prisma Tenant Middleware
 * 
 * Automatically adds tenantId filter to all Prisma queries to enforce row-level security.
 * This ensures data isolation between tenants at the database level.
 */

import { Prisma } from '@prisma/client';

// Models that should have tenant isolation
const TENANT_ISOLATED_MODELS = [
  'User',
  'Product',
  'Order',
  'Customer',
  'Lead',
  'Opportunity',
  'Quotation',
  'Warehouse',
  'InventoryBatch',
  'SerialNumber',
  'StockMovement',
  'Account',
  'JournalEntry',
  'Invoice',
  'Employee',
  'Asset',
  'Project',
  'RiskItem'
  // Add more models as needed
];

// Models that should NOT have tenant isolation (global/system models)
const GLOBAL_MODELS = [
  'Tenant',
  'TenantUser',
  'TenantCustomField',
  'TenantWorkflow',
  'TenantWorkflowExecution',
  'TenantProvisioningLog',
  'Role',
  'Permission',
  'RolePermission',
  'AuditLog'
];

/**
 * Create Prisma middleware for tenant isolation
 */
export function createTenantMiddleware(getTenantId: () => string | null) {
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    const tenantId = getTenantId();

    // Skip if no tenant context (e.g., system operations)
    if (!tenantId) {
      return next(params);
    }

    // Skip if model is global
    if (GLOBAL_MODELS.includes(params.model || '')) {
      return next(params);
    }

    // Skip if model doesn't support tenant isolation
    if (!TENANT_ISOLATED_MODELS.includes(params.model || '')) {
      return next(params);
    }

    // Add tenantId filter for read operations
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
    }

    if (params.action === 'findMany') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      
      // Preserve existing where conditions
      if (params.args.where.AND) {
        params.args.where.AND = Array.isArray(params.args.where.AND)
          ? [...params.args.where.AND, { tenantId }]
          : [params.args.where.AND, { tenantId }];
      } else {
        params.args.where.tenantId = tenantId;
      }
    }

    // Add tenantId for write operations
    if (params.action === 'create') {
      params.args = params.args || {};
      params.args.data = params.args.data || {};
      params.args.data.tenantId = tenantId;
    }

    if (params.action === 'createMany') {
      params.args = params.args || {};
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => ({
          ...item,
          tenantId
        }));
      }
    }

    // Add tenantId filter for update operations
    if (params.action === 'update' || params.action === 'updateMany') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
    }

    // Add tenantId filter for delete operations
    if (params.action === 'delete' || params.action === 'deleteMany') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
    }

    // Add tenantId filter for count operations
    if (params.action === 'count') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
    }

    // Add tenantId filter for aggregate operations
    if (params.action === 'aggregate' || params.action === 'groupBy') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
    }

    return next(params);
  };
}

/**
 * Bypass tenant isolation for system operations
 * Use with caution - only for admin/system operations
 */
export function withoutTenantIsolation<T>(operation: () => Promise<T>): Promise<T> {
  // This would require a context manager to temporarily disable tenant filtering
  // For now, operations that need to bypass tenant isolation should use a separate Prisma client
  return operation();
}
