#!/usr/bin/env node

/**
 * Initialize Encryption Script
 * 
 * Sets up encryption keys and initializes the encryption service.
 * Run this script once during initial setup or after key rotation.
 * 
 * Usage:
 *   npm run init:encryption
 *   node dist/scripts/initializeEncryption.js
 */

import { encryptionService } from '../services/EncryptionService';

async function main() {
  console.log('='.repeat(60));
  console.log('Initializing Encryption Service');
  console.log('='.repeat(60));
  console.log();

  try {
    // Initialize encryption service
    await encryptionService.initialize();
    console.log();

    // Display key information
    const keyInfo = encryptionService.getKeyInfo();
    console.log('Encryption Key Information:');
    console.log('-'.repeat(60));
    console.log(`Active Key ID: ${keyInfo.activeKeyId}`);
    console.log(`Total Keys: ${keyInfo.totalKeys}`);
    console.log();

    console.log('Key Details:');
    for (const key of keyInfo.keys) {
      console.log(`  Key ID: ${key.id}`);
      console.log(`  Created: ${key.createdAt.toISOString()}`);
      console.log(`  Expires: ${key.expiresAt.toISOString()}`);
      console.log(`  Days Until Expiry: ${key.daysUntilExpiry}`);
      console.log(`  Active: ${key.isActive ? '✓' : '✗'}`);
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✓ Encryption service initialized successfully');
    console.log('='.repeat(60));
    console.log();
    console.log('IMPORTANT SECURITY NOTES:');
    console.log('1. Master key is stored in: keys/master.key');
    console.log('2. Encryption keys are stored in: keys/encryption.keys');
    console.log('3. Keep these files secure and backed up');
    console.log('4. In production, use AWS KMS, Azure Key Vault, or HashiCorp Vault');
    console.log('5. Never commit these files to version control');
    console.log('6. Set up automatic key rotation every 90 days');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize encryption service:', error);
    process.exit(1);
  }
}

main();
