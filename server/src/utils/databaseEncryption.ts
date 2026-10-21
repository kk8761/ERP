import { encryptionService } from '../services/EncryptionService';

/**
 * Database Encryption Utilities
 * 
 * Provides transparent data encryption (TDE) for database fields.
 * Automatically encrypts/decrypts sensitive fields when reading/writing to database.
 */

/**
 * Sensitive field definitions by model
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  User: [
    'email',
    'phone',
    'address',
    'taxId',
    'ssn',
    'passport',
  ],
  Customer: [
    'email',
    'phone',
    'address',
    'taxId',
    'creditCardLast4',
  ],
  Employee: [
    'email',
    'phone',
    'address',
    'ssn',
    'bankAccount',
    'emergencyContact',
  ],
  BankAccount: [
    'accountNumber',
    'routingNumber',
    'swiftCode',
  ],
  PaymentMethod: [
    'cardNumber',
    'cvv',
    'accountNumber',
  ],
  Invoice: [
    'taxId',
    'bankAccount',
  ],
  Payroll: [
    'bankAccount',
    'taxId',
    'ssn',
  ],
  MedicalRecord: [
    'medicalRecordNumber',
    'diagnosis',
    'prescription',
    'labResults',
    'insuranceNumber',
  ],
  Contract: [
    'signedDocument',
    'confidentialTerms',
  ],
};

/**
 * Encrypt sensitive fields before saving to database
 */
export function encryptBeforeSave<T extends Record<string, any>>(
  modelName: string,
  data: T
): T {
  const sensitiveFields = SENSITIVE_FIELDS[modelName];
  
  if (!sensitiveFields || sensitiveFields.length === 0) {
    return data;
  }

  return encryptionService.encryptObject(data, sensitiveFields);
}

/**
 * Decrypt sensitive fields after reading from database
 */
export function decryptAfterRead<T extends Record<string, any>>(
  modelName: string,
  data: T
): T {
  const sensitiveFields = SENSITIVE_FIELDS[modelName];
  
  if (!sensitiveFields || sensitiveFields.length === 0) {
    return data;
  }

  return encryptionService.decryptObject(data, sensitiveFields);
}

/**
 * Encrypt array of records
 */
export function encryptRecords<T extends Record<string, any>>(
  modelName: string,
  records: T[]
): T[] {
  return records.map(record => encryptBeforeSave(modelName, record));
}

/**
 * Decrypt array of records
 */
export function decryptRecords<T extends Record<string, any>>(
  modelName: string,
  records: T[]
): T[] {
  return records.map(record => decryptAfterRead(modelName, record));
}

/**
 * Prisma middleware for transparent encryption
 * 
 * Usage in server.ts:
 * ```typescript
 * import { createEncryptionMiddleware } from './utils/databaseEncryption';
 * prisma.$use(createEncryptionMiddleware());
 * ```
 */
export function createEncryptionMiddleware() {
  return async (params: any, next: any) => {
    const modelName = params.model;

    // Encrypt data before create/update operations
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      if (params.args.data && modelName) {
        params.args.data = encryptBeforeSave(modelName, params.args.data);
      }
    }

    // Encrypt data in createMany
    if (params.action === 'createMany' && params.args.data && modelName) {
      params.args.data = encryptRecords(modelName, params.args.data);
    }

    // Execute the query
    const result = await next(params);

    // Decrypt data after read operations
    if (result && modelName) {
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        return decryptAfterRead(modelName, result);
      }

      if (params.action === 'findMany') {
        return decryptRecords(modelName, result);
      }

      if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
        return decryptAfterRead(modelName, result);
      }
    }

    return result;
  };
}

/**
 * Encrypt a specific field value
 */
export function encryptField(value: string): string {
  return encryptionService.encryptField(value);
}

/**
 * Decrypt a specific field value
 */
export function decryptField(encryptedValue: string): string {
  return encryptionService.decryptField(encryptedValue);
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      'iv' in parsed &&
      'authTag' in parsed &&
      'keyId' in parsed
    );
  } catch {
    return false;
  }
}

/**
 * Batch re-encrypt data with new key (for key rotation)
 */
export async function reencryptModelData(
  prisma: any,
  modelName: string,
  batchSize: number = 100
): Promise<number> {
  const sensitiveFields = SENSITIVE_FIELDS[modelName];
  
  if (!sensitiveFields || sensitiveFields.length === 0) {
    console.log(`No sensitive fields defined for model: ${modelName}`);
    return 0;
  }

  console.log(`Re-encrypting ${modelName} data...`);
  
  let processedCount = 0;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch batch of records
    const records = await prisma[modelName.toLowerCase()].findMany({
      take: batchSize,
      skip,
    });

    if (records.length === 0) {
      hasMore = false;
      break;
    }

    // Re-encrypt each record
    for (const record of records) {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of sensitiveFields) {
        if (record[field] && isEncrypted(record[field])) {
          try {
            // Decrypt with old key
            const decrypted = decryptField(record[field]);
            // Encrypt with new key
            updates[field] = encryptField(decrypted);
            needsUpdate = true;
          } catch (error) {
            console.error(`Failed to re-encrypt ${modelName}.${field} for record ${record.id}:`, error);
          }
        }
      }

      // Update record if any fields were re-encrypted
      if (needsUpdate) {
        await prisma[modelName.toLowerCase()].update({
          where: { id: record.id },
          data: updates,
        });
        processedCount++;
      }
    }

    skip += batchSize;
  }

  console.log(`✓ Re-encrypted ${processedCount} ${modelName} records`);
  return processedCount;
}

/**
 * Re-encrypt all sensitive data across all models
 */
export async function reencryptAllData(prisma: any): Promise<void> {
  console.log('Starting data re-encryption...');
  
  const startTime = Date.now();
  let totalRecords = 0;

  for (const modelName of Object.keys(SENSITIVE_FIELDS)) {
    try {
      const count = await reencryptModelData(prisma, modelName);
      totalRecords += count;
    } catch (error) {
      console.error(`Failed to re-encrypt ${modelName}:`, error);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✓ Data re-encryption complete. Processed ${totalRecords} records in ${duration}s`);
}
