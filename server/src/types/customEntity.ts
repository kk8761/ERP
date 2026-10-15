/**
 * Custom Entity Builder Types
 * Supports low-code entity creation with automatic database table, controller, view, and form generation
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'reference'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea'
  | 'richtext';

export type DataType =
  | 'varchar'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'text'
  | 'json';

export type RelationshipType = 'one_to_one' | 'one_to_many' | 'many_to_many';

export type LayoutType = 'form' | 'list' | 'detail';

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom' | 'minLength' | 'maxLength' | 'email' | 'url' | 'phone';
  value?: any;
  message?: string;
  customValidator?: string; // JavaScript function as string
}

export interface SelectOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

export interface CustomFieldDefinition {
  id?: string;
  entityId?: string;
  name: string;
  label: string;
  fieldType: FieldType;
  dataType: DataType;
  length?: number;
  precision?: number;
  scale?: number;
  isRequired?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  defaultValue?: string;
  options?: SelectOption[]; // For select/multiselect
  validationRules?: ValidationRule[];
  referenceEntity?: string; // For reference fields
  displayOrder?: number;
  helpText?: string;
  placeholder?: string;
  isActive?: boolean;
}

export interface CustomEntityDefinition {
  id?: string;
  name: string;
  pluralName: string;
  tableName?: string; // Auto-generated if not provided
  icon?: string;
  description?: string;
  isActive?: boolean;
  tenantId?: string;
  createdBy?: string;
  fields: CustomFieldDefinition[];
}

export interface CustomRelationshipDefinition {
  id?: string;
  name: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  sourceFieldName: string;
  targetFieldName?: string;
  cascadeDelete?: boolean;
  isActive?: boolean;
}

export interface LayoutSection {
  title: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: string[]; // Array of field names
}

export interface CustomLayoutDefinition {
  id?: string;
  entityId: string;
  name: string;
  layoutType: LayoutType;
  isDefault?: boolean;
  sections: LayoutSection[];
  columns?: number;
}

export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'isNull' | 'isNotNull';
  value?: any;
}

export interface CustomViewDefinition {
  id?: string;
  entityId: string;
  name: string;
  isDefault?: boolean;
  columns: string[]; // Array of field names
  filters?: FilterCriteria[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export interface CustomEntityRecordData {
  id?: string;
  entityId: string;
  data: Record<string, any>;
  tenantId?: string;
  createdBy?: string;
}

export interface GeneratedController {
  filePath: string;
  content: string;
}

export interface GeneratedRoute {
  filePath: string;
  content: string;
}

export interface GeneratedView {
  filePath: string;
  content: string;
}

export interface GeneratedForm {
  filePath: string;
  content: string;
}

export interface GeneratedMigration {
  filePath: string;
  content: string;
}

export interface EntityGenerationResult {
  entity: any; // CustomEntity from Prisma
  migration: GeneratedMigration;
  controller: GeneratedController;
  route: GeneratedRoute;
  views: GeneratedView[];
  forms: GeneratedForm[];
  success: boolean;
  errors?: string[];
}

export interface FieldTypeMapping {
  fieldType: FieldType;
  dataType: DataType;
  defaultLength?: number;
  defaultPrecision?: number;
  defaultScale?: number;
}

// Field type to data type mappings
export const FIELD_TYPE_MAPPINGS: Record<FieldType, FieldTypeMapping> = {
  text: { fieldType: 'text', dataType: 'varchar', defaultLength: 255 },
  number: { fieldType: 'number', dataType: 'decimal', defaultPrecision: 10, defaultScale: 2 },
  boolean: { fieldType: 'boolean', dataType: 'boolean' },
  date: { fieldType: 'date', dataType: 'date' },
  datetime: { fieldType: 'datetime', dataType: 'timestamp' },
  select: { fieldType: 'select', dataType: 'varchar', defaultLength: 100 },
  multiselect: { fieldType: 'multiselect', dataType: 'json' },
  reference: { fieldType: 'reference', dataType: 'varchar', defaultLength: 36 }, // UUID
  email: { fieldType: 'email', dataType: 'varchar', defaultLength: 255 },
  phone: { fieldType: 'phone', dataType: 'varchar', defaultLength: 50 },
  url: { fieldType: 'url', dataType: 'varchar', defaultLength: 500 },
  textarea: { fieldType: 'textarea', dataType: 'text' },
  richtext: { fieldType: 'richtext', dataType: 'text' },
};
