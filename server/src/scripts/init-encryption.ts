/**
 * Initialize Encryption System
 * Task 38.2: Setup script for encryption at rest
 * 
 * This script:
 * 1. Generates a master encryption key
 * 2. Creates the initial encryption key in the database
 * 3. Sets up key rotation policy
 * 4. Initializes encryption services
 */

import crypto from 'crypto';
import { EncryptionService } from '../services/encryption.service';
import { KeyManagementService, KeyProvider, KeyType } from '../services/key-management.service';
import prisma from '../config/prisma';
import { connectPostgres } from '../config/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function initializeEncryption() {
  console.log('🔐 Initializing Encryption System...\n');

  try {
    // Connect to database
    await connectPostgres();

    // Step 1: Generate master encryption key if not exists
    console.log('Step 1: Checking master encryption key...');
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (!envContent.includes('MASTER_ENCRYPTION_KEY=')) {
      console.log('  ⚠️  Master encryption key not found. Generating new key...');
      
      // Generate a 256-bit (32 bytes) master key
      const masterKey = crypto.randomBytes(32).toString('hex');
      
      // Append to .env file
      const newEnvLine = `\n# Master Encryption Key (AES-256)\n# CRITICAL: Keep this secret and back it up securely!\n# If lost, encrypted data cannot be recovered!\nMASTER_ENCRYPTION_KEY=${masterKey}\n`;
      fs.appendFileSync(envPath, newEnvLine);
      
      console.log('  ✅ Master encryption key generated and saved to .env');
      console.log('  ⚠️  IMPORTANT: Back up your .env file securely!');
      console.log('  ⚠️  If the master key is lost, encrypted data cannot be recovered!\n');
      
      // Set in current process
      process.env.MASTER_ENCRYPTION_KEY = masterKey;
    } else {
      console.log('  ✅ Master encryption key already exists\n');
    }

    // Step 2: Initialize encryption service
    console.log('Step 2: Initializing encryption service...');
    await EncryptionService.initialize();
    console.log('  ✅ Encryption service initialized\n');

    // Step 3: Initialize key management service
    console.log('Step 3: Initializing key management service...');
    await KeyManagementService.initialize(KeyProvider.LOCAL);
    console.log('  ✅ Key management service initialized\n');

    // Step 4: Check if encryption keys exist
    console.log('Step 4: Checking encryption keys...');
    const existingKeys = await prisma.encryptionKey.findMany({
      where: { isActive: true },
    });

    if (existingKeys.length === 0) {
      console.log('  ⚠️  No active encryption keys found. Creating initial key...');
      
      const key = await KeyManagementService.createKey(KeyType.DATA_ENCRYPTION, 90);
      
      console.log('  ✅ Initial encryption key created');
      console.log(`     Key ID: ${key.id}`);
      console.log(`     Expires: ${key.expiresAt.toISOString()}\n`);
    } else {
      console.log(`  ✅ Found ${existingKeys.length} active encryption key(s)\n`);
    }

    // Step 5: Set up key rotation policy
    console.log('Step 5: Setting up key rotation policy...');
    await KeyManagementService.updateRotationPolicy({
      enabled: true,
      intervalDays: 90,
      warningThresholdDays: 7,
      autoRotate: true,
    });
    console.log('  ✅ Key rotation policy configured');
    console.log('     Rotation interval: 90 days');
    console.log('     Warning threshold: 7 days');
    console.log('     Auto-rotate: enabled\n');

    // Step 6: Create encrypted field metadata
    console.log('Step 6: Setting up encrypted field metadata...');
    
    const encryptedFields = [
      { tableName: 'User', fieldName: 'password', encryptionType: 'FULL' },
      { tableName: 'Employee', fieldName: 'ssn', encryptionType: 'FULL' },
      { tableName: 'Employee', fieldName: 'taxId', encryptionType: 'FULL' },
      { tableName: 'Employee', fieldName: 'bankAccountNumber', encryptionType: 'FULL' },
      { tableName: 'MFA', fieldName: 'secret', encryptionType: 'FULL' },
      { tableName: 'ApiKey', fieldName: 'keyValue', encryptionType: 'FULL' },
    ];

    for (const field of encryptedFields) {
      await prisma.encryptedFieldMetadata.upsert({
        where: {
          tableName_fieldName: {
            tableName: field.tableName,
            fieldName: field.fieldName,
          },
        },
        create: field,
        update: { encryptionType: field.encryptionType, isActive: true },
      });
    }
    
    console.log(`  ✅ Configured ${encryptedFields.length} encrypted fields\n`);

    // Step 7: Test encryption
    console.log('Step 7: Testing encryption...');
    const testData = 'Test encryption data';
    const encrypted = await EncryptionService.encryptString(testData);
    const decrypted = await EncryptionService.decryptString(encrypted);
    
    if (decrypted === testData) {
      console.log('  ✅ Encryption test passed\n');
    } else {
      throw new Error('Encryption test failed!');
    }

    // Step 8: Display summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Encryption System Initialized Successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    const status = await EncryptionService.getKeyStatus();
    console.log('Current Status:');
    console.log(`  • Current Key ID: ${status.currentKeyId}`);
    console.log(`  • Expires: ${status.expiresAt.toISOString()}`);
    console.log(`  • Days until expiry: ${status.daysUntilExpiry}`);
    console.log(`  • Total keys: ${status.totalKeys}`);
    console.log(`  • Should rotate: ${status.shouldRotate ? 'Yes' : 'No'}\n`);

    console.log('Security Recommendations:');
    console.log('  1. Back up your .env file securely (offline storage)');
    console.log('  2. Never commit .env file to version control');
    console.log('  3. Rotate master key annually (requires data re-encryption)');
    console.log('  4. Monitor key expiration alerts');
    console.log('  5. Enable database-level encryption (TDE) for additional security');
    console.log('  6. Consider using AWS KMS or Azure Key Vault for production\n');

    console.log('Next Steps:');
    console.log('  • Run migrations: npm run prisma:push');
    console.log('  • Test encryption: npm test -- encryption.test.ts');
    console.log('  • Monitor key rotation: Check /api/encryption/dashboard\n');

  } catch (error) {
    console.error('❌ Encryption initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeEncryption()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { initializeEncryption };
