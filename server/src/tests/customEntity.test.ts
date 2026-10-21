/**
 * Custom Entity Builder Tests
 * Requirements: 19.6, 26.2
 */

import { customEntityService } from '../services/customEntity.service';
import { CustomEntityDefinition } from '../types/customEntity';

describe('Custom Entity Builder', () => {
  const testUserId = 'test-user-123';

  describe('Entity Creation', () => {
    it('should create a custom entity with fields', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Customer Feedback',
        pluralName: 'Customer Feedbacks',
        icon: '💬',
        description: 'Customer feedback and ratings',
        fields: [
          {
            name: 'rating',
            label: 'Rating',
            fieldType: 'number',
            dataType: 'integer',
            isRequired: true,
            isIndexed: true,
          },
          {
            name: 'comments',
            label: 'Comments',
            fieldType: 'textarea',
            dataType: 'text',
            isRequired: false,
          },
          {
            name: 'customer_email',
            label: 'Customer Email',
            fieldType: 'email',
            dataType: 'varchar',
            length: 255,
            isRequired: true,
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.entity.name).toBe('Customer Feedback');
      expect(result.entity.fields).toHaveLength(3);
      expect(result.migration).toBeDefined();
      expect(result.controller).toBeDefined();
      expect(result.route).toBeDefined();
      expect(result.views).toBeDefined();
      expect(result.forms).toBeDefined();
    });

    it('should validate required entity name', async () => {
      const definition: CustomEntityDefinition = {
        name: '',
        pluralName: 'Test Entities',
        fields: [],
      };

      await expect(
        customEntityService.createEntity(definition, testUserId)
      ).rejects.toThrow('Entity name is required');
    });

    it('should validate required fields', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [],
      };

      await expect(
        customEntityService.createEntity(definition, testUserId)
      ).rejects.toThrow('At least one field is required');
    });

    it('should detect duplicate field names', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
          {
            name: 'title',
            label: 'Title 2',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      await expect(
        customEntityService.createEntity(definition, testUserId)
      ).rejects.toThrow('Duplicate field names');
    });
  });

  describe('Code Generation', () => {
    it('should generate valid SQL migration', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
            length: 255,
            isRequired: true,
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.migration.content).toContain('CREATE TABLE');
      expect(result.migration.content).toContain('test_entity');
      expect(result.migration.content).toContain('"title" VARCHAR(255) NOT NULL');
    });

    it('should generate TypeScript controller', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.controller.content).toContain('export class TestEntityController');
      expect(result.controller.content).toContain('async getAll');
      expect(result.controller.content).toContain('async create');
      expect(result.controller.content).toContain('async update');
      expect(result.controller.content).toContain('async delete');
    });

    it('should generate Express routes', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.route.content).toContain('router.get');
      expect(result.route.content).toContain('router.post');
      expect(result.route.content).toContain('router.put');
      expect(result.route.content).toContain('router.delete');
      expect(result.route.content).toContain('checkPermission');
    });

    it('should generate EJS views', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.views).toHaveLength(2); // list and detail views
      expect(result.views[0].content).toContain('<!DOCTYPE html>');
      expect(result.views[0].content).toContain('Test Entities');
    });

    it('should generate forms', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
            isRequired: true,
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.forms).toHaveLength(1);
      expect(result.forms[0].content).toContain('<form');
      expect(result.forms[0].content).toContain('input type="text"');
      expect(result.forms[0].content).toContain('required');
    });
  });

  describe('Field Type Handling', () => {
    it('should handle select field with options', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'status',
            label: 'Status',
            fieldType: 'select',
            dataType: 'varchar',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ],
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.entity.fields[0].options).toHaveLength(2);
      expect(result.forms[0].content).toContain('<select');
      expect(result.forms[0].content).toContain('Active');
      expect(result.forms[0].content).toContain('Inactive');
    });

    it('should handle boolean field', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'is_active',
            label: 'Is Active',
            fieldType: 'boolean',
            dataType: 'boolean',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.forms[0].content).toContain('type="checkbox"');
    });

    it('should handle date field', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'start_date',
            label: 'Start Date',
            fieldType: 'date',
            dataType: 'date',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);

      expect(result.forms[0].content).toContain('type="date"');
    });
  });

  describe('Entity Management', () => {
    it('should list all entities', async () => {
      const entities = await customEntityService.getAllEntities();

      expect(Array.isArray(entities)).toBe(true);
    });

    it('should get entity by ID', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);
      const entity = await customEntityService.getEntityById(result.entity.id);

      expect(entity).toBeDefined();
      expect(entity.id).toBe(result.entity.id);
      expect(entity.name).toBe('Test Entity');
    });

    it('should delete entity', async () => {
      const definition: CustomEntityDefinition = {
        name: 'Test Entity',
        pluralName: 'Test Entities',
        fields: [
          {
            name: 'title',
            label: 'Title',
            fieldType: 'text',
            dataType: 'varchar',
          },
        ],
      };

      const result = await customEntityService.createEntity(definition, testUserId);
      await customEntityService.deleteEntity(result.entity.id);

      const entity = await customEntityService.getEntityById(result.entity.id);
      expect(entity.isActive).toBe(false);
    });
  });
});
