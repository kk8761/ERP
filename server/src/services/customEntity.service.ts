/**
 * Custom Entity Service
 * Handles creation and management of custom entities with automatic code generation
 * Requirements: 19.6, 26.2
 */

import { PrismaClient } from '@prisma/client';
import {
  CustomEntityDefinition,
  CustomFieldDefinition,
  EntityGenerationResult,
  FIELD_TYPE_MAPPINGS,
} from '../types/customEntity';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

export class CustomEntityService {
  /**
   * Create a new custom entity with fields
   */
  async createEntity(
    definition: CustomEntityDefinition,
    userId: string
  ): Promise<EntityGenerationResult> {
    const errors: string[] = [];

    try {
      // Validate entity definition
      this.validateEntityDefinition(definition);

      // Generate table name if not provided
      const tableName =
        definition.tableName ||
        this.generateTableName(definition.name);

      // Create entity in database
      const entity = await prisma.customEntity.create({
        data: {
          name: definition.name,
          pluralName: definition.pluralName,
          tableName,
          icon: definition.icon,
          description: definition.description,
          isActive: definition.isActive ?? true,
          tenantId: definition.tenantId,
          createdBy: userId,
          fields: {
            create: definition.fields.map((field, index) => ({
              name: field.name,
              label: field.label,
              fieldType: field.fieldType,
              dataType: field.dataType,
              length: field.length,
              precision: field.precision,
              scale: field.scale,
              isRequired: field.isRequired ?? false,
              isUnique: field.isUnique ?? false,
              isIndexed: field.isIndexed ?? false,
              defaultValue: field.defaultValue,
              options: field.options || null,
              validationRules: field.validationRules || null,
              referenceEntity: field.referenceEntity,
              displayOrder: field.displayOrder ?? index,
              helpText: field.helpText,
              placeholder: field.placeholder,
              isActive: field.isActive ?? true,
            })),
          },
        },
        include: {
          fields: true,
        },
      });

      // Generate database migration
      const migration = await this.generateMigration(entity);

      // Generate controller
      const controller = await this.generateController(entity);

      // Generate routes
      const route = await this.generateRoutes(entity);

      // Generate views
      const views = await this.generateViews(entity);

      // Generate forms
      const forms = await this.generateForms(entity);

      // Create default layout
      await this.createDefaultLayout(entity.id, entity.fields);

      // Create default view
      await this.createDefaultView(entity.id, entity.fields);

      return {
        entity,
        migration,
        controller,
        route,
        views,
        forms,
        success: true,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      errors.push(error.message);
      throw new Error(`Failed to create custom entity: ${error.message}`);
    }
  }

  /**
   * Validate entity definition
   */
  private validateEntityDefinition(definition: CustomEntityDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.pluralName || definition.pluralName.trim() === '') {
      throw new Error('Entity plural name is required');
    }

    if (!definition.fields || definition.fields.length === 0) {
      throw new Error('At least one field is required');
    }

    // Validate field names are unique
    const fieldNames = definition.fields.map((f) => f.name);
    const duplicates = fieldNames.filter(
      (name, index) => fieldNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      throw new Error(`Duplicate field names: ${duplicates.join(', ')}`);
    }

    // Validate each field
    definition.fields.forEach((field) => {
      if (!field.name || field.name.trim() === '') {
        throw new Error('Field name is required');
      }
      if (!field.label || field.label.trim() === '') {
        throw new Error('Field label is required');
      }
      if (!field.fieldType) {
        throw new Error(`Field type is required for field: ${field.name}`);
      }
    });
  }

