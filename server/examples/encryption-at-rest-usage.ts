/**
 * Encryption at Rest - Usage Examples
 * Task 38.2: Demonstrates how to use encryption at rest features
 * 
 * This file shows practical examples of:
 * - Encrypting sensitive data
 * - Transparent data encryption
 * - Field-level encryption
 * - Key management
 * - Key rotation
 */

import { EncryptionService, TransparentDataEncryption, FieldEncryption } from '../src/services/encryption.service';
import { KeyManagementService, KeyType } from '../src/services/key-management.service';
import { keyRotationScheduler } from '../src/services/key-rotation.scheduler';

/**
 * Example 1: Basic Encryption/Decryption
 */
async function basicEncryptionExample() {
  console.log('\n=== Example 1: Basic Encryption ===\n');

  // Encrypt sensitive data
  const sensitiveData = 'Customer credit card: 4532-1234-5678-9010';
  const encrypted = await EncryptionService.encrypt(sensitiveData);

  console.log('Original:', sensitiveData);
  console.log('Encrypted:', encrypted.ciphertext.substring(0, 50) + '...');
  console.log('Key ID:', encrypted.keyId);
  console.log('Algorithm:', encrypted.algorithm);

  // Decrypt data
  const decrypted = await EncryptionService.decrypt(encrypted);
  console.log('Decrypted:', decrypted.toString('utf8'));
}

/**
 * Example 2: String Encryption (Convenience Method)
 */
async function stringEncryptionExample() {
  console.log('\n=== Example 2: String Encryption ===\n');

  const email = 'user@example.com';
  
  // Encrypt string (returns JSON string)
  const encrypted = await EncryptionService.encryptString(email);
  console.log('Encrypted email:', encrypted.substring(0, 100) + '...');

  // Decrypt string
  const decrypted = await EncryptionService.decryptString(encrypted);
  console.log('Decrypted email:', decrypted);
}

/**
 * Example 3: Object Encryption
 */
async function objectEncryptionExample() {
  console.log('\n=== Example 3: Object Encryption ===\n');

  const user = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
  };

  // Encrypt entire object
  const encrypted = await EncryptionService.encryptObject(user);
  console.log('Encrypted object:', encrypted.substring(0, 100) + '...');

  // Decrypt object
  const decrypted = await EncryptionService.decryptObject(encrypted);
  console.log('Decrypted object:', decrypted);
}

/**
 * Example 4: Transparent Data Encryption (TDE)
 */
async function transparentEncryptionExample() {
  console.log('\n=== Example 4: Transparent Data Encryption ===\n');

  const employee = {
    id: 'emp-456',
    name: 'Jane Smith',
    email: 'jane@company.com',
    ssn: '123-45-6789',
    salary: 75000,
    department: 'Engineering',
  };

  console.log('Original employee:', employee);

  // Encrypt only sensitive fields
  const encrypted = await TransparentDataEncryption.encryptFields(
    employee,
    ['email', 'ssn', 'salary']
  );

  console.log('\nEncrypted employee:');
  console.log('  ID:', encrypted.id);
  console.log('  Name:', encrypted.name);
  console.log('  Email:', encrypted.email.substring(0, 50) + '...');
  console.log('  SSN:', encrypted.ssn.substring(0, 50) + '...');
  console.log('  Salary:', encrypted.salary.substring(0, 50) + '...');
  console.log('  Department:', encrypted.department);

  // Decrypt sensitive fields
  const decrypted = await TransparentDataEncryption.decryptFields(
    encrypted,
    ['email', 'ssn', 'salary']
  );

  console.log('\nDecrypted employee:', decrypted);
}

/**
 * Example 5: Field-Level Encryption for PCI/PII Data
 */
async function fieldLevelEncryptionExample() {
  console.log('\n=== Example 5: Field-Level Encryption ===\n');

  // Credit card encryption
  const cardNumber = '4532-1234-5678-9010';
  const encryptedCard = await FieldEncryption.encryptCreditCard(cardNumber);
  console.log('Credit Card:');
  console.log('  Original:', cardNumber);
  console.log('  Encrypted:', encryptedCard.substring(0, 50) + '...');
  console.log('  Masked:', FieldEncryption.maskSensitiveData(cardNumber));

  // SSN encryption
  const ssn = '123-45-6789';
  const encryptedSSN = await FieldEncryption.encryptSSN(ssn);
  console.log('\nSSN:');
  console.log('  Original:', ssn);
  console.log('  Encrypted:', encryptedSSN.substring(0, 50) + '...');
  console.log('  Masked:', FieldEncryption.maskSensitiveData(ssn));

  // Bank account encryption
  const accountNumber = '9876543210';
  const encryptedAccount = await FieldEncryption.encryptBankAccount(accountNumber);
  console.log('\nBank Account:');
  console.log('  Original:', accountNumber);
  console.log('  Encrypted:', encryptedAccount.substring(0, 50) + '...');
  console.log('  Masked:', FieldEncryption.maskSensitiveData(accountNumber));
}

