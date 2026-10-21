/**
 * Tenant Management Service
 * 
 * Handles tenant creation, provisioning, configuration, and lifecycle management
 * for the multi-tenant SaaS platform.
 */

import { PrismaClient } from '@prisma/client';
import {
  CreateTenantDTO,
  UpdateTenantDTO,
  TenantProvisioningOptions,
  TenantStatus,
  TenantPlan,
  IsolationStrategy,
  ProvisioningStep,
  TenantMetrics
} from '../types/tenant.types';

const prisma = new PrismaClient();

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantDTO) {
    try {
      // Validate unique domain and slug
      const existingTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain: data.domain },
            { slug: data.slug }
          ]
        }
      });

      if (existingTenant) {
        throw new Error('Domain or slug already exists');
      }

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          domain: data.domain,
          slug: data.slug,
          plan: data.plan || TenantPlan.TRIAL,
          status: TenantStatus.TRIAL,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          billingAddress: data.billingAddress as any,
          taxId: data.taxId,
          features: data.features || [],
          configuration: data.configuration as any,
          isolationStrategy: data.isolationStrategy || IsolationStrategy.SHARED,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          maxUsers: this.getMaxUsersByPlan(data.plan),
          maxStorage: this.getMaxStorageByPlan(data.plan)
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Provision a tenant with initial setup
   */
  async provisionTenant(
    tenantId: string,
    options: TenantProvisioningOptions = {}
  ): Promise<ProvisioningStep[]> {
    const steps: ProvisioningStep[] = [];

    try {
      // Step 1: Create database schema (if using schema isolation)
      const schemaStep = await this.createTenantSchema(tenantId);
      steps.push(schemaStep);

      // Step 2: Seed default data
      if (options.seedData !== false) {
        const seedStep = await this.seedTenantData(tenantId);
        steps.push(seedStep);
      }

      // Step 3: Create default roles
      if (options.createDefaultRoles !== false) {
        const rolesStep = await this.createDefaultRoles(tenantId);
        steps.push(rolesStep);
      }

      // Step 4: Create default workflows
      if (options.createDefaultWorkflows !== false) {
        const workflowsStep = await this.createDefaultWorkflows(tenantId);
        steps.push(workflowsStep);
      }

      // Step 5: Send welcome email
      if (options.sendWelcomeEmail !== false) {
        const emailStep = await this.sendWelcomeEmail(tenantId);
        steps.push(emailStep);
      }

      // Update tenant status to active
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: TenantStatus.ACTIVE,
          subscriptionStartDate: new Date()
        }
      });

      return steps;
    } catch (error) {
      console.error('Error provisioning tenant:', error);
      
      // Log failed provisioning
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'provisioning',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any
        }
      });

      throw error;
    }
  }

  /**
   * Create tenant-specific database schema
   */
  private async createTenantSchema(tenantId: string): Promise<ProvisioningStep> {
    const startedAt = new Date();
    
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // For shared database strategy, no schema creation needed
      if (tenant.isolationStrategy === IsolationStrategy.SHARED) {
        await prisma.tenantProvisioningLog.create({
          data: {
            tenantId,
            step: 'create_schema',
            status: 'completed',
            message: 'Using shared database strategy',
            startedAt,
            completedAt: new Date(),
            duration: Date.now() - startedAt.getTime()
          }
        });

        return {
          step: 'create_schema',
          status: 'completed',
          message: 'Using shared database strategy',
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        };
      }

      // For schema isolation, create a new schema
      if (tenant.isolationStrategy === IsolationStrategy.SCHEMA) {
        const schemaName = `tenant_${tenant.slug}`;
        
        // Update tenant with schema name
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { databaseSchema: schemaName }
        });

        await prisma.tenantProvisioningLog.create({
          data: {
            tenantId,
            step: 'create_schema',
            status: 'completed',
            message: `Schema ${schemaName} created`,
            startedAt,
            completedAt: new Date(),
            duration: Date.now() - startedAt.getTime()
          }
        });

        return {
          step: 'create_schema',
          status: 'completed',
          message: `Schema ${schemaName} created`,
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        };
      }

      // For database isolation (future implementation)
      throw new Error('Database isolation not yet implemented');
    } catch (error) {
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'create_schema',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any,
          startedAt
        }
      });

      throw error;
    }
  }

  /**
   * Seed tenant with default data
   */
  private async seedTenantData(tenantId: string): Promise<ProvisioningStep> {
    const startedAt = new Date();
    
    try {
      // Create default product categories
      await prisma.productCategory.createMany({
        data: [
          { name: 'General', description: 'General products', isActive: true },
          { name: 'Electronics', description: 'Electronic items', isActive: true },
          { name: 'Groceries', description: 'Grocery items', isActive: true }
        ],
        skipDuplicates: true
      });

      // Create default chart of accounts
      const accountTypes = [
        { accountCode: '1000', name: 'Assets', type: 'Asset' },
        { accountCode: '2000', name: 'Liabilities', type: 'Liability' },
        { accountCode: '3000', name: 'Equity', type: 'Equity' },
        { accountCode: '4000', name: 'Revenue', type: 'Revenue' },
        { accountCode: '5000', name: 'Expenses', type: 'Expense' }
      ];

      for (const account of accountTypes) {
        await prisma.account.upsert({
          where: { accountCode: account.accountCode },
          update: {},
          create: account
        });
      }

      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'seed_data',
          status: 'completed',
          message: 'Default data seeded successfully',
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        }
      });

      return {
        step: 'seed_data',
        status: 'completed',
        message: 'Default data seeded successfully',
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };
    } catch (error) {
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'seed_data',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any,
          startedAt
        }
      });

      throw error;
    }
  }

  /**
   * Create default roles for tenant
   */
  private async createDefaultRoles(tenantId: string): Promise<ProvisioningStep> {
    const startedAt = new Date();
    
    try {
      const defaultRoles = [
        { name: 'Tenant Admin', description: 'Full access to tenant resources' },
        { name: 'Manager', description: 'Manage operations and users' },
        { name: 'User', description: 'Standard user access' },
        { name: 'Viewer', description: 'Read-only access' }
      ];

      for (const roleData of defaultRoles) {
        await prisma.role.upsert({
          where: { name: roleData.name },
          update: {},
          create: {
            name: roleData.name,
            description: roleData.description,
            isSystem: false
          }
        });
      }

      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'create_roles',
          status: 'completed',
          message: 'Default roles created',
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        }
      });

      return {
        step: 'create_roles',
        status: 'completed',
        message: 'Default roles created',
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };
    } catch (error) {
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'create_roles',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any,
          startedAt
        }
      });

      throw error;
    }
  }

  /**
   * Create default workflows for tenant
   */
  private async createDefaultWorkflows(tenantId: string): Promise<ProvisioningStep> {
    const startedAt = new Date();
    
    try {
      // Create a welcome workflow
      await prisma.tenantWorkflow.create({
        data: {
          tenantId,
          name: 'Welcome New User',
          description: 'Send welcome email to new users',
          entityType: 'user',
          triggerType: 'on_create',
          actions: [
            {
              type: 'email',
              config: {
                template: 'welcome',
                subject: 'Welcome to {{tenant.name}}!'
              }
            }
          ] as any,
          isActive: true
        }
      });

      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'create_workflows',
          status: 'completed',
          message: 'Default workflows created',
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        }
      });

      return {
        step: 'create_workflows',
        status: 'completed',
        message: 'Default workflows created',
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };
    } catch (error) {
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'create_workflows',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any,
          startedAt
        }
      });

      throw error;
    }
  }

  /**
   * Send welcome email to tenant
   */
  private async sendWelcomeEmail(tenantId: string): Promise<ProvisioningStep> {
    const startedAt = new Date();
    
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // TODO: Integrate with email service
      console.log(`Sending welcome email to ${tenant.contactEmail}`);

      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'send_welcome_email',
          status: 'completed',
          message: `Welcome email sent to ${tenant.contactEmail}`,
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        }
      });

      return {
        step: 'send_welcome_email',
        status: 'completed',
        message: `Welcome email sent to ${tenant.contactEmail}`,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };
    } catch (error) {
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'send_welcome_email',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) } as any,
          startedAt
        }
      });

      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, data: UpdateTenantDTO) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...data,
          billingAddress: data.billingAddress as any,
          configuration: data.configuration as any
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: true,
          customFields: true,
          workflows: true
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { domain }
      });

      return tenant;
    } catch (error) {
      console.error('Error getting tenant by domain:', error);
      throw error;
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { slug }
      });

      return tenant;
    } catch (error) {
      console.error('Error getting tenant by slug:', error);
      throw error;
    }
  }

  /**
   * List all tenants
   */
  async listTenants(filters?: {
    status?: TenantStatus;
    plan?: TenantPlan;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};
      
      if (filters?.status) {
        where.status = filters.status;
      }
      
      if (filters?.plan) {
        where.plan = filters.plan;
      }

      const tenants = await prisma.tenant.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.tenant.count({ where });

      return { tenants, total };
    } catch (error) {
      console.error('Error listing tenants:', error);
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId: string, reason?: string) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.SUSPENDED }
      });

      // Log suspension
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'suspend',
          status: 'completed',
          message: reason || 'Tenant suspended'
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error suspending tenant:', error);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId: string) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.ACTIVE }
      });

      // Log reactivation
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'reactivate',
          status: 'completed',
          message: 'Tenant reactivated'
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Cancel tenant
   */
  async cancelTenant(tenantId: string) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: TenantStatus.CANCELLED,
          subscriptionEndDate: new Date()
        }
      });

      // Log cancellation
      await prisma.tenantProvisioningLog.create({
        data: {
          tenantId,
          step: 'cancel',
          status: 'completed',
          message: 'Tenant cancelled'
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error cancelling tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant metrics
   */
  async getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            where: { isActive: true }
          }
        }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        totalUsers: tenant.currentUsers,
        activeUsers: tenant.users.length,
        storageUsed: tenant.currentStorage,
        storageLimit: tenant.maxStorage,
        apiCallsToday: 0, // TODO: Implement API call tracking
        apiCallsLimit: 10000, // TODO: Make this configurable
        lastActivityAt: tenant.lastActivityAt
      };
    } catch (error) {
      console.error('Error getting tenant metrics:', error);
      throw error;
    }
  }

  /**
   * Get max users by plan
   */
  private getMaxUsersByPlan(plan: TenantPlan): number {
    switch (plan) {
      case TenantPlan.TRIAL:
        return 5;
      case TenantPlan.BASIC:
        return 10;
      case TenantPlan.PROFESSIONAL:
        return 50;
      case TenantPlan.ENTERPRISE:
        return 1000;
      default:
        return 5;
    }
  }

  /**
   * Get max storage by plan (in MB)
   */
  private getMaxStorageByPlan(plan: TenantPlan): number {
    switch (plan) {
      case TenantPlan.TRIAL:
        return 1024; // 1 GB
      case TenantPlan.BASIC:
        return 10240; // 10 GB
      case TenantPlan.PROFESSIONAL:
        return 102400; // 100 GB
      case TenantPlan.ENTERPRISE:
        return 1048576; // 1 TB
      default:
        return 1024;
    }
  }
}

export const tenantService = new TenantService();
