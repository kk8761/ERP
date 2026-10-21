/**
 * Custom Relationship Builder Service
 * Define custom relationships between entities
 * Requirements: 26.7
 * Task: 37.6
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CustomRelationshipDefinition {
  name: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  sourceFieldName: string;
  targetFieldName?: string;
  cascadeDelete?: boolean;
}

export class CustomRelationshipService {
  /**
   * Create a custom relationship
   */
  async createRelationship(
    definition: CustomRelationshipDefinition,
    _userId: string
  ): Promise<any> {
    try {
      this.validateRelationshipDefinition(definition);

      // Verify source and target entities exist
      const sourceEntity = await prisma.customEntity.findUnique({
        where: { id: definition.sourceEntityId },
      });

      const targetEntity = await prisma.customEntity.findUnique({
        where: { id: definition.targetEntityId },
      });

      if (!sourceEntity) {
        throw new Error('Source entity not found');
      }

      if (!targetEntity) {
        throw new Error('Target entity not found');
      }

      // Check if relationship already exists
      const existing = await prisma.customRelationship.findFirst({
        where: {
          sourceEntityId: definition.sourceEntityId,
          targetEntityId: definition.targetEntityId,
          sourceFieldName: definition.sourceFieldName,
          isActive: true,
        },
      });

      if (existing) {
        throw new Error('Relationship already exists');
      }

      const relationship = await prisma.customRelationship.create({
        data: {
          name: definition.name,
          sourceEntityId: definition.sourceEntityId,
          targetEntityId: definition.targetEntityId,
          relationshipType: definition.relationshipType,
          sourceFieldName: definition.sourceFieldName,
          targetFieldName: definition.targetFieldName,
          cascadeDelete: definition.cascadeDelete ?? false,
          isActive: true,
        },
        include: {
          sourceEntity: true,
          targetEntity: true,
        },
      });

      return {
        success: true,
        relationship,
      };
    } catch (error: any) {
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Get all relationships for an entity
   */
  async getRelationshipsForEntity(entityId: string): Promise<any[]> {
    const sourceRelationships = await prisma.customRelationship.findMany({
      where: {
        sourceEntityId: entityId,
        isActive: true,
      },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
    });

    const targetRelationships = await prisma.customRelationship.findMany({
      where: {
        targetEntityId: entityId,
        isActive: true,
      },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
    });

    return [...sourceRelationships, ...targetRelationships];
  }

  /**
   * Get relationship by ID
   */
  async getRelationshipById(id: string): Promise<any> {
    return prisma.customRelationship.findUnique({
      where: { id },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
    });
  }

  /**
   * Update relationship
   */
  async updateRelationship(
    id: string,
    updates: Partial<CustomRelationshipDefinition>
  ): Promise<any> {
    return prisma.customRelationship.update({
      where: { id },
      data: {
        name: updates.name,
        targetFieldName: updates.targetFieldName,
        cascadeDelete: updates.cascadeDelete,
        updatedAt: new Date(),
      },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
    });
  }

  /**
   * Delete relationship
   */
  async deleteRelationship(id: string): Promise<void> {
    await prisma.customRelationship.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get related records (one-to-many)
   */
  async getRelatedRecords(
    relationshipId: string,
    sourceRecordId: string
  ): Promise<any[]> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (relationship.relationshipType !== 'one_to_many') {
      throw new Error('This method only supports one-to-many relationships');
    }

    // Query target entity records that reference the source record
    const records = await prisma.customEntityRecord.findMany({
      where: {
        entityId: relationship.targetEntityId,
      },
    });

    // Filter records where the foreign key field matches the source record ID
    return records.filter((record: any) => {
      const data = record.data as any;
      return data[relationship.sourceFieldName] === sourceRecordId;
    });
  }

  /**
   * Get related record (one-to-one or many-to-one)
   */
  async getRelatedRecord(
    relationshipId: string,
    sourceRecordId: string
  ): Promise<any | null> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (
      relationship.relationshipType !== 'one_to_one' &&
      relationship.relationshipType !== 'many_to_one'
    ) {
      throw new Error(
        'This method only supports one-to-one and many-to-one relationships'
      );
    }

    // Get the source record to find the foreign key value
    const sourceRecord = await prisma.customEntityRecord.findFirst({
      where: {
        id: sourceRecordId,
        entityId: relationship.sourceEntityId,
      },
    });

    if (!sourceRecord) {
      return null;
    }

    const sourceData = sourceRecord.data as any;
    const targetRecordId = sourceData[relationship.sourceFieldName];

    if (!targetRecordId) {
      return null;
    }

    // Get the target record
    return prisma.customEntityRecord.findFirst({
      where: {
        id: targetRecordId,
        entityId: relationship.targetEntityId,
      },
    });
  }

  /**
   * Link records (many-to-many)
   */
  async linkRecords(
    relationshipId: string,
    sourceRecordId: string,
    targetRecordId: string
  ): Promise<void> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (relationship.relationshipType !== 'many_to_many') {
      throw new Error('This method only supports many-to-many relationships');
    }

    // For many-to-many, we need a junction table
    // This is a simplified implementation - in production, you'd create a proper junction table
    const sourceRecord = await prisma.customEntityRecord.findFirst({
      where: {
        id: sourceRecordId,
        entityId: relationship.sourceEntityId,
      },
    });

    if (!sourceRecord) {
      throw new Error('Source record not found');
    }

    const sourceData = sourceRecord.data as any;
    const linkedRecords = sourceData[relationship.sourceFieldName] || [];

    if (!linkedRecords.includes(targetRecordId)) {
      linkedRecords.push(targetRecordId);

      await prisma.customEntityRecord.update({
        where: { id: sourceRecordId },
        data: {
          data: {
            ...sourceData,
            [relationship.sourceFieldName]: linkedRecords,
          },
        },
      });
    }
  }

  /**
   * Unlink records (many-to-many)
   */
  async unlinkRecords(
    relationshipId: string,
    sourceRecordId: string,
    targetRecordId: string
  ): Promise<void> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (relationship.relationshipType !== 'many_to_many') {
      throw new Error('This method only supports many-to-many relationships');
    }

    const sourceRecord = await prisma.customEntityRecord.findFirst({
      where: {
        id: sourceRecordId,
        entityId: relationship.sourceEntityId,
      },
    });

    if (!sourceRecord) {
      throw new Error('Source record not found');
    }

    const sourceData = sourceRecord.data as any;
    const linkedRecords = sourceData[relationship.sourceFieldName] || [];

    const updatedLinkedRecords = linkedRecords.filter(
      (id: string) => id !== targetRecordId
    );

    await prisma.customEntityRecord.update({
      where: { id: sourceRecordId },
      data: {
        data: {
          ...sourceData,
          [relationship.sourceFieldName]: updatedLinkedRecords,
        },
      },
    });
  }

  /**
   * Get linked records (many-to-many)
   */
  async getLinkedRecords(
    relationshipId: string,
    sourceRecordId: string
  ): Promise<any[]> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (relationship.relationshipType !== 'many_to_many') {
      throw new Error('This method only supports many-to-many relationships');
    }

    const sourceRecord = await prisma.customEntityRecord.findFirst({
      where: {
        id: sourceRecordId,
        entityId: relationship.sourceEntityId,
      },
    });

    if (!sourceRecord) {
      return [];
    }

    const sourceData = sourceRecord.data as any;
    const linkedRecordIds = sourceData[relationship.sourceFieldName] || [];

    if (linkedRecordIds.length === 0) {
      return [];
    }

    // Get all linked records
    return prisma.customEntityRecord.findMany({
      where: {
        id: { in: linkedRecordIds },
        entityId: relationship.targetEntityId,
      },
    });
  }

  /**
   * Validate relationship definition
   */
  private validateRelationshipDefinition(
    definition: CustomRelationshipDefinition
  ): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Relationship name is required');
    }

    if (!definition.sourceEntityId) {
      throw new Error('Source entity ID is required');
    }

    if (!definition.targetEntityId) {
      throw new Error('Target entity ID is required');
    }

    if (!definition.relationshipType) {
      throw new Error('Relationship type is required');
    }

    const validTypes = ['one_to_one', 'one_to_many', 'many_to_many'];
    if (!validTypes.includes(definition.relationshipType)) {
      throw new Error(
        `Invalid relationship type. Must be one of: ${validTypes.join(', ')}`
      );
    }

    if (!definition.sourceFieldName || definition.sourceFieldName.trim() === '') {
      throw new Error('Source field name is required');
    }

    // Validate field name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(definition.sourceFieldName)) {
      throw new Error(
        'Source field name must start with a letter or underscore and contain only letters, numbers, and underscores'
      );
    }

    if (
      definition.targetFieldName &&
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(definition.targetFieldName)
    ) {
      throw new Error(
        'Target field name must start with a letter or underscore and contain only letters, numbers, and underscores'
      );
    }
  }

  /**
   * Generate relationship views and forms
   */
  async generateRelationshipViews(relationshipId: string): Promise<any> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const views: any = {
      listView: null,
      formView: null,
      detailView: null,
    };

    switch (relationship.relationshipType) {
      case 'one_to_many':
        views.listView = this.generateOneToManyListView(relationship);
        views.detailView = this.generateOneToManyDetailView(relationship);
        break;

      case 'many_to_many':
        views.formView = this.generateManyToManyFormView(relationship);
        views.listView = this.generateManyToManyListView(relationship);
        break;

      case 'one_to_one':
        views.formView = this.generateOneToOneFormView(relationship);
        views.detailView = this.generateOneToOneDetailView(relationship);
        break;
    }

    return views;
  }

  /**
   * Generate one-to-many list view
   */
  private generateOneToManyListView(relationship: any): string {
    return `
      <div class="related-records">
        <h4>${relationship.name}</h4>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="related-records-${relationship.id}">
            <!-- Records will be loaded dynamically -->
          </tbody>
        </table>
        <button class="btn btn-primary" onclick="addRelatedRecord('${relationship.id}')">
          Add ${relationship.targetEntity.name}
        </button>
      </div>
    `;
  }

  /**
   * Generate many-to-many form view
   */
  private generateManyToManyFormView(relationship: any): string {
    return `
      <div class="related-records">
        <h4>${relationship.name}</h4>
        <select multiple class="form-control" id="related-${relationship.id}">
          <!-- Options will be loaded dynamically -->
        </select>
        <button class="btn btn-primary" onclick="linkRecords('${relationship.id}')">
          Link Selected
        </button>
      </div>
    `;
  }

  /**
   * Generate one-to-one form view
   */
  private generateOneToOneFormView(relationship: any): string {
    return `
      <div class="related-record">
        <label>${relationship.name}</label>
        <select class="form-control" id="related-${relationship.id}">
          <option value="">-- Select ${relationship.targetEntity.name} --</option>
          <!-- Options will be loaded dynamically -->
        </select>
      </div>
    `;
  }

  /**
   * Generate one-to-one detail view
   */
  private generateOneToOneDetailView(relationship: any): string {
    return `
      <div class="related-record-detail">
        <h4>${relationship.name}</h4>
        <div id="related-detail-${relationship.id}">
          <!-- Related record details will be loaded dynamically -->
        </div>
        <button class="btn btn-secondary" onclick="editRelatedRecord('${relationship.id}')">
          Edit ${relationship.targetEntity.name}
        </button>
      </div>
    `;
  }

  /**
   * Generate one-to-many detail view
   */
  private generateOneToManyDetailView(relationship: any): string {
    return `
      <div class="related-records-detail">
        <h4>${relationship.name}</h4>
        <div class="card-grid" id="related-cards-${relationship.id}">
          <!-- Related record cards will be loaded dynamically -->
        </div>
        <button class="btn btn-primary" onclick="addRelatedRecord('${relationship.id}')">
          Add ${relationship.targetEntity.name}
        </button>
      </div>
    `;
  }

  /**
   * Generate many-to-many list view
   */
  private generateManyToManyListView(relationship: any): string {
    return `
      <div class="related-records-list">
        <h4>${relationship.name}</h4>
        <div class="linked-records" id="linked-records-${relationship.id}">
          <!-- Linked records will be displayed as chips/tags -->
        </div>
        <button class="btn btn-primary" onclick="manageManyToManyLinks('${relationship.id}')">
          Manage ${relationship.targetEntity.pluralName || relationship.targetEntity.name}
        </button>
      </div>
    `;
  }

  /**
   * Get all relationships
   */
  async getAllRelationships(): Promise<any[]> {
    return prisma.customRelationship.findMany({
      where: { isActive: true },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cascade delete related records
   */
  async cascadeDeleteRelatedRecords(
    entityId: string,
    recordId: string
  ): Promise<void> {
    // Get all relationships where this entity is the source and cascade delete is enabled
    const relationships = await prisma.customRelationship.findMany({
      where: {
        sourceEntityId: entityId,
        cascadeDelete: true,
        isActive: true,
      },
    });

    for (const relationship of relationships) {
      if (relationship.relationshipType === 'one_to_many') {
        // Delete all related records
        const relatedRecords = await this.getRelatedRecords(
          relationship.id,
          recordId
        );

        for (const relatedRecord of relatedRecords) {
          await prisma.customEntityRecord.delete({
            where: { id: relatedRecord.id },
          });
        }
      }
    }
  }

  /**
   * Query related records with filters and pagination
   */
  async queryRelatedRecords(
    relationshipId: string,
    sourceRecordId: string,
    options?: {
      filters?: Record<string, any>;
      sort?: { field: string; order: 'asc' | 'desc' };
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    let records: any[] = [];

    if (relationship.relationshipType === 'one_to_many') {
      // Get all related records
      const allRecords = await this.getRelatedRecords(
        relationshipId,
        sourceRecordId
      );

      // Apply filters
      if (options?.filters) {
        records = allRecords.filter((record: any) => {
          const data = record.data as any;
          return Object.entries(options.filters!).every(([key, value]) => {
            return data[key] === value;
          });
        });
      } else {
        records = allRecords;
      }

      // Apply sorting
      if (options?.sort) {
        records.sort((a: any, b: any) => {
          const aData = a.data as any;
          const bData = b.data as any;
          const aValue = aData[options.sort!.field];
          const bValue = bData[options.sort!.field];

          if (aValue < bValue) return options.sort!.order === 'asc' ? -1 : 1;
          if (aValue > bValue) return options.sort!.order === 'asc' ? 1 : -1;
          return 0;
        });
      }

      const total = records.length;
      records = records.slice(skip, skip + pageSize);

      return { records, total, page, pageSize };
    } else if (relationship.relationshipType === 'many_to_many') {
      // Get linked records
      const allRecords = await this.getLinkedRecords(
        relationshipId,
        sourceRecordId
      );

      // Apply filters
      if (options?.filters) {
        records = allRecords.filter((record: any) => {
          const data = record.data as any;
          return Object.entries(options.filters!).every(([key, value]) => {
            return data[key] === value;
          });
        });
      } else {
        records = allRecords;
      }

      // Apply sorting
      if (options?.sort) {
        records.sort((a: any, b: any) => {
          const aData = a.data as any;
          const bData = b.data as any;
          const aValue = aData[options.sort!.field];
          const bValue = bData[options.sort!.field];

          if (aValue < bValue) return options.sort!.order === 'asc' ? -1 : 1;
          if (aValue > bValue) return options.sort!.order === 'asc' ? 1 : -1;
          return 0;
        });
      }

      const total = records.length;
      records = records.slice(skip, skip + pageSize);

      return { records, total, page, pageSize };
    }

    return { records: [], total: 0, page, pageSize };
  }

  /**
   * Get relationship statistics
   */
  async getRelationshipStatistics(relationshipId: string): Promise<any> {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Count source records
    const sourceRecordCount = await prisma.customEntityRecord.count({
      where: {
        entityId: relationship.sourceEntityId,
      },
    });

    // Count target records
    const targetRecordCount = await prisma.customEntityRecord.count({
      where: {
        entityId: relationship.targetEntityId,
      },
    });

    return {
      relationshipId: relationship.id,
      name: relationship.name,
      type: relationship.relationshipType,
      sourceEntity: {
        id: relationship.sourceEntityId,
        name: relationship.sourceEntity.name,
        recordCount: sourceRecordCount,
      },
      targetEntity: {
        id: relationship.targetEntityId,
        name: relationship.targetEntity.name,
        recordCount: targetRecordCount,
      },
      cascadeDelete: relationship.cascadeDelete,
      isActive: relationship.isActive,
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
    };
  }
}

export const customRelationshipService = new CustomRelationshipService();
