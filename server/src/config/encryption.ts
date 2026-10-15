/**
 * Encryption Configuration
 * Task 38.2: Implement encryption at rest with AES-256
 * 
 * Centralized configuration for encryption services including:
 * - AES-256-GCM encryption algorithm settings
 * - Key rotation policies (90-day rotation per Requirement 15.3)
 * - Key management provider configuration
 * - Sensitive field definitions for transparent data encryption
 */

/**
 * Encryption Algorithm Configuration
 */
export const ENCRYPTION_ALGORITHM = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits (recommended for GCM)
  authTagLength: 16, // 128 bits
  saltLength: 64,
  iterations: 100000, // PBKDF2 iterations
  digest: 'sha512' as const,
} as const;

/**
 * Key Rotation Policy Configuration
 * Per Requirement 15.3: "WHEN encryption keys are managed, THE System SHALL rotate keys every 90 days"
 */
export const KEY_ROTATION_POLICY = {
  enabled: process.env.ENCRYPTION_AUTO_ROTATE !== 'false',
  rotationIntervalDays: parseInt(process.env.ENCRYPTION_KEY_ROTATION_DAYS || '90', 10),
  warningThresholdDays: parseInt(process.env.ENCRYPTION_KEY_WARNING_DAYS || '7', 10),
  autoRotate: process.env.ENCRYPTION_AUTO_ROTATE !== 'false',
  retryAttempts: 3,
  retryDelayMinutes: 5,
} as const;

/**
 * Key Management Provider Configuration
 */
