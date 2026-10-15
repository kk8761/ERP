/**
 * Encryption Service Usage Examples
 * 
 * This file demonstrates various ways to use the encryption service
 * for protecting sensitive data in NexaERP.
 */

import { encryptionService } from '../src/services/EncryptionService';
import { 
  encryptBeforeSave, 
  decryptAfterRead,
  encryptRecords,
  decryptRecords 
} from '../src/utils/databaseEncryption';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Example 1: Basic Encryption and Decryption
// ============================================================================

async function example1_BasicEncryption() {
  console.log('\n=== Example 1: Basic Encryption ===\n');

  // Initialize encryption service
  await encryptionService.initialize();

  // Encrypt plaintext
  const plaintext = 'Sensitive customer data';
  const encrypted = encryptionService.encrypt(plaintext);

  console.log('Plaintext:', plaintext);
  console.log('Encrypted:', {
    keyId: encrypted.keyId,
    algorithm: encrypted.algorithm,
    dataLength: encrypted.data.length,
  });

  // Decrypt
  const decrypted = encryptionService.decrypt(encrypted);
  console.log('Decrypted:', decrypted);
  console.log('Match:', plaintext === decrypted);
}

// ============================================================================
// Example 2: Field-Level Encryption
// ============================================================================

async function example2_FieldEncryption() {
  console.log('\n=== Example 2: Field-Level Encryption ===\n');

  await encryptionService.initialize();

  // Encrypt individual fields
  const email = 'user@example.com';
  const phone = '+1234567890';

  const encryptedEmail = encryptionService.encryptField(email);
  const encryptedPhone = encryptionService.encryptField(phone);

  console.log('Original Email:', email);
  console.log('Encrypted Email:', encryptedEmail.substring(0, 50) + '...');

  // Decrypt fields
  const decryptedEmail = encryptionService.decryptField(encryptedEmail);
  const decryptedPhone = encryptionService.decryptField(encryptedPhone);

  console.log('Decrypted Email:', decryptedEmail);
  console.log('Decrypted Phone:', decryptedPhone);
}

// ============================================================================
// Example 3: Object Encryption
// ============================================================================

async function example3_ObjectEncryption() {
  console.log('\n=== Example 3: Object Encryption ===\n');

  await encryptionService.initialize();

  // User object with sensitive fields
  const user = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St, City, State 12345',
    role: 'admin',
  };

  console.log('Original User:', user);

  // Encrypt sensitive fields
  const encrypted = encryptionService.encryptObject(user, [
    'email',
    'phone',
    'address',
  ]);

  console.log('\nEncrypted User:', {
    ...encrypted,
    email: encrypted.email.substring(0, 50) + '...',
    phone: encrypted.phone.substring(0, 50) + '...',
    address: encrypted.address.substring(0, 50) + '...',
  });

  // Decrypt
  const decrypted = encryptionService.decryptObject(encrypted, [
    'email',
    'phone',
    'address',
  ]);

  console.log('\nDecrypted User:', decrypted);
  console.log('Match:', JSON.stringify(user) === JSON.stringify(decrypted));
}

// ============================================================================
// Example 4: Database Integration
// ============================================================================

async function example4_DatabaseIntegration() {
  console.log('\n=== Example 4: Database Integration ===\n');

  await encryptionService.initialize();

  // Create user with encrypted fields
  const userData = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+9876543210',
    address: '456 Oak Ave, Town, State 67890',
  };

  console.log('Original User Data:', userData);

  // Encrypt before saving
  const encrypted = encryptBeforeSave('User', userData);
  console.log('\nEncrypted for Database:', {
    ...encrypted,
    email: encrypted.email.substring(0, 50) + '...',
  });

  // Simulate database save
  // await prisma.user.create({ data: encrypted });

  // Simulate database read
  // const user = await prisma.user.findUnique({ where: { id: userId } });

  // Decrypt after reading
  const decrypted = decryptAfterRead('User', encrypted);
  console.log('\nDecrypted from Database:', decrypted);
}

// ============================================================================
// Example 5: Batch Encryption
// ============================================================================

