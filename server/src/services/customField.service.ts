/**
 * Custom Field Service
 * Handles custom fields on standard entities
 * Requirements: 26.1
 * Task: 37.2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CustomFieldDefinition {
  entityName: string; // e.g., 'Product', 'Customer', 'Order'
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'select' | 'multiselect' | 'textarea';
  dataType: 'varchar' | 'integer' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'text' | 'json';
  isRequired?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
  validationRules?: any;
  helpText?: string;
  placeholder?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

export class CustomFieldService {
  /**
   * Add a custom field to a standard entity
   */
  async addCustomField(
    definition: CustomFieldDefinition,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    try {
      // Validate the definition
      this.validateFieldDefinition(definition);

      // Check if entity exists in the system
      const validEntities = await this.getValidEntities();
      if (!validEntities.includes(definition.entityName)) {
        throw new Error(`Invalid entity: ${definition.entityName}`);
      }

      // Check if field already exists
      const existing = await prisma.customFieldDefinition.findFirst({
        where: {
          entityName: definition.entityName,
          fieldName: definition.fieldName,
          tenantId: tenantId || null,
          isActive: true,
        },
      });

      if (existing) {
        throw new Error(
          `Field ${definition.fieldName} already exists on ${definition.entityName}`
        );
      }

      // Create the custom field definition
      const customField = await prisma.customFieldDefinition.create({
        data: {
          entityName: definition.entityName,
          fieldName: definition.fieldName,
          fieldLabel: definition.fieldLabel,
          fieldType: definition.fieldType,
          dataType: definition.dataType,
          isRequired: definition.isRequired ?? false,
          isUnique: definition.isUnique ?? false,
          isIndexed: definition.isIndexed ?? false,
          defaultValue: definition.defaultValue,
          options: definition.options || null,
          validationRules: definition.validationRules || null,
          helpText: definition.helpText,
          placeholder: definition.placeholder,
          length: definition.length,
          precision: definition.precision,
          scale: definition.scale,
          tenantId: tenantId || null,
          createdBy: userId,
          isActive: true,
        },
      });

      return {
        success: true,
        field: customField,
      };
    } catch (error: any) {
      throw new Error(`Failed to add custom field: ${error.message}`);
    }
  }

  /**
   * Get all custom fields for an entity
   */
  async getCustomFields(
    entityName: string,
    tenantId?: string
  ): Promise<any[]> {
    return prisma.customFieldDefinition.findMany({
      where: {
        entityName,
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get custom field value for a record
   */
  async getCustomFieldValue(
    entityName: string,
    recordId: string,
    fieldName: string,
    tenantId?: string
  ): Promise<any> {
    const value = await prisma.customFieldValue.findFirst({
      where: {
        entityName,
        recordId,
        fieldName,
        tenantId: tenantId || null,
      },
    });

    return value?.value;
  }

  /**
   * Get all custom field values for a record
   */
  async getCustomFieldValues(
    entityName: string,
    recordId: string,
    tenantId?: string
  ): Promise<Record<string, any>> {
    const values = await prisma.customFieldValue.findMany({
      where: {
        entityName,
        recordId,
        tenantId: tenantId || null,
      },
    });

    const result: Record<string, any> = {};
    values.forEach((v) => {
      result[v.fieldName] = v.value;
    });

    return result;
  }

  /**
   * Set custom field value for a record
   */
  async setCustomFieldValue(
    entityName: string,
    recordId: string,
    fieldName: string,
    value: any,
    userId: string,
    tenantId?: string
  ): Promise<void> {
    // Get field definition
    const fieldDef = await prisma.customFieldDefinition.findFirst({
      where: {
        entityName,
        fieldName,
        tenantId: tenantId || null,
        isActive: true,
      },
    });

    if (!fieldDef) {
      throw new Error(`Custom field ${fieldName} not found on ${entityName}`);
    }

    // Validate the value
    this.validateFieldValue(fieldDef, value);

    // Upsert the value
    await prisma.customFieldValue.upsert({
      where: {
        entityName_recordId_fieldName_tenantId: {
          entityName,
          recordId,
          fieldName,
          tenantId: tenantId || null,
        },
      },
      create: {
        entityName,
        recordId,
        fieldName,
        value,
        tenantId: tenantId || null,
        createdBy: userId,
      },
      update: {
        value,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Set multiple custom field values for a record
   */
  async setCustomFieldValues(
    entityName: string,
    recordId: string,
    values: Record<string, any>,
    userId: string,
    tenantId?: string
  ): Promise<void> {
    const fieldNames = Object.keys(values);

    for (const fieldName of fieldNames) {
      await this.setCustomFieldValue(
        entityName,
        recordId,
        fieldName,
        values[fieldName],
        userId,
        tenantId
      );
    }
  }

  /**
   * Delete custom field definition
   */
  async deleteCustomField(id: string): Promise<void> {
    await prisma.customFieldDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(
    id: string,
    updates: Partial<CustomFieldDefinition>
  ): Promise<any> {
    return prisma.customFieldDefinition.update({
      where: { id },
      data: {
        fieldLabel: updates.fieldLabel,
        helpText: updates.helpText,
        placeholder: updates.placeholder,
        options: updates.options || undefined,
        validationRules: updates.validationRules || undefined,
        isRequired: updates.isRequired,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Validate field definition
   */
  private validateFieldDefinition(definition: CustomFieldDefinition): void {
    if (!definition.entityName || definition.entityName.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.fieldName || definition.fieldName.trim() === '') {
      throw new Error('Field name is required');
    }

    if (!definition.fieldLabel || definition.fieldLabel.trim() === '') {
      throw new Error('Field label is required');
    }

    if (!definition.fieldType) {
      throw new Error('Field type is required');
    }

    if (!definition.dataType) {
      throw new Error('Data type is required');
    }

    // Validate field name format (alphanumeric and underscore only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(definition.fieldName)) {
      throw new Error(
        'Field name must start with a letter or underscore and contain only letters, numbers, and underscores'
      );
    }

    // Validate select field has options
    if (
      (definition.fieldType === 'select' ||
        definition.fieldType === 'multiselect') &&
      (!definition.options || definition.options.length === 0)
    ) {
      throw new Error('Select fields must have at least one option');
    }
  }

  /**
   * Validate field value
   */
  private validateFieldValue(fieldDef: any, value: any): void {
    // Check required
    if (fieldDef.isRequired && (value === null || value === undefined || value === '')) {
      throw new Error(`${fieldDef.fieldLabel} is required`);
    }

    // Skip validation if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return;
    }

    // Type-specific validation
    switch (fieldDef.fieldType) {
      case 'number':
        if (isNaN(Number(value))) {
          throw new Error(`${fieldDef.fieldLabel} must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          throw new Error(`${fieldDef.fieldLabel} must be a boolean`);
        }
        break;

      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          throw new Error(`${fieldDef.fieldLabel} must be a valid date`);
        }
        break;

      case 'select':
        const validOptions = fieldDef.options?.map((o: any) => o.value) || [];
        if (!validOptions.includes(value)) {
          throw new Error(
            `${fieldDef.fieldLabel} must be one of: ${validOptions.join(', ')}`
          );
        }
        break;

      case 'multiselect':
        const values = Array.isArray(value) ? value : [value];
        const validMultiOptions = fieldDef.options?.map((o: any) => o.value) || [];
        const invalidValues = values.filter((v) => !validMultiOptions.includes(v));
        if (invalidValues.length > 0) {
          throw new Error(
            `${fieldDef.fieldLabel} contains invalid values: ${invalidValues.join(', ')}`
          );
        }
        break;
    }

    // Apply custom validation rules if any
    if (fieldDef.validationRules) {
      this.applyValidationRules(fieldDef, value);
    }
  }

  /**
   * Apply custom validation rules
   */
  private applyValidationRules(fieldDef: any, value: any): void {
    const rules = fieldDef.validationRules;

    if (rules.minLength && value.length < rules.minLength) {
      throw new Error(
        `${fieldDef.fieldLabel} must be at least ${rules.minLength} characters`
      );
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      throw new Error(
        `${fieldDef.fieldLabel} must be at most ${rules.maxLength} characters`
      );
    }

    if (rules.min && Number(value) < rules.min) {
      throw new Error(`${fieldDef.fieldLabel} must be at least ${rules.min}`);
    }

    if (rules.max && Number(value) > rules.max) {
      throw new Error(`${fieldDef.fieldLabel} must be at most ${rules.max}`);
    }

    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      throw new Error(
        `${fieldDef.fieldLabel} does not match the required pattern`
      );
    }
  }

  /**
   * Get list of valid entities that support custom fields
   */
  private async getValidEntities(): Promise<string[]> {
    return [
      'Product',
      'Customer',
      'Order',
      'Lead',
      'Opportunity',
      'Invoice',
      'PurchaseOrder',
      'Supplier',
      'Employee',
      'Asset',
      'Project',
      'Task',
      'Ticket',
      'Contract',
      'Account',
    ];
  }

  /**
   * Enrich entity data with custom field values
   */
  async enrichEntityWithCustomFields(
    entityName: string,
    record: any,
    tenantId?: string
  ): Promise<any> {
    const customFields = await this.getCustomFieldValues(
      entityName,
      record.id,
      tenantId
    );

    return {
      ...record,
      customFields,
    };
  }

  /**
   * Enrich multiple entity records with custom field values
   */
  async enrichEntitiesWithCustomFields(
    entityName: string,
    records: any[],
    tenantId?: string
  ): Promise<any[]> {
    const enrichedRecords = await Promise.all(
      records.map((record) =>
        this.enrichEntityWithCustomFields(entityName, record, tenantId)
      )
    );

    return enrichedRecords;
  }
}

export const customFieldService = new CustomFieldService();
