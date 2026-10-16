# Task 36: Multi-Tenant Platform - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the multi-tenant SaaS platform implementation.

## Prerequisites

- PostgreSQL database running
- Node.js 18+ installed
- npm or yarn package manager
- Environment variables configured

## Deployment Steps

### 1. Database Migration

Run the Prisma migration to create the multi-tenant tables:

```bash
cd server
npx prisma migrate dev --name add_multi_tenant_support
```

This will create the following tables:
- `Tenant`
- `TenantUser`
- `TenantCustomField`
- `TenantWorkflow`
- `TenantWorkflowExecution`
- `TenantProvisioningLog`

### 2. Generate Prisma Client

Generate the updated Prisma client with multi-tenant models:

```bash
npx prisma generate
```

### 3. Update Server Configuration

Add the tenant routes to your main server file (`server.ts` or `server.js`):

```typescript
import tenantRoutes from './routes/tenantRoutes';
import tenantCustomizationRoutes from './routes/tenantCustomizationRoutes';
import { tenantContextMiddleware } from './middleware/tenantContext';
import { createTenantMiddleware } from './middleware/prismaTenantMiddleware';

// Apply tenant context middleware globally (optional)
// app.use(tenantContextMiddleware);

// Register tenant routes
app.use('/api', tenantRoutes);
app.use('/api', tenantCustomizationRoutes);

// Configure Prisma middleware for automatic tenant filtering
const getTenantId = () => {
  // This should return the current tenant ID from request context
  // Implementation depends on your request context management
  return null; // Placeholder
};

prisma.$use(createTenantMiddleware(getTenantId));
```

### 4. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nexaerp"

# Multi-Tenant Configuration
DEFAULT_TENANT_PLAN=trial
TRIAL_PERIOD_DAYS=30
MAX_USERS_TRIAL=5
MAX_STORAGE_TRIAL_MB=1024

# Email Configuration (for welcome emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@nexaerp.com
SMTP_PASSWORD=your_password
```

### 5. Build TypeScript

Compile the TypeScript code:

```bash
npm run build
```

### 6. Start the Server

Start the server:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

## Testing the Implementation

### 1. Create a Tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "domain": "acme.nexaerp.com",
    "slug": "acme",
    "plan": "professional",
    "contactName": "John Doe",
    "contactEmail": "john@acme.com",
    "features": ["crm", "inventory", "accounting"]
  }'
```

### 2. Access with Tenant Context

Using subdomain (requires DNS configuration):
```
http://acme.nexaerp.com/api/tenant/current
```

Using header:
```bash
curl -X GET http://localhost:3000/api/tenant/current \
  -H "X-Tenant-Slug: acme"
```

Using query parameter:
```
http://localhost:3000/api/tenant/current?tenant=acme
```

### 3. Create Custom Field

```bash
curl -X POST http://localhost:3000/api/tenant/custom-fields \
  -H "X-Tenant-Slug: acme" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "product",
    "fieldName": "warranty_period",
    "fieldLabel": "Warranty Period",
    "fieldType": "number",
    "isRequired": false,
    "defaultValue": "12"
  }'
```

### 4. Create Workflow

```bash
curl -X POST http://localhost:3000/api/tenant/workflows \
  -H "X-Tenant-Slug: acme" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Low Stock Alert",
    "entityType": "product",
    "triggerType": "on_update",
    "actions": [
      {
        "type": "email",
        "config": {
          "template": "low_stock_alert",
          "recipients": ["inventory@acme.com"]
        }
      }
    ]
  }'
```

## Migrating Existing Data

If you have existing data that needs to be tenant-aware:

### 1. Add tenantId to Existing Models

Update your Prisma schema to add `tenantId` to models:

```prisma
model Product {
  id       String @id @default(uuid())
  tenantId String?
  // ... other fields
  
  @@index([tenantId])
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_tenant_to_product
```

### 3. Assign Existing Data to Tenant

Create a migration script to assign existing data to a default tenant:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingData() {
  // Create a default tenant
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Default Tenant',
      domain: 'default.nexaerp.com',
      slug: 'default',
      plan: 'enterprise',
      contactEmail: 'admin@nexaerp.com',
      status: 'active'
    }
  });

  // Update all products to belong to default tenant
  await prisma.product.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenant.id }
  });

  console.log('Migration complete');
}

migrateExistingData();
```

## DNS Configuration

For subdomain-based tenant resolution:

### 1. Wildcard DNS Record

Add a wildcard DNS record pointing to your server:

```
*.nexaerp.com  A  your.server.ip.address
```

### 2. SSL Certificate

Obtain a wildcard SSL certificate:

```bash
certbot certonly --dns-cloudflare \
  -d nexaerp.com \
  -d *.nexaerp.com