async function example5_BatchEncryption() {
  console.log('\n=== Example 5: Batch Encryption ===\n');

  await encryptionService.initialize();

  // Multiple users
  const users = [
    { id: '1', name: 'User 1', email: 'user1@example.com' },
    { id: '2', name: 'User 2', email: 'user2@example.com' },
    { id: '3', name: 'User 3', email: 'user3@example.com' },
  ];

  console.log('Original Users:', users);

  // Encrypt all users
  const encrypted = encryptRecords('User', users);
  console.log('\nEncrypted Users:', encrypted.map(u => ({
    ...u,
    email: u.email.substring(0, 30) + '...',
  })));

  // Decrypt all users
  const decrypted = decryptRecords('User', encrypted);
  console.log('\nDecrypted Users:', decrypted);
}

// ============================================================================
// Example 6: Key Rotation
// ============================================================================

async function example6_KeyRotation() {
  console.log('\n=== Example 6: Key Rotation ===\n');

  await encryptionService.initialize();

  // Get current key info
  const beforeRotation = encryptionService.getKeyInfo();
  console.log('Before Rotation:');
  console.log('  Active Key ID:', beforeRotation.activeKeyId);
  console.log('  Total Keys:', beforeRotation.totalKeys);

  // Encrypt data with current key
  const plaintext = 'Data encrypted before rotation';
  const encrypted = encryptionService.encrypt(plaintext);
  console.log('\nEncrypted with key:', encrypted.keyId);

  // Rotate key
  const newKeyId = await encryptionService.rotateKey();
  console.log('\nKey Rotated!');
  console.log('  New Key ID:', newKeyId);

  // Get new key info
  const afterRotation = encryptionService.getKeyInfo();
  console.log('  Total Keys:', afterRotation.totalKeys);

  // Old data can still be decrypted
  const decrypted = encryptionService.decrypt(encrypted);
  console.log('\nOld data still decryptable:', decrypted === plaintext);

  // New data uses new key
  const newEncrypted = encryptionService.encrypt('New data');
  console.log('New data uses new key:', newEncrypted.keyId === newKeyId);

  // Re-encrypt old data with new key
  const reencrypted = await encryptionService.reencryptData(encrypted);
  console.log('\nRe-encrypted with new key:', reencrypted.keyId === newKeyId);
  console.log('Data still matches:', 
    encryptionService.decrypt(reencrypted) === plaintext
  );
}

// ============================================================================
// Example 7: Key Management
// ============================================================================

