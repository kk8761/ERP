# Custom Entity Builder Implementation

## Overview

The Custom Entity Builder is a low-code platform feature that allows users to create custom entities visually without writing code. The system automatically generates database tables, controllers, views, and forms based on the entity definition.

**Task:** 37.1 Implement custom entity builder  
**Requirements:** 19.6, 26.2  
**Phase:** 6 - Global & Industry-Specific (Months 16-18)

## Features Implemented

### 1. Visual Entity Designer

A drag-and-drop interface for creating custom entities with the following capabilities:

- **Entity Configuration:**
  - Entity name and plural name
  - Icon selection (emoji support)
  - Description
  - Tenant isolation support

- **Field Types Supported:**
  - Text (varchar)
  - Number (decimal)
  - Boolean (checkbox)
  - Date
  - DateTime
  - Select (dropdown with options)
  - Multi-select
  - Email
  - Phone
  - URL
  - Text Area
  - Rich Text

- **Field Properties:**
  - Field name (database column name)
  - Field label (display name)
  - Required/Optional
  - Unique constraint
  - Indexed
  - Default value
  - Placeholder text
  - Help text
  - Options (for select/multiselect fields)

### 2. Automatic Database Table Generation

The system automatically generates:

- PostgreSQL table with proper column types
- Primary key (UUID)
- Tenant ID for multi-tenant isolation
- Audit fields (createdBy, createdAt, updatedAt)
- Indexes for performance
- Unique constraints where specified

**Example Generated SQL:**
```sql
CREATE TABLE "customer_feedback" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "rating" INTEGER NOT NULL,
  "comments" TEXT,
  "customer_email" VARCHAR(255),
  "tenantId" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "customer_feedback_tenantId_idx" ON "customer_feedback"("tenantId");
CREATE INDEX "customer_feedback_createdAt_idx" ON "customer_feedback"("createdAt");
CREATE INDEX "customer_feedback_rating_idx" ON "customer_feedback"("rating");
```

### 3. Automatic Controller Generation

For each custom entity, the system generates a TypeScript controller with:

- **CRUD Operations:**
  - `getAll()` - List all records with pagination
  - `getById()` - Get single record
  - `create()` - Create new record with validation
  - `update()` - Update existing record
  - `delete()` - Delete record

- **Features:**
  - Automatic validation for required fields
  - Pagination support
  - Sorting and filtering
  - Tenant isolation
  - Error handling

**Example Generated Controller:**
```typescript
export class CustomerFeedbackController {
  async getAll(req: Request, res: Response): Promise<void> {
    // Pagination, filtering, sorting logic
  }
  
  async create(req: Request, res: Response): Promise<void> {
    // Validation and creation logic
  }
  
  // ... other CRUD methods
}
```

### 4. Automatic Route Generation

The system generates Express routes with:

- RESTful API endpoints
- Authentication middleware
- RBAC permission checks
- Proper HTTP methods (GET, POST, PUT, DELETE)

**Example Generated Routes:**
```typescript
router.get('/', checkPermission('customer_feedback', 'read'), controller.getAll);
router.post('/', checkPermission('customer_feedback', 'create'), controller.create);
router.put('/:id', checkPermission('customer_feedback', 'update'), controller.update);
router.delete('/:id', checkPermission('customer_feedback', 'delete'), controller.delete);
```

### 5. Automatic View Generation

The system generates EJS views for:

- **List View:** Table view with pagination
- **Detail View:** Single record display
- **Form View:** Create/Edit form with proper input types

**Features:**
- Responsive design
- Proper input types based on field types
- Client-side validation
- AJAX form submission
- Error handling

### 6. Automatic Form Generation

Forms are generated with:

- Proper HTML input types for each field type
- Required field indicators
- Placeholder text
- Help text
- Select dropdowns with options
- Checkbox for boolean fields
- Date/datetime pickers
- Client-side validation

## Architecture

### Database Models (Prisma)

