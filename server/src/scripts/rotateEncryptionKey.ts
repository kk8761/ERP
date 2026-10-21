#!/usr/bin/env node

/**
 * Rotate Encryption Key Script
 * 
 * Rotates the active encryption key and optionally re-encrypts existing data.
 * Should be run every 90 days or when key compromise is suspected.
 * 
 * Usage:
 *   npm run rotate:key
 *   npm run rotate:key -- --reencrypt
 *   node dist/scripts/rotateEncryptionKey.js --reencrypt
 */

import { encryptionService } from '../services/EncryptionService';
import { reencryptAllData } from '../utils/databaseEncryption';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const shouldReencrypt = args.includes('--reencrypt');

  console.log('='.repeat(60));
  console.log('Encryption Key Rotation');
  console.log('='.repeat(60));
  console.log();

  try {
    // Initialize encryption service
    await encryptionService.initialize();
    console.log();

    // Display current key information
    console.log('Current Key Information:');
    console.log('-'.repeat(60));
    const beforeKeyInfo = encryptionService.getKeyInfo();
    console.log(`Active Key ID: ${beforeKeyInfo.activeKeyId}`);
    console.log(`Total Keys: ${beforeKeyInfo.totalKeys}`);
    console.log();

    // Rotate key
    console.log('Rotating encryption key...');
    const newKeyId = await encryptionService.rotateKey();
    console.log(`✓ New active key ID: ${newKeyId}`);
    console.log();

    // Display new key information
    console.log('New Key Information:');
    console.log('-'.repeat(60));
    const afterKeyInfo = encryptionService.getKeyInfo();
    console.log(`Active Key ID: ${afterKeyInfo.activeKeyId}`);
    console.log(`Total Keys: ${afterKeyInfo.totalKeys}`);
    console.log();

    // Re-encrypt existing data if requested
    if (shouldReencrypt) {
      console.log('Re-encrypting existing data with new key...');
      console.log('This may take a while depending on data volume...');
      console.log();

      await reencryptAllData(prisma);
      console.log();
    } else {
      console.log('⚠ Existing data NOT re-encrypted');
      console.log('Old data will still be decryptable with previous keys');
      console.log('To re-encrypt existing data, run: npm run rotate:key -- --reencrypt');
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✓ Key rotation complete');
    console.log('='.repeat(60));
    console.log();
    console.log('NEXT STEPS:');
    console.log('1. Backup the new encryption keys');
    console.log('2. Update key rotation schedule (90 days from now)');
    console.log('3. Monitor application logs for decryption errors');
    if (!shouldReencrypt) {
      console.log('4. Consider re-encrypting data: npm run rotate:key -- --reencrypt');
    }
    console.log();

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to rotate encryption key:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