export const KEY_PROVIDER_CONFIG = {
  provider: (process.env.ENCRYPTION_KEY_PROVIDER || 'LOCAL') as 'LOCAL' | 'AWS_KMS' | 'AZURE_KEY_VAULT',
  
  // AWS KMS Configuration
  aws: {
    keyId: process.env.AWS_KMS_KEY_ID,
    region: process.env.AWS_KMS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Azure Key Vault Configuration
  azure: {
    vaultUrl: process.env.AZURE_KEY_VAULT_URL,
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
} as const;

/**
 * Master Encryption Key Configuration
 * 
 * SECURITY WARNING:
 * - In development: Generated automatically if not provided
 * - In production: MUST be provided via environment variable
 * - Best practice: Use AWS KMS, Azure Key Vault, or HashiCorp Vault
 */
export const MASTER_KEY_CONFIG = {
  key: process.env.MASTER_ENCRYPTION_KEY,
  required: process.env.NODE_ENV === 'production',
  keyLength: 32, // 256 bits
} as const;

/**
 * Sensitive Field Definitions for Transparent Data Encryption (TDE)
 * 
 * Maps database models to arrays of field names that should be encrypted at rest.
 * These fields are automatically encrypted before saving and decrypted after reading.
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  // User & Authentication
  User: [
    'email',
    'phone',
    'address',
    'taxId',
    'ssn',
    'passport',
  ],
  
  // Customer Data (PII Protection)
  Customer: [
    'email',
    'phone',
    'address',
    'taxId',
    'creditCardLast4',
    'bankAccountNumber',
  ],
  
  // Employee Data (PII & Payroll Protection)
  Employee: [
    'email',
    'phone',
    'address',
    'ssn',
    'taxId',
    'bankAccountNumber',
    'emergencyContact',
    'emergencyPhone',
  ],
  
  // Vendor Data
  Vendor: [
    'email',
    'phone',
    'address',
    'taxId',
    'bankAccountNumber',
  ],
  
  // Financial Data (PCI DSS Compliance)
  BankAccount: [
    'accountNumber',
    'routingNumber',
    'swiftCode',
    'ibanNumber',
  ],
  
  PaymentMethod: [
    'cardNumber',
    'cvv',
    'accountNumber',
  ],
  
  // Payroll Data
  Salary: [
    'amount',
    'bankAccountNumber',
  ],
  
  Payroll: [
    'bankAccountNumber',
    'taxId',
    'ssn',
    'netPay',
    'grossPay',
  ],
  
  // Healthcare Data (HIPAA Compliance)
  MedicalRecord: [
    'medicalRecordNumber',
    'diagnosis',
    'prescription',
    'labResults',
    'insuranceNumber',
    'patientNotes',
  ],
  
  // Legal & Contracts
  Contract: [
    'signedDocument',
    'confidentialTerms',
    'financialTerms',
  ],
  
  // Document Management
  Document: [
    'encryptedContent', // For documents marked as confidential
  ],
  
  // API & Security
  ApiKey: [
    'keyValue',
    'secret',
  ],
  
  MFA: [
    'secret',
    'backupCodes',
  ],
  
  // Invoice & Billing
  Invoice: [
    'taxId',
    'bankAccountNumber',
  ],
} as const;

/**
 * Fields that should be masked when displayed (show last N characters only)
 */
export const MASKED_FIELDS: Record<string, { field: string; visibleChars: number }[]> = {
  Customer: [
    { field: 'creditCardNumber', visibleChars: 4 },
    { field: 'bankAccountNumber', visibleChars: 4 },
    { field: 'ssn', visibleChars: 4 },
  ],
  
  Employee: [
    { field: 'ssn', visibleChars: 4 },
    { field: 'bankAccountNumber', visibleChars: 4 },
  ],
  
  Vendor: [
    { field: 'bankAccountNumber', visibleChars: 4 },
  ],
  
  BankAccount: [
    { field: 'accountNumber', visibleChars: 4 },
  ],
  
  PaymentMethod: [
    { field: 'cardNumber', visibleChars: 4 },
  ],
} as const;

/**
 * Encryption Service Configuration
 */
export const ENCRYPTION_SERVICE_CONFIG = {
  // Enable/disable encryption (for testing purposes only)
  enabled: process.env.ENCRYPTION_ENABLED !== 'false',
  
  // Key storage location (filesystem path for LOCAL provider)
  keysDirectory: process.env.ENCRYPTION_KEYS_DIR || './keys',
  
  // Key file names
  masterKeyFile: 'master.key',
  encryptionKeysFile: 'encryption.keys',
  
  // Key retention policy (days to keep expired keys for decryption)
  keyRetentionDays: 365,
  
  // Performance settings
  cacheKeyTTL: 3600, // Cache encryption keys for 1 hour
  batchSize: 100, // Batch size for re-encryption operations
} as const;

/**
 * Compliance & Audit Configuration
 */
export const COMPLIANCE_CONFIG = {
  // Log all encryption/decryption operations
  auditLogging: true,
  
  // Log key management events
  keyAuditLogging: true,
  
  // Minimum audit log retention (days)
  auditRetentionDays: 2555, // 7 years for compliance (SOX, GDPR)
  
  // Alert thresholds
  alerts: {
    keyExpiringDays: 7,
    keyRotationFailures: 3,
    decryptionFailures: 10,
  },
} as const;

/**
 * Encryption Performance Monitoring
 */
export const PERFORMANCE_CONFIG = {
  // Enable performance monitoring
  enabled: true,
  
  // Log slow operations (milliseconds)
  slowOperationThreshold: 100,
  
  // Sample rate for performance metrics (0.0 to 1.0)
  sampleRate: 0.1, // 10% of operations
} as const;

/**
 * Get encryption configuration summary
 */
export function getEncryptionConfig() {
  return {
    algorithm: ENCRYPTION_ALGORITHM.algorithm,
    keyRotationDays: KEY_ROTATION_POLICY.rotationIntervalDays,
    provider: KEY_PROVIDER_CONFIG.provider,
    autoRotate: KEY_ROTATION_POLICY.autoRotate,
    auditLogging: COMPLIANCE_CONFIG.auditLogging,
    totalSensitiveModels: Object.keys(SENSITIVE_FIELDS).length,
    totalSensitiveFields: Object.values(SENSITIVE_FIELDS).reduce(
      (sum, fields) => sum + fields.length,
      0
    ),
  };
}

/**
 * Validate encryption configuration
 */
export function validateEncryptionConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check master key in production
  if (MASTER_KEY_CONFIG.required && !MASTER_KEY_CONFIG.key) {
    errors.push('MASTER_ENCRYPTION_KEY is required in production');
  }

  // Check master key length
  if (MASTER_KEY_CONFIG.key) {
    const keyLength = Buffer.from(MASTER_KEY_CONFIG.key, 'hex').length;
    if (keyLength !== MASTER_KEY_CONFIG.keyLength) {
      errors.push(
        `MASTER_ENCRYPTION_KEY must be ${MASTER_KEY_CONFIG.keyLength * 2} hex characters (${MASTER_KEY_CONFIG.keyLength} bytes)`
      );
    }
  }

  // Check key provider configuration
  if (KEY_PROVIDER_CONFIG.provider === 'AWS_KMS') {
    if (!KEY_PROVIDER_CONFIG.aws.keyId) {
      errors.push('AWS_KMS_KEY_ID is required when using AWS_KMS provider');
    }
    if (!KEY_PROVIDER_CONFIG.aws.accessKeyId || !KEY_PROVIDER_CONFIG.aws.secretAccessKey) {
      warnings.push('AWS credentials not configured. Using IAM role or instance profile.');
    }
  }

  if (KEY_PROVIDER_CONFIG.provider === 'AZURE_KEY_VAULT') {
    if (!KEY_PROVIDER_CONFIG.azure.vaultUrl) {
      errors.push('AZURE_KEY_VAULT_URL is required when using AZURE_KEY_VAULT provider');
    }
    if (!KEY_PROVIDER_CONFIG.azure.tenantId || !KEY_PROVIDER_CONFIG.azure.clientId) {
      errors.push('Azure credentials are required when using AZURE_KEY_VAULT provider');
    }
  }

  // Warn about LOCAL provider in production
  if (process.env.NODE_ENV === 'production' && KEY_PROVIDER_CONFIG.provider === 'LOCAL') {
    warnings.push(
      'Using LOCAL key provider in production. Consider using AWS KMS or Azure Key Vault for better security.'
    );
  }

  // Check key rotation settings
  if (KEY_ROTATION_POLICY.rotationIntervalDays < 30) {
    warnings.push('Key rotation interval is less than 30 days. This may cause frequent rotations.');
  }

  if (KEY_ROTATION_POLICY.rotationIntervalDays > 365) {
    warnings.push('Key rotation interval is greater than 365 days. Consider rotating more frequently.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get sensitive fields for a model
 */
export function getSensitiveFields(modelName: string): string[] {
  return SENSITIVE_FIELDS[modelName] || [];
}

/**
 * Check if a field is sensitive for a model
 */
export function isFieldSensitive(modelName: string, fieldName: string): boolean {
  const fields = SENSITIVE_FIELDS[modelName];
  return fields ? fields.includes(fieldName) : false;
}

/**
 * Get masked fields configuration for a model
 */
export function getMaskedFields(modelName: string): { field: string; visibleChars: number }[] {
  return MASKED_FIELDS[modelName] || [];
}

/**
 * Export all configuration
 */
export default {
  algorithm: ENCRYPTION_ALGORITHM,
  keyRotation: KEY_ROTATION_POLICY,
  keyProvider: KEY_PROVIDER_CONFIG,
  masterKey: MASTER_KEY_CONFIG,
  sensitiveFields: SENSITIVE_FIELDS,
  maskedFields: MASKED_FIELDS,
  service: ENCRYPTION_SERVICE_CONFIG,
  compliance: COMPLIANCE_CONFIG,
  performance: PERFORMANCE_CONFIG,
  getConfig: getEncryptionConfig,
  validate: validateEncryptionConfig,
  getSensitiveFields,
  isFieldSensitive,
  getMaskedFields,
};