  /**
   * Generate table name from entity name
   */
  private generateTableName(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/\s+/g, '_');
  }

  /**
   * Generate Prisma migration for the custom entity
   */
  private async generateMigration(entity: any): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const migrationName = `${timestamp}_create_${entity.tableName}`;
    const migrationDir = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      migrationName
    );

    // Generate SQL for table creation
    const sql = this.generateTableSQL(entity);

    const migrationContent = `-- CreateTable for custom entity: ${entity.name}
${sql}
`;

    return {
      filePath: path.join(migrationDir, 'migration.sql'),
      content: migrationContent,
    };
  }

  /**
   * Generate SQL for creating the custom entity table
   */
  private generateTableSQL(entity: any): string {
    const columns: string[] = [
      '  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()',
    ];

    // Add custom fields
    entity.fields.forEach((field: any) => {
      const columnDef = this.generateColumnDefinition(field);
      columns.push(`  "${field.name}" ${columnDef}`);
    });

    // Add standard audit fields
    columns.push('  "tenantId" TEXT');
    columns.push('  "createdBy" TEXT');
    columns.push('  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    columns.push('  "updatedAt" TIMESTAMP(3) NOT NULL');

    const sql = `CREATE TABLE "${entity.tableName}" (
${columns.join(',\n')}
);

-- Create indexes
CREATE INDEX "${entity.tableName}_tenantId_idx" ON "${entity.tableName}"("tenantId");
CREATE INDEX "${entity.tableName}_createdAt_idx" ON "${entity.tableName}"("createdAt");
`;

    // Add unique indexes
    entity.fields.forEach((field: any) => {
      if (field.isUnique) {
        sql += `CREATE UNIQUE INDEX "${entity.tableName}_${field.name}_key" ON "${entity.tableName}"("${field.name}");\n`;
      }
      if (field.isIndexed && !field.isUnique) {
        sql += `CREATE INDEX "${entity.tableName}_${field.name}_idx" ON "${entity.tableName}"("${field.name}");\n`;
      }
    });

    return sql;
  }

  /**
   * Generate column definition for SQL
   */
  private generateColumnDefinition(field: any): string {
    let def = '';

    switch (field.dataType) {
      case 'varchar':
        def = `VARCHAR(${field.length || 255})`;
        break;
      case 'integer':
        def = 'INTEGER';
        break;
      case 'decimal':
        def = `DECIMAL(${field.precision || 10},${field.scale || 2})`;
        break;
      case 'boolean':
        def = 'BOOLEAN';
        break;
      case 'date':
        def = 'DATE';
        break;
      case 'timestamp':
        def = 'TIMESTAMP(3)';
        break;
      case 'text':
        def = 'TEXT';
        break;
      case 'json':
        def = 'JSONB';
        break;
      default:
        def = 'TEXT';
    }

    if (field.isRequired) {
      def += ' NOT NULL';
    }

    if (field.defaultValue) {
      def += ` DEFAULT '${field.defaultValue}'`;
    }

    return def;
  }

  /**
   * Generate TypeScript controller for the custom entity
   */
  private async generateController(entity: any): Promise<any> {
    const controllerName = `${this.toPascalCase(entity.name)}Controller`;
    const fileName = `${this.toKebabCase(entity.name)}.controller.ts`;

    const content = `/**
 * Auto-generated controller for custom entity: ${entity.name}
 * Generated on: ${new Date().toISOString()}
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ${controllerName} {
  /**
   * Get all ${entity.pluralName}
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 25, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [records, total] = await Promise.all([
        prisma.customEntityRecord.findMany({
          where: { entityId: '${entity.id}' },
          skip,
          take: Number(limit),
          orderBy: { [sortBy as string]: sortOrder },
        }),
        prisma.customEntityRecord.count({
          where: { entityId: '${entity.id}' },
        }),
      ]);

      res.json({
        success: true,
        data: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ${entity.pluralName}',
        error: error.message,
      });
    }
  }

  /**
   * Get single ${entity.name} by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const record = await prisma.customEntityRecord.findFirst({
        where: {
          id,
          entityId: '${entity.id}',
        },
      });

      if (!record) {
        res.status(404).json({
          success: false,
          message: '${entity.name} not found',
        });
        return;
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ${entity.name}',
        error: error.message,
      });
    }
  }

  /**
   * Create new ${entity.name}
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      // Validate required fields
      ${this.generateValidation(entity.fields)}

      const record = await prisma.customEntityRecord.create({
        data: {
          entityId: '${entity.id}',
          data,
          tenantId: (req as any).user?.tenantId,
          createdBy: userId,
        },
      });

      res.status(201).json({
        success: true,
        message: '${entity.name} created successfully',
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to create ${entity.name}',
        error: error.message,
      });
    }
  }

  /**
   * Update ${entity.name}
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const record = await prisma.customEntityRecord.update({
        where: { id },
        data: {
          data,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: '${entity.name} updated successfully',
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to update ${entity.name}',
        error: error.message,
      });
    }
  }

  /**
   * Delete ${entity.name}
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.customEntityRecord.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: '${entity.name} deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete ${entity.name}',
        error: error.message,
      });
    }
  }
}

export const ${this.toCamelCase(entity.name)}Controller = new ${controllerName}();
`;

    return {
      filePath: path.join(
        process.cwd(),
        'src',
        'controllers',
        'generated',
        fileName
      ),
      content,
    };
  }

  /**
   * Generate validation code for required fields
   */
  private generateValidation(fields: any[]): string {
    const requiredFields = fields.filter((f) => f.isRequired);
    if (requiredFields.length === 0) return '// No required fields';

    const validations = requiredFields.map(
      (field) => `
      if (!data.${field.name}) {
        res.status(400).json({
          success: false,
          message: '${field.label} is required',
        });
        return;
      }`
    );

    return validations.join('\n');
  }

  /**
   * Generate Express routes for the custom entity
   */
  private async generateRoutes(entity: any): Promise<any> {
    const fileName = `${this.toKebabCase(entity.name)}.routes.ts`;
    const controllerName = this.toCamelCase(entity.name) + 'Controller';

    const content = `/**
 * Auto-generated routes for custom entity: ${entity.name}
 * Generated on: ${new Date().toISOString()}
 */

import { Router } from 'express';
import { ${controllerName} } from '../controllers/generated/${this.toKebabCase(entity.name)}.controller';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/${this.toKebabCase(entity.pluralName)} - Get all records
router.get(
  '/',
  checkPermission('${entity.tableName}', 'read'),
  ${controllerName}.getAll.bind(${controllerName})
);

// GET /api/${this.toKebabCase(entity.pluralName)}/:id - Get single record
router.get(
  '/:id',
  checkPermission('${entity.tableName}', 'read'),
  ${controllerName}.getById.bind(${controllerName})
);

// POST /api/${this.toKebabCase(entity.pluralName)} - Create new record
router.post(
  '/',
  checkPermission('${entity.tableName}', 'create'),
  ${controllerName}.create.bind(${controllerName})
);

// PUT /api/${this.toKebabCase(entity.pluralName)}/:id - Update record
router.put(
  '/:id',
  checkPermission('${entity.tableName}', 'update'),
  ${controllerName}.update.bind(${controllerName})
);

// DELETE /api/${this.toKebabCase(entity.pluralName)}/:id - Delete record
router.delete(
  '/:id',
  checkPermission('${entity.tableName}', 'delete'),
  ${controllerName}.delete.bind(${controllerName})
);

export default router;
`;

    return {
      filePath: path.join(
        process.cwd(),
        'src',
        'routes',
        'generated',
        fileName
      ),
      content,
    };
  }

  /**
   * Generate EJS views for the custom entity
   */
  private async generateViews(entity: any): Promise<any[]> {
    const views = [];

    // List view
    views.push({
      filePath: path.join(
        process.cwd(),
        'src',
        'views',
        'generated',
        entity.tableName,
        'list.ejs'
      ),
      content: this.generateListView(entity),
    });

    // Detail view
    views.push({
      filePath: path.join(
        process.cwd(),
        'src',
        'views',
        'generated',
        entity.tableName,
        'detail.ejs'
      ),
      content: this.generateDetailView(entity),
    });

    return views;
  }

  /**
   * Generate list view HTML
   */
  private generateListView(entity: any): string {
    const columns = entity.fields
      .slice(0, 5)
      .map((f: any) => `<th>${f.label}</th>`)
      .join('\n          ');

    const cells = entity.fields
      .slice(0, 5)
      .map((f: any) => `<td><%= record.data.${f.name} %></td>`)
      .join('\n            ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entity.pluralName} - NexaERP</title>
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <%- include('../partials/header') %>
  
  <div class="container">
    <div class="page-header">
      <h1>${entity.icon || '📋'} ${entity.pluralName}</h1>
      <a href="/custom/${entity.tableName}/new" class="btn btn-primary">
        + New ${entity.name}
      </a>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            ${columns}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <% records.forEach(record => { %>
            <tr>
              ${cells}
              <td>
                <a href="/custom/${entity.tableName}/<%= record.id %>" class="btn btn-sm">View</a>
                <a href="/custom/${entity.tableName}/<%= record.id %>/edit" class="btn btn-sm">Edit</a>
              </td>
            </tr>
          <% }); %>
        </tbody>
      </table>
    </div>
  </div>

  <%- include('../partials/footer') %>
</body>
</html>
`;
  }

  /**
   * Generate detail view HTML
   */
  private generateDetailView(entity: any): string {
    const fields = entity.fields
      .map(
        (f: any) => `
      <div class="field-group">
        <label>${f.label}</label>
        <div class="field-value"><%= record.data.${f.name} || '-' %></div>
      </div>`
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entity.name} Details - NexaERP</title>
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <%- include('../partials/header') %>
  
  <div class="container">
    <div class="page-header">
      <h1>${entity.icon || '📋'} ${entity.name} Details</h1>
      <div class="actions">
        <a href="/custom/${entity.tableName}/<%= record.id %>/edit" class="btn btn-primary">Edit</a>
        <a href="/custom/${entity.tableName}" class="btn btn-secondary">Back to List</a>
      </div>
    </div>

    <div class="detail-card">
      ${fields}
    </div>
  </div>

  <%- include('../partials/footer') %>
</body>
</html>
`;
  }

  /**
   * Generate forms for the custom entity
   */
  private async generateForms(entity: any): Promise<any[]> {
    const forms = [];

    // Create/Edit form
    forms.push({
      filePath: path.join(
        process.cwd(),
        'src',
        'views',
        'generated',
        entity.tableName,
        'form.ejs'
      ),
      content: this.generateFormView(entity),
    });

    return forms;
  }

  /**
   * Generate form view HTML
   */
  private generateFormView(entity: any): string {
    const formFields = entity.fields
      .map((f: any) => this.generateFormField(f))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= isEdit ? 'Edit' : 'New' %> ${entity.name} - NexaERP</title>
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <%- include('../partials/header') %>
  
  <div class="container">
    <div class="page-header">
      <h1>${entity.icon || '📋'} <%= isEdit ? 'Edit' : 'New' %> ${entity.name}</h1>
    </div>

    <form id="${entity.tableName}-form" class="form-card">
      ${formFields}

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save</button>
        <a href="/custom/${entity.tableName}" class="btn btn-secondary">Cancel</a>
      </div>
    </form>
  </div>

  <script>
    document.getElementById('${entity.tableName}-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      try {
        const url = '<%= isEdit ? \`/api/custom/${entity.tableName}/\${record.id}\` : \`/api/custom/${entity.tableName}\` %>';
        const method = '<%= isEdit ? "PUT" : "POST" %>';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          window.location.href = '/custom/${entity.tableName}';
        } else {
          const error = await response.json();
          alert('Error: ' + error.message);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  </script>

  <%- include('../partials/footer') %>
</body>
</html>
`;
  }

  /**
   * Generate HTML for a single form field
   */
  private generateFormField(field: any): string {
    const required = field.isRequired ? 'required' : '';
    const value = `<%= record?.data?.${field.name} || '' %>`;

    let input = '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        input = `<input type="${field.fieldType}" name="${field.name}" id="${field.name}" 
          placeholder="${field.placeholder || ''}" value="${value}" ${required} />`;
        break;

      case 'number':
        input = `<input type="number" name="${field.name}" id="${field.name}" 
          placeholder="${field.placeholder || ''}" value="${value}" ${required} />`;
        break;

      case 'boolean':
        input = `<input type="checkbox" name="${field.name}" id="${field.name}" 
          <%= record?.data?.${field.name} ? 'checked' : '' %> />`;
        break;

      case 'date':
        input = `<input type="date" name="${field.name}" id="${field.name}" 
          value="${value}" ${required} />`;
        break;

      case 'datetime':
        input = `<input type="datetime-local" name="${field.name}" id="${field.name}" 
          value="${value}" ${required} />`;
        break;

      case 'textarea':
        input = `<textarea name="${field.name}" id="${field.name}" rows="4" 
          placeholder="${field.placeholder || ''}" ${required}>${value}</textarea>`;
        break;

      case 'select':
        const options = field.options || [];
        const optionHTML = options
          .map(
            (opt: any) =>
              `<option value="${opt.value}" <%= record?.data?.${field.name} === '${opt.value}' ? 'selected' : '' %>>${opt.label}</option>`
          )
          .join('\n            ');
        input = `<select name="${field.name}" id="${field.name}" ${required}>
            <option value="">Select ${field.label}</option>
            ${optionHTML}
          </select>`;
        break;

      default:
        input = `<input type="text" name="${field.name}" id="${field.name}" 
          placeholder="${field.placeholder || ''}" value="${value}" ${required} />`;
    }

    return `
      <div class="form-group">
        <label for="${field.name}">
          ${field.label}
          ${field.isRequired ? '<span class="required">*</span>' : ''}
        </label>
        ${input}
        ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
      </div>`;
  }

  /**
   * Create default layout for the entity
   */
  private async createDefaultLayout(
    entityId: string,
    fields: any[]
  ): Promise<void> {
    const sections = [
      {
        title: 'General Information',
        collapsible: false,
        fields: fields.map((f) => f.name),
      },
    ];

    await prisma.customLayout.create({
      data: {
        entityId,
        name: 'Default Layout',
        layoutType: 'form',
        isDefault: true,
        sections,
        columns: 2,
      },
    });
  }

  /**
   * Create default view for the entity
   */
  private async createDefaultView(
    entityId: string,
    fields: any[]
  ): Promise<void> {
    const columns = fields.slice(0, 5).map((f) => f.name);

    await prisma.customView.create({
      data: {
        entityId,
        name: 'All Records',
        isDefault: true,
        columns,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        pageSize: 25,
      },
    });
  }

  /**
   * Get all custom entities
   */
  async getAllEntities(tenantId?: string): Promise<any[]> {
    return prisma.customEntity.findMany({
      where: {
        isActive: true,
        tenantId: tenantId || null,
      },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { records: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get entity by ID
   */
  async getEntityById(id: string): Promise<any> {
    return prisma.customEntity.findUnique({
      where: { id },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        layouts: true,
        views: true,
      },
    });
  }

  /**
   * Delete custom entity
   */
  async deleteEntity(id: string): Promise<void> {
    await prisma.customEntity.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Utility methods
  private toPascalCase(str: string): string {
    return str
      .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase())
      .replace(/\s+/g, '');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}

export const customEntityService = new CustomEntityService();