```prisma
model CustomEntity {
  id              String   @id @default(uuid())
  name            String
  pluralName      String
  tableName       String   @unique
  icon            String?
  description     String?
  isActive        Boolean  @default(true)
  tenantId        String?
  createdBy       String
  
  fields          CustomField[]
  layouts         CustomLayout[]
  views           CustomView[]
  records         CustomEntityRecord[]
}

model CustomField {
  id              String   @id @default(uuid())
  entityId        String
  name            String
  label           String
  fieldType       String   // text, number, boolean, date, etc.
  dataType        String   // varchar, integer, decimal, etc.
  isRequired      Boolean
  isUnique        Boolean
  isIndexed       Boolean
  options         Json?    // For select fields
  validationRules Json?
}

model CustomEntityRecord {
  id              String   @id @default(uuid())
  entityId        String
  data            Json     // Stores all field values
  tenantId        String?
  createdBy       String?
}
```

### Service Layer

**CustomEntityService** (`server/src/services/customEntity.service.ts`):
- `createEntity()` - Creates entity and generates all code
- `getAllEntities()` - Lists all custom entities
- `getEntityById()` - Gets entity details
- `deleteEntity()` - Soft deletes entity
- Code generation methods for migrations, controllers, routes, views, forms

### Controller Layer

**CustomEntityController** (`server/src/controllers/customEntity.controller.ts`):
- Handles HTTP requests for entity management
- Renders designer and list pages
- Delegates to service layer

### Routes

**CustomEntityRoutes** (`server/src/routes/customEntity.routes.ts`):
- `/custom-entities/designer` - Visual designer page
- `/custom-entities` - List all entities
- `/custom-entities/api` - API endpoints for CRUD operations

### Views

**Designer View** (`server/src/views/pages/custom-entity-designer.ejs`):
- Drag-and-drop interface
- Field configuration modal
- Real-time preview
- Entity metadata form

**List View** (`server/src/views/pages/custom-entity-list.ejs`):
- Grid of entity cards
- Entity statistics (field count, record count)
- Quick actions (view, edit, delete)

## Usage

### Creating a Custom Entity

1. Navigate to `/custom-entities/designer`
2. Enter entity details:
   - Name: "Customer Feedback"
   - Plural Name: "Customer Feedbacks"
   - Icon: "💬"
   - Description: "Customer feedback and ratings"

3. Drag field types from the left panel to the canvas
4. Configure each field:
   - Name: "rating"
   - Label: "Rating"
   - Type: Number
   - Required: Yes
   - Indexed: Yes

5. Click "Create Entity"

### Generated Artifacts

The system generates:
- Database migration file
- TypeScript controller
- Express routes
- EJS views (list, detail, form)
- Default layout configuration
- Default view configuration

### Accessing Custom Entity Data

After creation, the entity is accessible at:
- List view: `/custom/customer_feedback`
- Create form: `/custom/customer_feedback/new`
- Detail view: `/custom/customer_feedback/:id`
- Edit form: `/custom/customer_feedback/:id/edit`

API endpoints:
- `GET /api/custom/customer_feedback` - List all
- `GET /api/custom/customer_feedback/:id` - Get one
- `POST /api/custom/customer_feedback` - Create
- `PUT /api/custom/customer_feedback/:id` - Update
- `DELETE /api/custom/customer_feedback/:id` - Delete

## Security

### Multi-Tenant Isolation

- All custom entities support tenant isolation
- Records are automatically filtered by tenant ID
- Tenant context is injected from authenticated user

### RBAC Integration

- All generated routes include RBAC permission checks
- Permissions are based on table name
- Actions: create, read, update, delete

### Validation

- Required field validation
- Unique constraint validation
- Data type validation
- Custom validation rules support

## Extensibility

### Custom Field Types

New field types can be added by:
1. Adding to `FieldType` enum in `customEntity.ts`
2. Adding mapping in `FIELD_TYPE_MAPPINGS`
3. Updating form field generation logic

### Custom Layouts

Users can create multiple layouts per entity:
- Form layouts with sections
- List layouts with column selection
- Detail layouts with field grouping

### Custom Views

Users can create filtered views:
- Column selection
- Filter criteria
- Sort order
- Page size

## Limitations

### Current Limitations

1. **No Relationship Support (Yet):** 
   - One-to-many and many-to-many relationships are defined in the schema but not yet implemented in the UI

2. **No Migration Rollback:**
   - Generated migrations are not automatically applied
   - Manual migration execution required

3. **No Field Modification:**
   - Once created, fields cannot be modified
   - Entity must be recreated to change field structure

4. **Limited Validation Rules:**
   - Basic validation only (required, unique)
   - Complex validation rules not yet supported