async function example7_KeyManagement() {
  console.log('\n=== Example 7: Key Management ===\n');

  await encryptionService.initialize();

  // Get key information
  const keyInfo = encryptionService.getKeyInfo();

  console.log('Key Information:');
  console.log('  Active Key ID:', keyInfo.activeKeyId);
  console.log('  Total Keys:', keyInfo.totalKeys);
  console.log('\nKey Details:');

  for (const key of keyInfo.keys) {
    console.log(`\n  Key ID: ${key.id}`);
    console.log(`  Created: ${key.createdAt.toISOString()}`);
    console.log(`  Expires: ${key.expiresAt.toISOString()}`);
    console.log(`  Days Until Expiry: ${key.daysUntilExpiry}`);
    console.log(`  Active: ${key.isActive ? '✓' : '✗'}`);
    
    if (key.daysUntilExpiry <= 7) {
      console.log(`  ⚠️  WARNING: Key expires soon!`);
    }
  }

  // Cleanup expired keys (keep for 365 days)
  const removedCount = await encryptionService.cleanupExpiredKeys(365);
  console.log(`\nCleaned up ${removedCount} expired keys`);
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

async function example8_ErrorHandling() {
  console.log('\n=== Example 8: Error Handling ===\n');

  await encryptionService.initialize();

  // Test 1: Tampered data
  try {
    const plaintext = 'Test data';
    const encrypted = encryptionService.encrypt(plaintext);
    
    // Tamper with encrypted data
    const tampered = { ...encrypted, data: encrypted.data + 'X' };
    
    encryptionService.decrypt(tampered);
    console.log('❌ Should have thrown error for tampered data');
  } catch (error) {
    console.log('✓ Correctly detected tampered data');
  }

  // Test 2: Invalid encrypted data
  try {
    encryptionService.decryptField('invalid-encrypted-data');
    console.log('❌ Should have thrown error for invalid data');
  } catch (error) {
    console.log('✓ Correctly detected invalid encrypted data');
  }

  // Test 3: Missing key
  try {
    const fakeEncrypted = {
      data: 'fake',
      iv: 'fake',
      authTag: 'fake',
      keyId: 'non-existent-key-id',
      algorithm: 'aes-256-gcm',
    };
    
    encryptionService.decrypt(fakeEncrypted);
    console.log('❌ Should have thrown error for missing key');
  } catch (error) {
    console.log('✓ Correctly detected missing encryption key');
  }
}

// ============================================================================
// Example 9: Performance Testing
// ============================================================================

async function example9_Performance() {
  console.log('\n=== Example 9: Performance Testing ===\n');

  await encryptionService.initialize();

  const iterations = 1000;
  const plaintext = 'Performance test data with some length to it';

  // Test encryption performance
  const encryptStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    encryptionService.encrypt(plaintext);
  }
  const encryptDuration = Date.now() - encryptStart;
  const encryptOpsPerSec = Math.round((iterations / encryptDuration) * 1000);

  console.log(`Encryption Performance:`);
  console.log(`  ${iterations} operations in ${encryptDuration}ms`);
  console.log(`  ${encryptOpsPerSec} ops/sec`);
  console.log(`  ${(encryptDuration / iterations).toFixed(2)}ms per operation`);

  // Test decryption performance
  const encrypted = encryptionService.encrypt(plaintext);
  const decryptStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    encryptionService.decrypt(encrypted);
  }
  const decryptDuration = Date.now() - decryptStart;
  const decryptOpsPerSec = Math.round((iterations / decryptDuration) * 1000);

  console.log(`\nDecryption Performance:`);
  console.log(`  ${iterations} operations in ${decryptDuration}ms`);
  console.log(`  ${decryptOpsPerSec} ops/sec`);
  console.log(`  ${(decryptDuration / iterations).toFixed(2)}ms per operation`);
}

// ============================================================================
// Example 10: Real-World Scenario - User Registration
// ============================================================================

async function example10_UserRegistration() {
  console.log('\n=== Example 10: User Registration (Real-World) ===\n');

  await encryptionService.initialize();

  // Simulate user registration
  const registrationData = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1555123456',
    address: '789 Pine St, Village, State 11111',
    ssn: '123-45-6789',
    dateOfBirth: '1990-01-15',
    role: 'customer',
  };

  console.log('Registration Data:', registrationData);

  // Encrypt sensitive fields before saving
  const encrypted = encryptBeforeSave('User', registrationData);
  
  console.log('\nEncrypted for Database (sample):');
  console.log('  Name:', encrypted.name);
  console.log('  Email:', encrypted.email.substring(0, 50) + '...');
  console.log('  Role:', encrypted.role);

  // Simulate saving to database
  // const user = await prisma.user.create({ data: encrypted });

  // Simulate reading from database
  // const savedUser = await prisma.user.findUnique({ where: { id: user.id } });

  // Decrypt for display
  const decrypted = decryptAfterRead('User', encrypted);
  
  console.log('\nDecrypted User Profile:');
  console.log('  Name:', decrypted.name);
  console.log('  Email:', decrypted.email);
  console.log('  Phone:', decrypted.phone);
  console.log('  Address:', decrypted.address);
  console.log('  SSN:', decrypted.ssn);
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         NexaERP Encryption Service Examples               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await example1_BasicEncryption();
    await example2_FieldEncryption();
    await example3_ObjectEncryption();
    await example4_DatabaseIntegration();
    await example5_BatchEncryption();
    await example6_KeyRotation();
    await example7_KeyManagement();
    await example8_ErrorHandling();
    await example9_Performance();
    await example10_UserRegistration();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              All Examples Completed Successfully!          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BasicEncryption,
  example2_FieldEncryption,
  example3_ObjectEncryption,
  example4_DatabaseIntegration,
  example5_BatchEncryption,
  example6_KeyRotation,
  example7_KeyManagement,
  example8_ErrorHandling,
  example9_Performance,
  example10_UserRegistration,
};
