/**
 * Page Layout Designer Service
 * Create drag-and-drop page layouts for entities
 * Requirements: 26.3
 * Task: 37.3
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PageLayoutDefinition {
  name: string;
  entityName: string;
  layoutType: 'form' | 'detail' | 'list';
  sections: LayoutSection[];
  isDefault?: boolean;
}

export interface LayoutSection {
  id: string;
  title: string;
  columns: number; // 1, 2, or 3 columns
  collapsible: boolean;
  collapsed: boolean;
  fields: LayoutField[];
  order: number;
}

export interface LayoutField {
  fieldName: string;
  label?: string;
  width: number; // 1-12 (Bootstrap grid)
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  order: number;
}

export class PageLayoutService {
  /**
   * Create a page layout
   */
  async createLayout(
    definition: PageLayoutDefinition,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    try {
      this.validateLayoutDefinition(definition);

      // If this is set as default, unset other defaults
      if (definition.isDefault) {
        await this.unsetDefaultLayouts(
          definition.entityName,
          definition.layoutType,
          tenantId
        );
      }

      const layout = await prisma.pageLayout.create({
        data: {
          name: definition.name,
          entityName: definition.entityName,
          layoutType: definition.layoutType,
          sections: definition.sections as any,
          isDefault: definition.isDefault ?? false,
          isActive: true,
          tenantId: tenantId || null,
          createdBy: userId,
        },
      });

      return {
        success: true,
        layout,
      };
    } catch (error: any) {
      throw new Error(`Failed to create page layout: ${error.message}`);
    }
  }

  /**
   * Get all layouts for an entity
   */
  async getLayoutsForEntity(
    entityName: string,
    layoutType?: string,
    tenantId?: string
  ): Promise<any[]> {
    const where: any = {
      entityName,
      tenantId: tenantId || null,
      isActive: true,
    };

    if (layoutType) {
      where.layoutType = layoutType;
    }

    return prisma.pageLayout.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get default layout for an entity
   */
  async getDefaultLayout(
    entityName: string,
    layoutType: string,
    tenantId?: string
  ): Promise<any | null> {
    const layout = await prisma.pageLayout.findFirst({
      where: {
        entityName,
        layoutType,
        isDefault: true,
        tenantId: tenantId || null,
        isActive: true,
      },
    });

    // If no default layout, return the first one
    if (!layout) {
      return prisma.pageLayout.findFirst({
        where: {
          entityName,
          layoutType,
          tenantId: tenantId || null,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return layout;
  }

  /**
   * Get layout by ID
   */
  async getLayoutById(id: string): Promise<any> {
    return prisma.pageLayout.findUnique({
      where: { id },
    });
  }

  /**
   * Update page layout
   */
  async updateLayout(
    id: string,
    updates: Partial<PageLayoutDefinition>
  ): Promise<any> {
    const layout = await this.getLayoutById(id);
    if (!layout) {
      throw new Error('Layout not found');
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await this.unsetDefaultLayouts(
        layout.entityName,
        layout.layoutType,
        layout.tenantId
      );
    }

    return prisma.pageLayout.update({
      where: { id },
      data: {
        name: updates.name,
        sections: updates.sections as any,
        isDefault: updates.isDefault,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete page layout
   */
  async deleteLayout(id: string): Promise<void> {
    await prisma.pageLayout.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Clone a layout
   */
  async cloneLayout(
    id: string,
    newName: string,
    userId: string
  ): Promise<any> {
    const original = await this.getLayoutById(id);
    if (!original) {
      throw new Error('Layout not found');
    }

    const cloned = await prisma.pageLayout.create({
      data: {
        name: newName,
        entityName: original.entityName,
        layoutType: original.layoutType,
        sections: original.sections,
        isDefault: false,
        isActive: true,
        tenantId: original.tenantId,
        createdBy: userId,
      },
    });

    return {
      success: true,
      layout: cloned,
    };
  }

  /**
   * Set layout as default
   */
  async setAsDefault(id: string): Promise<any> {
    const layout = await this.getLayoutById(id);
    if (!layout) {
      throw new Error('Layout not found');
    }

    // Unset other defaults
    await this.unsetDefaultLayouts(
      layout.entityName,
      layout.layoutType,
      layout.tenantId
    );

    // Set this as default
    return prisma.pageLayout.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  /**
   * Unset default layouts
   */
  private async unsetDefaultLayouts(
    entityName: string,
    layoutType: string,
    tenantId?: string | null
  ): Promise<void> {
    await prisma.pageLayout.updateMany({
      where: {
        entityName,
        layoutType,
        tenantId: tenantId || null,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  /**
   * Validate layout definition
   */
  private validateLayoutDefinition(definition: PageLayoutDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Layout name is required');
    }

    if (!definition.entityName || definition.entityName.trim() === '') {
      throw new Error('Entity name is required');
    }

    if (!definition.layoutType) {
      throw new Error('Layout type is required');
    }

    const validLayoutTypes = ['form', 'detail', 'list'];
    if (!validLayoutTypes.includes(definition.layoutType)) {
      throw new Error(
        `Invalid layout type. Must be one of: ${validLayoutTypes.join(', ')}`
      );
    }

    if (!definition.sections || definition.sections.length === 0) {
      throw new Error('Layout must have at least one section');
    }

    // Validate sections
    definition.sections.forEach((section, index) => {
      if (!section.title || section.title.trim() === '') {
        throw new Error(`Section ${index + 1} must have a title`);
      }

      if (!section.columns || section.columns < 1 || section.columns > 3) {
        throw new Error(`Section ${index + 1} must have 1-3 columns`);
      }

      if (!section.fields || section.fields.length === 0) {
        throw new Error(`Section ${index + 1} must have at least one field`);
      }

      // Validate fields
      section.fields.forEach((field, fieldIndex) => {
        if (!field.fieldName || field.fieldName.trim() === '') {
          throw new Error(
            `Field ${fieldIndex + 1} in section ${index + 1} must have a field name`
          );
        }

        if (!field.width || field.width < 1 || field.width > 12) {
          throw new Error(
            `Field ${fieldIndex + 1} in section ${index + 1} must have width between 1-12`
          );
        }
      });
    });
  }

  /**
   * Generate default layout for an entity
   */
  async generateDefaultLayout(
    entityName: string,
    fields: Array<{ name: string; label: string; type: string }>,
    userId: string,
    tenantId?: string
  ): Promise<any> {
    // Create a simple 2-column form layout
    const sections: LayoutSection[] = [
      {
        id: 'section-1',
        title: 'General Information',
        columns: 2,
        collapsible: false,
        collapsed: false,
        fields: fields.map((field, index) => ({
          fieldName: field.name,
          label: field.label,
          width: 6, // Half width for 2 columns
          required: false,
          readonly: false,
          hidden: false,
          order: index,
        })),
        order: 0,
      },
    ];

    return this.createLayout(
      {
        name: `Default ${entityName} Layout`,
        entityName,
        layoutType: 'form',
        sections,
        isDefault: true,
      },
      userId,
      tenantId
    );
  }

  /**
   * Render layout as HTML
   */
  renderLayout(layout: any, data: Record<string, any>): string {
    const sections = layout.sections as LayoutSection[];
    let html = '<div class="page-layout">';

    sections.forEach((section) => {
      html += `<div class="layout-section ${section.collapsible ? 'collapsible' : ''}" data-section-id="${section.id}">`;
      html += `<h3 class="section-title">${section.title}</h3>`;
      html += `<div class="section-content row">`;

      section.fields.forEach((field) => {
        if (!field.hidden) {
          const value = data[field.fieldName] || '';
          const label = field.label || field.fieldName;
          const required = field.required ? '<span class="required">*</span>' : '';
          const readonly = field.readonly ? 'readonly' : '';

          html += `<div class="col-md-${field.width} form-group">`;
          html += `<label>${label}${required}</label>`;
          html += `<input type="text" name="${field.fieldName}" value="${value}" ${readonly} class="form-control" />`;
          html += `</div>`;
        }
      });

      html += `</div></div>`;
    });

    html += '</div>';
    return html;
  }

  /**
   * Get all layouts
   */
  async getAllLayouts(tenantId?: string): Promise<any[]> {
    return prisma.pageLayout.findMany({
      where: {
        tenantId: tenantId || null,
        isActive: true,
      },
      orderBy: [{ entityName: 'asc' }, { layoutType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Reorder sections in a layout
   */
  async reorderSections(
    id: string,
    sectionOrders: Array<{ sectionId: string; order: number }>
  ): Promise<any> {
    const layout = await this.getLayoutById(id);
    if (!layout) {
      throw new Error('Layout not found');
    }

    const sections = layout.sections as LayoutSection[];
    
    // Update section orders
    sectionOrders.forEach(({ sectionId, order }) => {
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        section.order = order;
      }
    });

    // Sort sections by order
    sections.sort((a, b) => a.order - b.order);

    return prisma.pageLayout.update({
      where: { id },
      data: {
        sections: sections as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Add section to layout
   */
  async addSection(
    id: string,
    section: LayoutSection
  ): Promise<any> {
    const layout = await this.getLayoutById(id);
    if (!layout) {
      throw new Error('Layout not found');
    }

    const sections = layout.sections as LayoutSection[];
    sections.push(section);

    return prisma.pageLayout.update({
      where: { id },
      data: {
        sections: sections as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Remove section from layout
   */
  async removeSection(id: string, sectionId: string): Promise<any> {
    const layout = await this.getLayoutById(id);
    if (!layout) {
      throw new Error('Layout not found');
    }

    const sections = (layout.sections as LayoutSection[]).filter(
      (s) => s.id !== sectionId
    );

    if (sections.length === 0) {
      throw new Error('Layout must have at least one section');
    }

    return prisma.pageLayout.update({
      where: { id },
      data: {
        sections: sections as any,
        updatedAt: new Date(),
      },
    });
  }
}

export const pageLayoutService = new PageLayoutService();