### Future Enhancements

1. **Relationship Builder:**
   - Visual relationship designer
   - Automatic foreign key generation
   - Cascade delete options

2. **Advanced Validation:**
   - Custom validation rules
   - Cross-field validation
   - Regex patterns

3. **Workflow Integration:**
   - Trigger workflows on entity events
   - Approval workflows for custom entities

4. **Import/Export:**
   - Bulk data import from CSV/Excel
   - Data export functionality

5. **API Documentation:**
   - Auto-generated API documentation
   - Swagger/OpenAPI specs

## Testing

### Manual Testing Steps

1. **Create Entity:**
   ```bash
   # Navigate to designer
   http://localhost:5000/custom-entities/designer
   
   # Create entity with fields
   # Verify entity appears in list
   ```

2. **Test CRUD Operations:**
   ```bash
   # Create record
   POST /api/custom/test_entity
   
   # List records
   GET /api/custom/test_entity
   
   # Get single record
   GET /api/custom/test_entity/:id
   
   # Update record
   PUT /api/custom/test_entity/:id
   
   # Delete record
   DELETE /api/custom/test_entity/:id
   ```

3. **Test Views:**
   ```bash
   # List view
   http://localhost:5000/custom/test_entity
   
   # Create form
   http://localhost:5000/custom/test_entity/new
   
   # Detail view
   http://localhost:5000/custom/test_entity/:id
   
   # Edit form
   http://localhost:5000/custom/test_entity/:id/edit
   ```

### Integration Testing

```typescript
describe('Custom Entity Builder', () => {
  it('should create custom entity', async () => {
    const definition = {
      name: 'Test Entity',
      pluralName: 'Test Entities',
      fields: [
        { name: 'title', label: 'Title', fieldType: 'text', dataType: 'varchar', isRequired: true }
      ]
    };
    
    const result = await customEntityService.createEntity(definition, userId);
    expect(result.success).toBe(true);
    expect(result.entity).toBeDefined();
  });
  
  it('should generate controller', async () => {
    // Test controller generation
  });
  
  it('should generate routes', async () => {
    // Test route generation
  });
});
```

## Performance Considerations

### Database

- Indexes are automatically created for:
  - Primary keys
  - Tenant IDs
  - Indexed fields
  - Unique fields

### Caching

- Entity definitions can be cached
- Generated code can be cached
- Record queries use standard caching strategies

### Scalability

- Custom entities use the same infrastructure as standard entities
- No performance degradation with multiple custom entities
- JSON storage for flexible schema

## Deployment

### Prerequisites

- PostgreSQL database
- Prisma migrations configured
- Node.js 18+
- TypeScript compiler

### Deployment Steps

1. **Run Migrations:**
   ```bash
   cd server
   npx prisma migrate deploy
   ```

2. **Build TypeScript:**
   ```bash
   npm run build
   ```

3. **Start Server:**
   ```bash
   npm start
   ```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nexaerp
NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **Entity Creation Fails:**
   - Check database connection
   - Verify Prisma schema is up to date
   - Check for duplicate table names

2. **Generated Code Not Working:**
   - Verify TypeScript compilation
   - Check for syntax errors in generated code
   - Ensure routes are registered in server.ts

3. **Views Not Rendering:**
   - Check EJS template syntax
   - Verify view paths are correct
   - Check for missing partials

### Debug Mode

Enable debug logging:
```typescript
// In customEntity.service.ts
console.log('Creating entity:', definition);
console.log('Generated SQL:', sql);
console.log('Generated controller:', controller.content);
```

## Conclusion

The Custom Entity Builder provides a powerful low-code platform for extending the ERP system with custom data models. It follows the monolithic architecture pattern, generates clean TypeScript code, and integrates seamlessly with existing authentication, authorization, and multi-tenant features.

The implementation satisfies requirements 19.6 and 26.2, providing users with the ability to create custom entities without writing code while maintaining enterprise-grade security, performance, and scalability.

## Related Documentation

- [Prisma Schema](../prisma/schema.prisma)
- [Custom Entity Types](../src/types/customEntity.ts)
- [RBAC Implementation](./RBAC_SETUP_GUIDE.md)
- [Multi-Tenant Implementation](./TASK_36_MULTI_TENANT_IMPLEMENTATION.md)
