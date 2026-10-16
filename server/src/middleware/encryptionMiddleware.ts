import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../services/EncryptionService';

/**
 * Encryption Middleware
 * 
 * Provides transparent encryption/decryption for API requests and responses.
 * Automatically encrypts sensitive fields in responses and decrypts in requests.
 */

/**
 * Configuration for field-level encryption
 */
export interface EncryptionConfig {
  // Fields to encrypt in the response
  encryptFields?: string[];
  // Fields to decrypt in the request body
  decryptFields?: string[];
  // Whether to encrypt the entire response body
  encryptResponse?: boolean;
  // Whether to decrypt the entire request body
  decryptRequest?: boolean;
}

/**
 * Middleware to encrypt response data
 */
export const encryptResponse = (config: EncryptionConfig = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      try {
        let processedBody = body;

        // Encrypt entire response if configured
        if (config.encryptResponse && body) {
          const encrypted = encryptionService.encrypt(JSON.stringify(body));
          processedBody = {
            encrypted: true,
            data: encrypted,
          };
        }
        // Encrypt specific fields if configured
        else if (config.encryptFields && config.encryptFields.length > 0 && body) {
          processedBody = encryptFields(body, config.encryptFields);
        }

        return originalJson(processedBody);
      } catch (error) {
        console.error('Error encrypting response:', error);
        return originalJson(body);
      }
    };

    next();
  };
};

/**
 * Middleware to decrypt request data
 */
export const decryptRequest = (config: EncryptionConfig = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Decrypt entire request body if configured
      if (config.decryptRequest && req.body?.encrypted) {
        const decrypted = encryptionService.decrypt(req.body.data);
        req.body = JSON.parse(decrypted);
      }
      // Decrypt specific fields if configured
      else if (config.decryptFields && config.decryptFields.length > 0 && req.body) {
        req.body = decryptFields(req.body, config.decryptFields);
      }

      next();
    } catch (error) {
      console.error('Error decrypting request:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to decrypt request data',
      });
    }
  };
};

/**
 * Encrypt specific fields in an object
 */
function encryptFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => encryptFields(item, fields));
  }

  const result = { ...obj };

  for (const field of fields) {
    if (field.includes('.')) {
      // Handle nested fields (e.g., 'user.email')
      const parts = field.split('.');
      const firstPart = parts[0];
      const remainingPath = parts.slice(1).join('.');

      if (result[firstPart]) {
        result[firstPart] = encryptFields(result[firstPart], [remainingPath]);
      }
    } else {
      // Handle direct fields
      if (result[field] !== null && result[field] !== undefined) {
        result[field] = encryptionService.encryptField(String(result[field]));
      }
    }
  }

  return result;
}

/**
 * Decrypt specific fields in an object
 */
function decryptFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => decryptFields(item, fields));
  }

  const result = { ...obj };

  for (const field of fields) {
    if (field.includes('.')) {
      // Handle nested fields (e.g., 'user.email')
      const parts = field.split('.');
      const firstPart = parts[0];
      const remainingPath = parts.slice(1).join('.');

      if (result[firstPart]) {
        result[firstPart] = decryptFields(result[firstPart], [remainingPath]);
      }
    } else {
      // Handle direct fields
      if (result[field] !== null && result[field] !== undefined) {
        try {
          result[field] = encryptionService.decryptField(String(result[field]));
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
  }

  return result;
}

/**
 * Middleware to encrypt sensitive user data in responses
 */
export const encryptUserData = encryptResponse({
  encryptFields: [
    'email',
    'phone',
    'address',
    'taxId',
    'bankAccount',
    'ssn',
    'passport',
  ],
});

/**
 * Middleware to encrypt financial data in responses
 */
export const encryptFinancialData = encryptResponse({
  encryptFields: [
    'accountNumber',
    'routingNumber',
    'cardNumber',
    'cvv',
    'bankAccount',
    'taxId',
  ],
});

/**
 * Middleware to encrypt health data in responses (HIPAA compliance)
 */
export const encryptHealthData = encryptResponse({
  encryptFields: [
    'medicalRecordNumber',
    'diagnosis',
    'prescription',
    'labResults',
    'insuranceNumber',
  ],
});

/**
 * Middleware to decrypt sensitive data in requests
 */
export const decryptSensitiveData = decryptRequest({
  decryptFields: [
    'email',
    'phone',
    'address',
    'taxId',
    'bankAccount',
    'ssn',
    'passport',
    'accountNumber',
    'routingNumber',
    'cardNumber',
  ],
});
