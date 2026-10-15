-- CreateTable: Custom Entity Builder Models
-- This migration adds support for low-code custom entity creation

-- Custom Entity Definition
CREATE TABLE "CustomEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pluralName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL UNIQUE,
    "icon" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomEntity_name_tenantId_key" UNIQUE("name", "tenantId")
);

-- Custom Field Definition
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL, -- text, number, boolean, date, datetime, select, multiselect, reference, email, phone, url, textarea, richtext
    "dataType" TEXT NOT NULL, -- varchar, integer, decimal, boolean, date, timestamp, text, json
    "length" INTEGER,
    "precision" INTEGER,
    "scale" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" JSONB, -- For select/multiselect fields
    "validationRules" JSONB, -- min, max, pattern, custom
    "referenceEntity" TEXT, -- For reference fields
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "helpText" TEXT,
    "placeholder" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomField_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE,
    CONSTRAINT "CustomField_entityId_name_key" UNIQUE("entityId", "name")
);

-- Custom Entity Relationship
CREATE TABLE "CustomRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL, -- one_to_one, one_to_many, many_to_many
    "sourceFieldName" TEXT NOT NULL,
    "targetFieldName" TEXT,
    "cascadeDelete" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE,
    CONSTRAINT "CustomRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE
);

-- Custom Entity Layout (for form generation)
CREATE TABLE "CustomLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layoutType" TEXT NOT NULL, -- form, list, detail
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sections" JSONB NOT NULL, -- Array of sections with fields
    "columns" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomLayout_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE
);

-- Custom Entity View (for list views)
CREATE TABLE "CustomView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "columns" JSONB NOT NULL, -- Array of field names to display
    "filters" JSONB, -- Filter criteria
    "sortBy" TEXT,
    "sortOrder" TEXT DEFAULT 'asc',
    "pageSize" INTEGER DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomView_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE
);

-- Custom Entity Record (stores actual data)
CREATE TABLE "CustomEntityRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL, -- Stores all field values
    "tenantId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CustomEntityRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CustomEntity"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "CustomEntity_tenantId_idx" ON "CustomEntity"("tenantId");
CREATE INDEX "CustomEntity_isActive_idx" ON "CustomEntity"("isActive");
CREATE INDEX "CustomField_entityId_idx" ON "CustomField"("entityId");
CREATE INDEX "CustomField_fieldType_idx" ON "CustomField"("fieldType");
CREATE INDEX "CustomRelationship_sourceEntityId_idx" ON "CustomRelationship"("sourceEntityId");
CREATE INDEX "CustomRelationship_targetEntityId_idx" ON "CustomRelationship"("targetEntityId");
CREATE INDEX "CustomLayout_entityId_idx" ON "CustomLayout"("entityId");
CREATE INDEX "CustomView_entityId_idx" ON "CustomView"("entityId");
CREATE INDEX "CustomEntityRecord_entityId_idx" ON "CustomEntityRecord"("entityId");
CREATE INDEX "CustomEntityRecord_tenantId_idx" ON "CustomEntityRecord"("tenantId");
CREATE INDEX "CustomEntityRecord_data_idx" ON "CustomEntityRecord" USING GIN ("data");
