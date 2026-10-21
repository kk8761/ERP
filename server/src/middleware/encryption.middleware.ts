/**
 * Encryption Middleware for Prisma
 * Task 38.2: Implement transparent data encryption at database level
 * 
 * Automatically encrypts/decrypts sensitive fields when reading/writing to database
 */

import { Prisma } from '@prisma/client';
import { EncryptionService } from '../services/encryption.service';

/**
 * Configuration for fields that should be encrypted
 * Maps table names to arrays of field names
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['password'], // Already hashed, but can add other sensitive fields
  Employee: ['ssn', 'taxId', 'bankAccountNumber'],
  Customer: ['creditCardNumber', 'bankAccountNumber', 'taxId'],
  Vendor: ['bankAccountNumber', 'taxId'],
  BankAccount: ['accountNumber', 'routingNumber'],
  PaymentMethod: ['cardNumber', 'cvv'],
  Salary: ['amount', 'bankAccountNumber'],
  Contract: ['confidentialTerms'],
  Document: ['encryptedContent'], // For documents marked as confidential
  ApiKey: ['keyValue'], // API keys should be encrypted
  MFA: ['secret'], // MFA secrets
};

/**
 * Fields that should be masked when displayed (show last 4 digits only)
 */
const MASKED_FIELDS: Record<string, string[]> = {
  Customer: ['creditCardNumber', 'bankAccountNumber'],
  Employee: ['ssn', 'bankAccountNumber'],
  Vendor: ['bankAccountNumber'],
  BankAccount: ['accountNumber'],
  PaymentMethod: ['cardNumber'],
};

/**
 * Create encryption middleware for Prisma
 */
export function createEncryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    
    if (!model || !ENCRYPTED_FIELDS[model]) {
      return next(params);
    }

    const sensitiveFields = ENCRYPTED_FIELDS[model];

    // Encrypt data before write operations
    if (
      params.action === 'create' ||
      params.action === 'update' ||
      params.action === 'upsert' ||
      params.action === 'createMany' ||
      params.action === 'updateMany'
    ) {
      await encryptBeforeWrite(params, sensitiveFields);
    }

    // Execute the query
    const result = await next(params);

    // Decrypt data after read operations
    if (
      params.action === 'findUnique' ||
      params.action === 'findFirst' ||
      params.action === 'findMany' ||
      params.action === 'create' ||
      params.action === 'update' ||
      params.action === 'upsert'
    ) {
      await decryptAfterRead(result, model, sensitiveFields);
    }

    return result;
  };
}

/**
 * Encrypt sensitive fields before writing to database
 */
async function encryptBeforeWrite(
  params: Prisma.MiddlewareParams,
  sensitiveFields: string[]
): Promise<void> {
  if (!params.args) return;

  // Handle different operation types
  if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
    const data = params.args.data;
    if (data) {
      await encryptFields(data, sensitiveFields);
    }

    // Handle upsert create and update separately
    if (params.action === 'upsert') {
      if (params.args.create) {
        await encryptFields(params.args.create, sensitiveFields);
      }
      if (params.args.update) {
        await encryptFields(params.args.update, sensitiveFields);
      }
    }
  } else if (params.action === 'createMany') {
    const data = params.args.data;
    if (Array.isArray(data)) {
      for (const item of data) {
        await encryptFields(item, sensitiveFields);
      }
    }
  } else if (params.action === 'updateMany') {
    const data = params.args.data;
    if (data) {
      await encryptFields(data, sensitiveFields);
    }
  }
}

/**
 * Encrypt individual fields in an object
 */
async function encryptFields(obj: any, fields: string[]): Promise<void> {
  for (const field of fields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      // Skip if already encrypted (check for JSON structure)
      if (typeof obj[field] === 'string' && isEncryptedData(obj[field])) {
        continue;
      }

      try {
        obj[field] = await EncryptionService.encryptString(String(obj[field]));
      } catch (error) {
        console.error(`Failed to encrypt field ${field}:`, error);
        throw new Error(`Encryption failed for field: ${field}`);
      }
    }
  }
}

/**
 * Decrypt sensitive fields after reading from database
 */
async function decryptAfterRead(
  result: any,
  model: string,
  sensitiveFields: string[]
): Promise<void> {
  if (!result) return;

  // Handle array results
  if (Array.isArray(result)) {
    for (const item of result) {
      await decryptFields(item, sensitiveFields);
      applyMasking(item, model);
    }
  } else {
    // Handle single object result
    await decryptFields(result, sensitiveFields);
    applyMasking(result, model);
  }
}

/**
 * Decrypt individual fields in an object
 */
async function decryptFields(obj: any, fields: string[]): Promise<void> {
  if (!obj || typeof obj !== 'object') return;

  for (const field of fields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      try {
        // Check if the field is encrypted
        if (typeof obj[field] === 'string' && isEncryptedData(obj[field])) {
          obj[field] = await EncryptionService.decryptString(obj[field]);
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }
}

/**
 * Check if a string is encrypted data (JSON format)
 */
function isEncryptedData(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      parsed.ciphertext &&
      parsed.iv &&
      parsed.authTag &&
      parsed.keyId &&
      parsed.algorithm
    );
  } catch {
    return false;
  }
}

/**
 * Apply masking to sensitive fields for display
 */
function applyMasking(obj: any, model: string): void {
  if (!obj || typeof obj !== 'object') return;

  const maskedFields = MASKED_FIELDS[model];
  if (!maskedFields) return;

  for (const field of maskedFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      // Add a masked version for display
      obj[`${field}Masked`] = maskSensitiveData(obj[field]);
    }
  }
}

/**
 * Mask sensitive data (show last 4 characters only)
 */
function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  const masked = '*'.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  return masked + visible;
}

/**
 * Utility function to manually encrypt a field value
 */
export async function encryptFieldValue(value: string): Promise<string> {
  return EncryptionService.encryptString(value);
}

/**
 * Utility function to manually decrypt a field value
 */
export async function decryptFieldValue(encryptedValue: string): Promise<string> {
  return EncryptionService.decryptString(encryptedValue);
}

/**
 * Get list of encrypted fields for a model
 */
export function getEncryptedFields(model: string): string[] {
  return ENCRYPTED_FIELDS[model] || [];
}

/**
 * Check if a field is encrypted for a model
 */
export function isFieldEncrypted(model: string, field: string): boolean {
  const fields = ENCRYPTED_FIELDS[model];
  return fields ? fields.includes(field) : false;
}

/**
 * Add encrypted field configuration dynamically
 */
export function addEncryptedField(model: string, field: string): void {
  if (!ENCRYPTED_FIELDS[model]) {
    ENCRYPTED_FIELDS[model] = [];
  }
  if (!ENCRYPTED_FIELDS[model].includes(field)) {
    ENCRYPTED_FIELDS[model].push(field);
  }
}

/**
 * Remove encrypted field configuration
 */
export function removeEncryptedField(model: string, field: string): void {
  if (ENCRYPTED_FIELDS[model]) {
    ENCRYPTED_FIELDS[model] = ENCRYPTED_FIELDS[model].filter(f => f !== field);
  }
}

/**
 * Get encryption configuration
 */
export function getEncryptionConfig(): Record<string, string[]> {
  return { ...ENCRYPTED_FIELDS };
}