```

### 3. Nginx Configuration

Configure Nginx to handle wildcard subdomains:

```nginx
server {
    listen 443 ssl http2;
    server_name *.nexaerp.com;

    ssl_certificate /etc/letsencrypt/live/nexaerp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexaerp.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Maintenance

### 1. Monitor Tenant Metrics

Create a cron job to monitor tenant usage:

```typescript
import { tenantService } from './services/tenantService';

async function monitorTenants() {
  const { tenants } = await tenantService.listTenants();

  for (const tenant of tenants) {
    const metrics = await tenantService.getTenantMetrics(tenant.id);

    // Check if tenant exceeds limits
    if (metrics.activeUsers > tenant.maxUsers) {
      console.warn(`Tenant ${tenant.name} exceeds user limit`);
      // Send notification or suspend tenant
    }

    if (metrics.storageUsed > tenant.maxStorage) {
      console.warn(`Tenant ${tenant.name} exceeds storage limit`);
      // Send notification or suspend tenant
    }
  }
}

// Run every hour
setInterval(monitorTenants, 60 * 60 * 1000);
```

### 2. Trial Expiration Check

Create a cron job to check for expired trials:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExpiredTrials() {
  const expiredTrials = await prisma.tenant.findMany({
    where: {
      status: 'trial',
      trialEndsAt: {
        lt: new Date()
      }
    }
  });

  for (const tenant of expiredTrials) {
    // Suspend tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'suspended' }
    });

    // Send notification
    console.log(`Trial expired for tenant: ${tenant.name}`);
  }
}

// Run daily
setInterval(checkExpiredTrials, 24 * 60 * 60 * 1000);
```

### 3. Backup Tenant Data

Create tenant-specific backups:

```bash
#!/bin/bash

# Backup script for tenant data
TENANT_ID=$1
BACKUP_DIR="/backups/tenants"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$TENANT_ID"

# Backup tenant data
pg_dump -h localhost -U postgres -d nexaerp \
  --table="*" \
  --where="tenant_id='$TENANT_ID'" \
  > "$BACKUP_DIR/$TENANT_ID/backup_$DATE.sql"

echo "Backup completed: $BACKUP_DIR/$TENANT_ID/backup_$DATE.sql"
```

## Troubleshooting

### Issue: Tenant not found

**Symptom**: 404 error when accessing tenant endpoints

**Solution**:
1. Check if tenant exists in database
2. Verify domain/slug matches
3. Check DNS configuration for subdomain
4. Verify tenant context middleware is applied

### Issue: Cross-tenant data access

**Symptom**: Users can see data from other tenants

**Solution**:
1. Verify Prisma middleware is configured
2. Check that tenantId is added to all queries
3. Ensure tenant context is set correctly
4. Review model list in `TENANT_ISOLATED_MODELS`

### Issue: Provisioning fails

**Symptom**: Tenant created but provisioning steps fail

**Solution**:
1. Check provisioning logs in `TenantProvisioningLog` table
2. Verify database permissions
3. Check email service configuration
4. Review error messages in logs

### Issue: Performance degradation

**Symptom**: Slow queries with many tenants

**Solution**:
1. Add indexes on `tenantId` columns
2. Consider schema-based isolation for large tenants
3. Implement query caching
4. Monitor database connection pool

## Security Checklist

- [ ] Tenant context middleware applied to all protected routes
- [ ] Prisma middleware configured for automatic filtering
- [ ] All models have `tenantId` field and index
- [ ] Public routes excluded from tenant context requirement
- [ ] SSL/TLS enabled for all connections
- [ ] Rate limiting configured per tenant
- [ ] Audit logging enabled for tenant operations
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Trial expiration checks automated

## Performance Optimization

### 1. Database Indexes

Ensure all tenant-isolated tables have indexes:

```sql
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
-- Add for all tenant-isolated tables
```

### 2. Connection Pooling

Configure Prisma connection pooling:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});

// Set connection pool size
process.env.DATABASE_URL += '?connection_limit=20';
```

### 3. Caching

Implement Redis caching for tenant data:

```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function getTenantCached(tenantId: string) {
  const cacheKey = `tenant:${tenantId}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(tenant));

  return tenant;
}
```

## Next Steps

1. **Implement Billing Integration**: Add subscription billing with Stripe or similar
2. **Add Tenant Analytics**: Track usage metrics and generate reports
3. **Implement Data Export**: Allow tenants to export their data
4. **Add White-Label Support**: Enable complete branding customization
5. **Implement Tenant Migration**: Tools to migrate between isolation strategies
6. **Add Advanced Workflows**: Visual workflow builder UI
7. **Implement Tenant Backup**: Automated tenant-specific backups
8. **Add Compliance Features**: GDPR, SOC 2, HIPAA compliance tools

## Support

For issues or questions:
- Check the implementation documentation: `TASK_36_MULTI_TENANT_IMPLEMENTATION.md`
- Review the Prisma schema: `prisma/schema.prisma`
- Check the service implementations in `src/services/`
- Review the middleware in `src/middleware/`

## Conclusion

The multi-tenant platform is now deployed and ready for use. Follow the monitoring and maintenance procedures to ensure smooth operation. Regularly review tenant metrics and adjust limits as needed.
