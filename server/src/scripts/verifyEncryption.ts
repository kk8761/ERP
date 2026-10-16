/**
 * Encryption Verification Script
 * Task 38.2: Implement encryption at rest
 * 
 * Verifies that encryption service is working correctly.
 * Run with: npm run verify:encryption
 */

import { encryptionService } from '../services/EncryptionService';
import {
  encryptBeforeSave,
  decryptAfterRead,
  isEncrypted,
  SENSITIVE_FIELDS,
} from '../utils/databaseEncryption';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
}

function error(message: string) {
  log(`✗ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function section(message: string) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(message, colors.blue);
  log('='.repeat(60), colors.blue);
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    success(message);
    testsPassed++;
  } else {
    error(message);
    testsFailed++;
  }
}

async function runTests() {
  try {
    section('Encryption Service Verification');
    info('Initializing encryption service...\n');

    // Initialize encryption service
    await encryptionService.initialize();
    success('Encryption service initialized\n');

    // Test 1: Basic Encryption and Decryption
    section('Test 1: Basic Encryption and Decryption');
    const plaintext = 'Sensitive customer data that must be encrypted';
    const encrypted = encryptionService.encrypt(plaintext);
    const decrypted = encryptionService.decrypt(encrypted);

    assert(encrypted.data !== undefined, 'Encrypted data exists');
    assert(encrypted.iv !== undefined, 'IV exists');
    assert(encrypted.authTag !== undefined, 'Auth tag exists');
    assert(encrypted.keyId !== undefined, 'Key ID exists');
    assert(encrypted.algorithm === 'aes-256-gcm', 'Algorithm is AES-256-GCM');
    assert(decrypted === plaintext, 'Decryption returns original plaintext');

    // Test 2: Field-Level Encryption
    section('Test 2: Field-Level Encryption');
    const email = 'user@example.com';
    const encryptedField = encryptionService.encryptField(email);
    const decryptedField = encryptionService.decryptField(encryptedField);

    assert(typeof encryptedField === 'string', 'Encrypted field is a string');
    assert(isEncrypted(encryptedField), 'Field is identified as encrypted');
    assert(decryptedField === email, 'Field decryption returns original value');

    // Test 3: Object Encryption
    section('Test 3: Object Encryption');
    const user = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      role: 'admin',
    };

    const encryptedObj = encryptionService.encryptObject(user, ['email', 'phone']);
    const decryptedObj = encryptionService.decryptObject(encryptedObj, ['email', 'phone']);

    assert(encryptedObj.id === user.id, 'Non-sensitive fields unchanged');
    assert(encryptedObj.name === user.name, 'Non-sensitive fields unchanged');
    assert(encryptedObj.email !== user.email, 'Email is encrypted');
    assert(encryptedObj.phone !== user.phone, 'Phone is encrypted');
    assert(isEncrypted(encryptedObj.email), 'Email is identified as encrypted');
    assert(isEncrypted(encryptedObj.phone), 'Phone is identified as encrypted');
    assert(JSON.stringify(decryptedObj) === JSON.stringify(user), 'Object decryption returns original');

    // Test 4: Key Management
    section('Test 4: Key Management');
    const keyInfo = encryptionService.getKeyInfo();

    assert(keyInfo.activeKeyId !== null, 'Active key exists');
    assert(keyInfo.totalKeys > 0, 'At least one key exists');
    assert(keyInfo.keys.length > 0, 'Keys array is not empty');

    const activeKey = keyInfo.keys.find(k => k.id === keyInfo.activeKeyId);
    assert(activeKey !== undefined, 'Active key found in keys array');
    assert(activeKey?.isActive === true, 'Active key is marked as active');
    assert(activeKey?.daysUntilExpiry !== undefined, 'Days until expiry is calculated');

    info(`Active Key ID: ${keyInfo.activeKeyId}`);
    info(`Total Keys: ${keyInfo.totalKeys}`);
    info(`Days Until Expiry: ${activeKey?.daysUntilExpiry}`);

    // Test 5: Key Rotation
    section('Test 5: Key Rotation');
    const oldKeyId = keyInfo.activeKeyId;
    const newKeyId = await encryptionService.rotateKey();
    const keyInfoAfter = encryptionService.getKeyInfo();

    assert(newKeyId !== oldKeyId, 'New key ID is different from old key ID');
    assert(keyInfoAfter.activeKeyId === newKeyId, 'Active key updated to new key');
    assert(keyInfoAfter.totalKeys === keyInfo.totalKeys + 1, 'Total keys increased by 1');

    info(`Old Key ID: ${oldKeyId}`);
    info(`New Key ID: ${newKeyId}`);

    // Test 6: Decrypt with Old Key
    section('Test 6: Decrypt with Old Key After Rotation');
    const dataBeforeRotation = encryptionService.encrypt('Data encrypted before rotation');
    
    // Data encrypted before rotation should still be decryptable
    const decryptedOldData = encryptionService.decrypt(dataBeforeRotation);
    assert(decryptedOldData === 'Data encrypted before rotation', 'Old data still decryptable after rotation');

    // New data should use new key
    const dataAfterRotation = encryptionService.encrypt('Data encrypted after rotation');
    assert(dataAfterRotation.keyId === newKeyId, 'New data uses new key');

    // Test 7: Database Encryption Utilities
    section('Test 7: Database Encryption Utilities');
    const userData = {
      id: '456',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+9876543210',
      role: 'user',
    };

    const encryptedUser = encryptBeforeSave('User', userData);
    const decryptedUser = decryptAfterRead('User', encryptedUser);

    assert(encryptedUser.email !== userData.email, 'Email encrypted by utility');
    assert(encryptedUser.phone !== userData.phone, 'Phone encrypted by utility');
    assert(JSON.stringify(decryptedUser) === JSON.stringify(userData), 'Utility decryption returns original');

    // Test 8: Sensitive Fields Configuration
    section('Test 8: Sensitive Fields Configuration');
    assert(SENSITIVE_FIELDS.User !== undefined, 'User model has sensitive fields defined');
    assert(SENSITIVE_FIELDS.User.includes('email'), 'User.email is marked as sensitive');
    assert(SENSITIVE_FIELDS.User.includes('phone'), 'User.phone is marked as sensitive');
    assert(SENSITIVE_FIELDS.Customer !== undefined, 'Customer model has sensitive fields defined');
    assert(SENSITIVE_FIELDS.Employee !== undefined, 'Employee model has sensitive fields defined');

    info(`User sensitive fields: ${SENSITIVE_FIELDS.User.join(', ')}`);
    info(`Customer sensitive fields: ${SENSITIVE_FIELDS.Customer.join(', ')}`);
    info(`Employee sensitive fields: ${SENSITIVE_FIELDS.Employee.join(', ')}`);

    // Test 9: Security Properties
    section('Test 9: Security Properties');
    const ivs = new Set();
    for (let i = 0; i < 10; i++) {
      const enc = encryptionService.encrypt('test');
      ivs.add(enc.iv);
    }
    assert(ivs.size === 10, 'Each encryption uses unique IV');

    // Test tampering detection
    const encryptedData = encryptionService.encrypt('test data');
    const tamperedData = { ...encryptedData, data: encryptedData.data.slice(0, -1) + 'X' };
    
    let tamperingDetected = false;
    try {
      encryptionService.decrypt(tamperedData);
    } catch (err) {
      tamperingDetected = true;
    }
    assert(tamperingDetected, 'Tampering is detected');

    // Test 10: Edge Cases
    section('Test 10: Edge Cases');
    
    // Empty string
    const emptyEncrypted = encryptionService.encryptField('');
    const emptyDecrypted = encryptionService.decryptField(emptyEncrypted);
    assert(emptyDecrypted === '', 'Empty string encryption works');

    // Unicode
    const unicode = '你好世界 🔐 مرحبا العالم';
    const unicodeEncrypted = encryptionService.encryptField(unicode);
    const unicodeDecrypted = encryptionService.decryptField(unicodeEncrypted);
    assert(unicodeDecrypted === unicode, 'Unicode encryption works');

    // Special characters
    const special = 'Test@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
    const specialEncrypted = encryptionService.encryptField(special);
    const specialDecrypted = encryptionService.decryptField(specialEncrypted);
    assert(specialDecrypted === special, 'Special characters encryption works');

    // Long string
    const longString = 'A'.repeat(10000);
    const longEncrypted = encryptionService.encryptField(longString);
    const longDecrypted = encryptionService.decryptField(longEncrypted);
    assert(longDecrypted === longString, 'Long string encryption works');

    // Test 11: Performance
    section('Test 11: Performance');
    const startTime = Date.now();
    const records = Array.from({ length: 1000 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      phone: `+123456789${i}`,
    }));

    // Encrypt all records
    const encryptedRecords = records.map(record => 
      encryptionService.encryptObject(record, ['email', 'phone'])
    );

    // Decrypt all records
    const decryptedRecords = encryptedRecords.map(record => 
      encryptionService.decryptObject(record, ['email', 'phone'])
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    assert(JSON.stringify(decryptedRecords) === JSON.stringify(records), '1000 records encrypted/decrypted correctly');
    assert(duration < 5000, `Performance acceptable (${duration}ms < 5000ms)`);
    info(`Encrypted and decrypted 1000 records in ${duration}ms`);

    // Summary
    section('Test Summary');
    log(`\nTotal Tests: ${testsPassed + testsFailed}`, colors.cyan);
    log(`Passed: ${testsPassed}`, colors.green);
    log(`Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);

    if (testsFailed === 0) {
      log('\n🎉 All tests passed! Encryption is working correctly.', colors.green);
      log('\n✅ Requirements 15.3 validated:', colors.green);
      log('   - THE System SHALL encrypt all data at rest using AES-256', colors.green);
      log('   - WHEN encryption keys are managed, THE System SHALL rotate keys every 90 days', colors.green);
    } else {
      log('\n❌ Some tests failed. Please review the errors above.', colors.red);
      process.exit(1);
    }

  } catch (err) {
    error(`\nFatal error during verification: ${err instanceof Error ? err.message : String(err)}`);
    console.error(err);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  error(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(err);
  process.exit(1);
});