/**
 * Example 6: Encrypting Arrays of Objects
 */
async function arrayEncryptionExample() {
  console.log('\n=== Example 6: Array Encryption ===\n');

  const customers = [
    { id: '1', name: 'Alice', email: 'alice@example.com', phone: '555-0001' },
    { id: '2', name: 'Bob', email: 'bob@example.com', phone: '555-0002' },
    { id: '3', name: 'Charlie', email: 'charlie@example.com', phone: '555-0003' },
  ];

  console.log('Original customers:', customers.length, 'records');

  // Encrypt sensitive fields in all records
  const encrypted = await TransparentDataEncryption.encryptArray(
    customers,
    ['email', 'phone']
  );

  console.log('\nEncrypted customers:');
  encrypted.forEach((customer, index) => {
    console.log(`  ${index + 1}. ${customer.name} - Email: ${customer.email.substring(0, 30)}...`);
  });

  // Decrypt all records
  const decrypted = await TransparentDataEncryption.decryptArray(
    encrypted,
    ['email', 'phone']
  );

  console.log('\nDecrypted customers:', decrypted);
}

/**
 * Example 7: Key Management
 */
async function keyManagementExample() {
  console.log('\n=== Example 7: Key Management ===\n');

  // Get current key status
  const status = await EncryptionService.getKeyStatus();
  console.log('Current Encryption Key:');
  console.log('  Key ID:', status.currentKeyId);
  console.log('  Expires:', status.expiresAt.toISOString());
  console.log('  Days until expiry:', status.daysUntilExpiry);
  console.log('  Should rotate:', status.shouldRotate);
  console.log('  Total keys:', status.totalKeys);

  // Get all active keys
  const activeKeys = await KeyManagementService.getAllActiveKeys();
  console.log('\nActive Keys:', activeKeys.length);
  activeKeys.forEach(key => {
    console.log(`  - ${key.id} (${key.type}, expires: ${key.expiresAt.toISOString()})`);
  });

  // Get key usage statistics
  if (activeKeys.length > 0) {
    const stats = await KeyManagementService.getKeyUsageStats(activeKeys[0].id);
    console.log('\nKey Usage Statistics:');
    console.log('  Total usage:', stats.totalUsage);
    console.log('  Last 24 hours:', stats.last24Hours);
    console.log('  Last 7 days:', stats.last7Days);
    console.log('  Last 30 days:', stats.last30Days);
  }
}

/**
 * Example 8: Key Rotation
 */
async function keyRotationExample() {
  console.log('\n=== Example 8: Key Rotation ===\n');

  // Get current key
  const beforeStatus = await EncryptionService.getKeyStatus();
  console.log('Before rotation:');
  console.log('  Current key:', beforeStatus.currentKeyId);
  console.log('  Total keys:', beforeStatus.totalKeys);

  // Encrypt data with current key
  const data = 'Data encrypted before rotation';
  const encryptedBefore = await EncryptionService.encrypt(data);
  console.log('  Encrypted with key:', encryptedBefore.keyId);

  // Rotate key
  console.log('\nRotating encryption key...');
  await EncryptionService.rotateEncryptionKey();

  // Get new key status
  const afterStatus = await EncryptionService.getKeyStatus();
  console.log('\nAfter rotation:');
  console.log('  Current key:', afterStatus.currentKeyId);
  console.log('  Total keys:', afterStatus.totalKeys);

  // Encrypt new data with new key
  const encryptedAfter = await EncryptionService.encrypt('Data encrypted after rotation');
  console.log('  New data encrypted with key:', encryptedAfter.keyId);

  // Verify old data can still be decrypted
  const decryptedOld = await EncryptionService.decrypt(encryptedBefore);
  console.log('\nOld data still decryptable:', decryptedOld.toString('utf8'));

  // Re-encrypt old data with new key
  const reencrypted = await EncryptionService.reencrypt(encryptedBefore);
  console.log('Re-encrypted with new key:', reencrypted.keyId);
}

