/**
 * Custom Relationship Builder Tests
 * Tests for custom relationship management
 * Requirements: 26.7
 * Task: 37.6
 */

import { customRelationshipService } from '../services/customRelationship.service';
import { customEntityService } from '../services/customEntity.service';
import { CustomEntityDefinition } from '../types/customEntity';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const testUserId = 'test-user-123';

describe('Custom Relationship Builder', () => {
  let sourceEntityId: string;
  let targetEntityId: string;

  beforeAll(async () => {
    // Create test entities
    const sourceEntityDef: CustomEntityDefinition = {
      name: 'Customer',
      pluralName: 'Customers',
      description: 'Customer entity for testing',
      fields: [
        {
          name: 'name',
          label: 'Customer Name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
        },
      ],
    };

    const targetEntityDef: CustomEntityDefinition = {
      name: 'Order',
      pluralName: 'Orders',
      description: 'Order entity for testing',
      fields: [
        {
          name: 'orderNumber',
          label: 'Order Number',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          label: 'Amount',
          type: 'number',
          required: true,
        },
      ],
    };

    const sourceResult = await customEntityService.createEntity(
      sourceEntityDef,
      testUserId
    );
    const targetResult = await customEntityService.createEntity(
      targetEntityDef,
      testUserId
    );

    sourceEntityId = sourceResult.entity.id;
    targetEntityId = targetResult.entity.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.customRelationship.deleteMany({
      where: {
        OR: [
          { sourceEntityId },
          { targetEntityId },
        ],
      },
    });

    await prisma.customEntity.deleteMany({
      where: {
        id: {
          in: [sourceEntityId, targetEntityId],
        },
      },
    });

    await prisma.$disconnect();
  });

  describe('Relationship Creation', () => {
    it('should create a one-to-many relationship', async () => {
      const definition = {
        name: 'Customer Orders',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'customerId',
        cascadeDelete: false,
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.relationship).toBeDefined();
      expect(result.relationship.name).toBe('Customer Orders');
      expect(result.relationship.relationshipType).toBe('one_to_many');
      expect(result.relationship.sourceEntity).toBeDefined();
      expect(result.relationship.targetEntity).toBeDefined();
    });

    it('should create a many-to-many relationship', async () => {
      const definition = {
        name: 'Product Categories',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'many_to_many' as const,
        sourceFieldName: 'categoryIds',
        targetFieldName: 'productIds',
        cascadeDelete: false,
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.relationship.relationshipType).toBe('many_to_many');
      expect(result.relationship.targetFieldName).toBe('productIds');
    });

    it('should create a one-to-one relationship', async () => {
      const definition = {
        name: 'Customer Profile',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_one' as const,
        sourceFieldName: 'profileId',
        cascadeDelete: true,
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.relationship.relationshipType).toBe('one_to_one');
      expect(result.relationship.cascadeDelete).toBe(true);
    });

    it('should validate required fields', async () => {
      const definition = {
        name: '',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'customerId',
      };

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Relationship name is required');
    });

    it('should validate relationship type', async () => {
      const definition = {
        name: 'Test Relationship',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'invalid_type' as any,
        sourceFieldName: 'customerId',
      };

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Invalid relationship type');
    });

    it('should validate field name format', async () => {
      const definition = {
        name: 'Test Relationship',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: '123invalid',
      };

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Source field name must start with a letter');
    });

    it('should prevent duplicate relationships', async () => {
      const definition = {
        name: 'Duplicate Test',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'testField',
      };

      await customRelationshipService.createRelationship(
        definition,
        testUserId
      );

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Relationship already exists');
    });

    it('should validate source entity exists', async () => {
      const definition = {
        name: 'Test Relationship',
        sourceEntityId: 'non-existent-id',
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'customerId',
      };

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Source entity not found');
    });

    it('should validate target entity exists', async () => {
      const definition = {
        name: 'Test Relationship',
        sourceEntityId,
        targetEntityId: 'non-existent-id',
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'customerId',
      };

      await expect(
        customRelationshipService.createRelationship(definition, testUserId)
      ).rejects.toThrow('Target entity not found');
    });
  });

  describe('Relationship Retrieval', () => {
    let relationshipId: string;

    beforeAll(async () => {
      const definition = {
        name: 'Test Retrieval Relationship',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'retrievalTestField',
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );
      relationshipId = result.relationship.id;
    });

    it('should get relationship by ID', async () => {
      const relationship = await customRelationshipService.getRelationshipById(
        relationshipId
      );

      expect(relationship).toBeDefined();
      expect(relationship.id).toBe(relationshipId);
      expect(relationship.sourceEntity).toBeDefined();
      expect(relationship.targetEntity).toBeDefined();
    });

    it('should get relationships for entity', async () => {
      const relationships =
        await customRelationshipService.getRelationshipsForEntity(
          sourceEntityId
        );

      expect(Array.isArray(relationships)).toBe(true);
      expect(relationships.length).toBeGreaterThan(0);
      expect(
        relationships.some((r) => r.sourceEntityId === sourceEntityId)
      ).toBe(true);
    });

    it('should get all relationships', async () => {
      const relationships =
        await customRelationshipService.getAllRelationships();

      expect(Array.isArray(relationships)).toBe(true);
      expect(relationships.length).toBeGreaterThan(0);
    });
  });

  describe('Relationship Updates', () => {
    let relationshipId: string;

    beforeAll(async () => {
      const definition = {
        name: 'Test Update Relationship',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'updateTestField',
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );
      relationshipId = result.relationship.id;
    });

    it('should update relationship name', async () => {
      const updated = await customRelationshipService.updateRelationship(
        relationshipId,
        {
          name: 'Updated Relationship Name',
        }
      );

      expect(updated.name).toBe('Updated Relationship Name');
    });

    it('should update cascade delete setting', async () => {
      const updated = await customRelationshipService.updateRelationship(
        relationshipId,
        {
          cascadeDelete: true,
        }
      );

      expect(updated.cascadeDelete).toBe(true);
    });

    it('should update target field name', async () => {
      const updated = await customRelationshipService.updateRelationship(
        relationshipId,
        {
          targetFieldName: 'newTargetField',
        }
      );

      expect(updated.targetFieldName).toBe('newTargetField');
    });
  });

  describe('Relationship Deletion', () => {
    it('should soft delete relationship', async () => {
      const definition = {
        name: 'Test Delete Relationship',
        sourceEntityId,
        targetEntityId,
        relationshipType: 'one_to_many' as const,
        sourceFieldName: 'deleteTestField',
      };

      const result = await customRelationshipService.createRelationship(
        definition,
        testUserId
      );

      await customRelationshipService.deleteRelationship(
        result.relationship.id
      );

      const deleted = await prisma.customRelationship.findUnique({
        where: { id: result.relationship.id },
      });

      expect(deleted?.isActive).toBe(false);
    });
  });

  describe('View and Form Generation', () => {
    let oneToManyRelId: string;
    let manyToManyRelId: string;
    let oneToOneRelId: string;

    beforeAll(async () => {
      const oneToMany = await customRelationshipService.createRelationship(
        {
          name: 'Customer Orders',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'one_to_many',
          sourceFieldName: 'customerId',
        },
        testUserId
      );
      oneToManyRelId = oneToMany.relationship.id;

      const manyToMany = await customRelationshipService.createRelationship(
        {
          name: 'Product Tags',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'many_to_many',
          sourceFieldName: 'tagIds',
        },
        testUserId
      );
      manyToManyRelId = manyToMany.relationship.id;

      const oneToOne = await customRelationshipService.createRelationship(
        {
          name: 'User Profile',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'one_to_one',
          sourceFieldName: 'profileId',
        },
        testUserId
      );
      oneToOneRelId = oneToOne.relationship.id;
    });

    it('should generate views for one-to-many relationship', async () => {
      const views = await customRelationshipService.generateRelationshipViews(
        oneToManyRelId
      );

      expect(views).toBeDefined();
      expect(views.listView).toBeDefined();
      expect(views.detailView).toBeDefined();
      expect(views.listView).toContain('related-records');
      expect(views.listView).toContain('Customer Orders');
    });

    it('should generate views for many-to-many relationship', async () => {
      const views = await customRelationshipService.generateRelationshipViews(
        manyToManyRelId
      );

      expect(views).toBeDefined();
      expect(views.formView).toBeDefined();
      expect(views.listView).toBeDefined();
      expect(views.formView).toContain('multiple');
      expect(views.listView).toContain('linked-records');
    });

    it('should generate views for one-to-one relationship', async () => {
      const views = await customRelationshipService.generateRelationshipViews(
        oneToOneRelId
      );

      expect(views).toBeDefined();
      expect(views.formView).toBeDefined();
      expect(views.detailView).toBeDefined();
      expect(views.formView).toContain('select');
      expect(views.detailView).toContain('related-record-detail');
    });

    it('should throw error for non-existent relationship', async () => {
      await expect(
        customRelationshipService.generateRelationshipViews('non-existent-id')
      ).rejects.toThrow('Relationship not found');
    });
  });

  describe('Record Linking (Many-to-Many)', () => {
    let relationshipId: string;
    let sourceRecordId: string;
    let targetRecordId: string;

    beforeAll(async () => {
      // Create relationship
      const relResult = await customRelationshipService.createRelationship(
        {
          name: 'Test Many-to-Many',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'many_to_many',
          sourceFieldName: 'linkedIds',
        },
        testUserId
      );
      relationshipId = relResult.relationship.id;

      // Create test records
      const sourceRecord = await prisma.customEntityRecord.create({
        data: {
          entityId: sourceEntityId,
          data: { name: 'Test Source', linkedIds: [] },
        },
      });
      sourceRecordId = sourceRecord.id;

      const targetRecord = await prisma.customEntityRecord.create({
        data: {
          entityId: targetEntityId,
          data: { orderNumber: 'ORD-001', amount: 100 },
        },
      });
      targetRecordId = targetRecord.id;
    });

    afterAll(async () => {
      await prisma.customEntityRecord.deleteMany({
        where: {
          id: {
            in: [sourceRecordId, targetRecordId],
          },
        },
      });
    });

    it('should link records', async () => {
      await customRelationshipService.linkRecords(
        relationshipId,
        sourceRecordId,
        targetRecordId
      );

      const linkedRecords = await customRelationshipService.getLinkedRecords(
        relationshipId,
        sourceRecordId
      );

      expect(linkedRecords.length).toBe(1);
      expect(linkedRecords[0].id).toBe(targetRecordId);
    });

    it('should not duplicate links', async () => {
      await customRelationshipService.linkRecords(
        relationshipId,
        sourceRecordId,
        targetRecordId
      );

      await customRelationshipService.linkRecords(
        relationshipId,
        sourceRecordId,
        targetRecordId
      );

      const linkedRecords = await customRelationshipService.getLinkedRecords(
        relationshipId,
        sourceRecordId
      );

      expect(linkedRecords.length).toBe(1);
    });

    it('should unlink records', async () => {
      await customRelationshipService.unlinkRecords(
        relationshipId,
        sourceRecordId,
        targetRecordId
      );

      const linkedRecords = await customRelationshipService.getLinkedRecords(
        relationshipId,
        sourceRecordId
      );

      expect(linkedRecords.length).toBe(0);
    });

    it('should throw error for non-many-to-many relationship', async () => {
      const oneToManyRel = await customRelationshipService.createRelationship(
        {
          name: 'Test One-to-Many',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'one_to_many',
          sourceFieldName: 'parentId',
        },
        testUserId
      );

      await expect(
        customRelationshipService.linkRecords(
          oneToManyRel.relationship.id,
          sourceRecordId,
          targetRecordId
        )
      ).rejects.toThrow('This method only supports many-to-many relationships');
    });
  });

  describe('Related Records (One-to-Many)', () => {
    let relationshipId: string;
    let sourceRecordId: string;
    let targetRecordId1: string;
    let targetRecordId2: string;

    beforeAll(async () => {
      // Create relationship
      const relResult = await customRelationshipService.createRelationship(
        {
          name: 'Test One-to-Many',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'one_to_many',
          sourceFieldName: 'parentId',
        },
        testUserId
      );
      relationshipId = relResult.relationship.id;

      // Create source record
      const sourceRecord = await prisma.customEntityRecord.create({
        data: {
          entityId: sourceEntityId,
          data: { name: 'Parent Record' },
        },
      });
      sourceRecordId = sourceRecord.id;

      // Create target records
      const targetRecord1 = await prisma.customEntityRecord.create({
        data: {
          entityId: targetEntityId,
          data: {
            orderNumber: 'ORD-001',
            amount: 100,
            parentId: sourceRecordId,
          },
        },
      });
      targetRecordId1 = targetRecord1.id;

      const targetRecord2 = await prisma.customEntityRecord.create({
        data: {
          entityId: targetEntityId,
          data: {
            orderNumber: 'ORD-002',
            amount: 200,
            parentId: sourceRecordId,
          },
        },
      });
      targetRecordId2 = targetRecord2.id;
    });

    afterAll(async () => {
      await prisma.customEntityRecord.deleteMany({
        where: {
          id: {
            in: [sourceRecordId, targetRecordId1, targetRecordId2],
          },
        },
      });
    });

    it('should get related records', async () => {
      const relatedRecords = await customRelationshipService.getRelatedRecords(
        relationshipId,
        sourceRecordId
      );

      expect(relatedRecords.length).toBe(2);
      expect(relatedRecords.map((r) => r.id)).toContain(targetRecordId1);
      expect(relatedRecords.map((r) => r.id)).toContain(targetRecordId2);
    });

    it('should return empty array for no related records', async () => {
      const anotherSource = await prisma.customEntityRecord.create({
        data: {
          entityId: sourceEntityId,
          data: { name: 'Another Parent' },
        },
      });

      const relatedRecords = await customRelationshipService.getRelatedRecords(
        relationshipId,
        anotherSource.id
      );

      expect(relatedRecords.length).toBe(0);

      await prisma.customEntityRecord.delete({
        where: { id: anotherSource.id },
      });
    });
  });

  describe('Cascade Delete', () => {
    let relationshipId: string;
    let sourceRecordId: string;
    let targetRecordId: string;

    beforeAll(async () => {
      // Create relationship with cascade delete
      const relResult = await customRelationshipService.createRelationship(
        {
          name: 'Test Cascade Delete',
          sourceEntityId,
          targetEntityId,
          relationshipType: 'one_to_many',
          sourceFieldName: 'parentId',
          cascadeDelete: true,
        },
        testUserId
      );
      relationshipId = relResult.relationship.id;

      // Create source record
      const sourceRecord = await prisma.customEntityRecord.create({
        data: {
          entityId: sourceEntityId,
          data: { name: 'Parent for Cascade' },
        },
      });
      sourceRecordId = sourceRecord.id;

      // Create target record
      const targetRecord = await prisma.customEntityRecord.create({
        data: {
          entityId: targetEntityId,
          data: {
            orderNumber: 'ORD-CASCADE',
            amount: 100,
            parentId: sourceRecordId,
          },
        },
      });
      targetRecordId = targetRecord.id;
    });

    it('should cascade delete related records', async () => {
      await customRelationshipService.cascadeDeleteRelatedRecords(
        sourceEntityId,
        sourceRecordId
      );

      const deletedRecord = await prisma.customEntityRecord.findUnique({
        where: { id: targetRecordId },
      });

      expect(deletedRecord).toBeNull();
    });
  });
});