/**
 * Example 9: Key Rotation Scheduler
 */
async function keyRotationSchedulerExample() {
  console.log('\n=== Example 9: Key Rotation Scheduler ===\n');

  // Get scheduler status
  const status = keyRotationScheduler.getStatus();
  console.log('Scheduler Status:');
  console.log('  Running:', status.isRunning);
  console.log('  Check interval:', status.config.checkIntervalHours, 'hours');
  console.log('  Warning threshold:', status.config.warningThresholdDays, 'days');
  console.log('  Auto-rotate:', status.config.autoRotate);
  if (status.nextCheckTime) {
    console.log('  Next check:', status.nextCheckTime.toISOString());
  }

  // Force immediate check (manual trigger)
  console.log('\nForcing immediate key rotation check...');
  await keyRotationScheduler.forceCheck();
  console.log('Check completed');

  // Update scheduler configuration
  console.log('\nUpdating scheduler configuration...');
  keyRotationScheduler.updateConfig({
    checkIntervalHours: 12, // Check twice daily
    warningThresholdDays: 5, // Warn 5 days before expiry
  });
  console.log('Configuration updated');
}

/**
 * Example 10: Dashboard Data
 */
async function dashboardExample() {
  console.log('\n=== Example 10: Key Management Dashboard ===\n');

  const dashboard = await KeyManagementService.getDashboardData();

  console.log('Key Management Dashboard:');
  console.log('  Total keys:', dashboard.totalKeys);
  console.log('  Active keys:', dashboard.activeKeys);
  console.log('  Expired keys:', dashboard.expiredKeys);
  console.log('  Expiring keys:', dashboard.expiringKeys);
  console.log('  Revoked keys:', dashboard.revokedKeys);

  console.log('\nRotation Policy:');
  console.log('  Enabled:', dashboard.rotationPolicy.enabled);
  console.log('  Interval:', dashboard.rotationPolicy.intervalDays, 'days');
  console.log('  Warning threshold:', dashboard.rotationPolicy.warningThresholdDays, 'days');
  console.log('  Auto-rotate:', dashboard.rotationPolicy.autoRotate);

  console.log('\nRecent Activity:');
  dashboard.recentActivity.slice(0, 5).forEach((activity, index) => {
    console.log(`  ${index + 1}. ${activity.eventType} - ${activity.timestamp.toISOString()}`);
  });
}

/**
 * Example 11: Database Integration (Prisma Middleware)
 */
function databaseIntegrationExample() {
  console.log('\n=== Example 11: Database Integration ===\n');

  console.log('To use transparent encryption with Prisma:');
  console.log(`
// In your server.ts or prisma configuration:
import { createEncryptionMiddleware } from './middleware/encryption.middleware';
import prisma from './config/prisma';

// Add encryption middleware
prisma.$use(createEncryptionMiddleware());

// Now all configured fields will be automatically encrypted/decrypted:
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com', // Will be encrypted
    password: 'hashed_password', // Will be encrypted
  },
});

// Email is automatically decrypted when reading
console.log(user.email); // 'john@example.com'

// Configure which fields to encrypt in middleware/encryption.middleware.ts:
const ENCRYPTED_FIELDS = {
  User: ['password'],
  Employee: ['ssn', 'taxId', 'bankAccountNumber'],
  Customer: ['creditCardNumber', 'bankAccountNumber'],
  // ... add more models and fields
};
  `);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Encryption at Rest - Usage Examples (Task 38.2)     ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Initialize encryption services
    console.log('\nInitializing encryption services...');
    await EncryptionService.initialize();
    await KeyManagementService.initialize();
    console.log('✅ Encryption services initialized\n');

    // Run examples
    await basicEncryptionExample();
    await stringEncryptionExample();
    await objectEncryptionExample();
    await transparentEncryptionExample();
    await fieldLevelEncryptionExample();
    await arrayEncryptionExample();
    await keyManagementExample();
    await keyRotationExample();
    await keyRotationSchedulerExample();
    await dashboardExample();
    databaseIntegrationExample();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              All Examples Completed! ✅                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export {
  basicEncryptionExample,
  stringEncryptionExample,
  objectEncryptionExample,
  transparentEncryptionExample,
  fieldLevelEncryptionExample,
  arrayEncryptionExample,
  keyManagementExample,
  keyRotationExample,
  keyRotationSchedulerExample,
  dashboardExample,
  databaseIntegrationExample,
};
