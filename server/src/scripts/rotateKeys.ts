/**
 * Rotate Encryption Keys
 * 
 * This script manually rotates encryption keys and provides
 * information about the rotation process.
 * 
 * Usage:
 *   npm run rotate:keys
 */

import { keyManagementService } from '../services/KeyManagementService';

async function rotateKeys() {
  try {
    console.log('='.repeat(60));
    console.log('Key Rotation Process');
    console.log('='.repeat(60));
    console.log();

    // Initialize service
    console.log('1. Initializing key management service...');
    await keyManagementService.initialize();
    console.log('   ✅ Service initialized');
    console.log();

    // Get all keys
    console.log('2. Current Keys:');
    const allKeys = keyManagementService.getAllKeysMetadata();
    console.log(`   Total Keys: ${allKeys.length}`);
    console.log();

    allKeys.forEach((key, index) => {
      const daysUntilExpiry = Math.floor(
        (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      
      console.log(`   Key ${index + 1}:`);
      console.log(`     ID: ${key.id}`);
      console.log(`     Active: ${key.isActive ? '✅' : '❌'}`);
      console.log(`     Created: ${key.createdAt.toISOString()}`);
      console.log(`     Expires: ${key.expiresAt.toISOString()}`);
      console.log(`     Days Until Expiry: ${daysUntilExpiry}`);
      console.log(`     Usage Count: ${key.usageCount}`);
      
      if (key.rotatedAt) {
        console.log(`     Rotated: ${key.rotatedAt.toISOString()}`);
      }
      
      console.log();
    });

    // Check for keys needing rotation
    console.log('3. Keys Needing Rotation:');
    const keysNeedingRotation = keyManagementService.getKeysNeedingRotation();
    
    if (keysNeedingRotation.length === 0) {
      console.log('   ✅ No keys need rotation at this time');
      console.log();
    } else {
      console.log(`   ⚠️  ${keysNeedingRotation.length} key(s) need rotation:`);
      console.log();

      for (const key of keysNeedingRotation) {
        const daysUntilExpiry = Math.floor(
          (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        
        console.log(`   Key: ${key.id}`);
        console.log(`     Days Until Expiry: ${daysUntilExpiry}`);
        console.log(`     Usage Count: ${key.usageCount}`);
        console.log();

        // Rotate the key
        console.log(`   Rotating key ${key.id}...`);
        const result = await keyManagementService.rotateKey(key.id);
        console.log(`   ✅ Rotation complete`);
        console.log(`     Old Key: ${key.id}`);
        console.log(`     New Key: ${result.keyId}`);
        console.log();
      }
    }

    // Get updated key list
    console.log('4. Updated Keys:');
    const updatedKeys = keyManagementService.getAllKeysMetadata();
    console.log(`   Total Keys: ${updatedKeys.length}`);
    console.log(`   Active Keys: ${updatedKeys.filter(k => k.isActive).length}`);
    console.log(`   Inactive Keys: ${updatedKeys.filter(k => !k.isActive).length}`);
    console.log();

    // Get usage statistics
    console.log('5. Usage Statistics:');
    const activeKey = updatedKeys.find(k => k.isActive);
    if (activeKey) {
      const stats = keyManagementService.getKeyUsageStats(activeKey.id);
      console.log(`   Active Key: ${activeKey.id}`);
      console.log(`   Total Usage: ${stats.totalUsage}`);
      console.log(`   Encrypt Operations: ${stats.encryptOperations}`);
      console.log(`   Decrypt Operations: ${stats.decryptOperations}`);
      console.log(`   Average Usage/Day: ${stats.averageUsagePerDay.toFixed(2)}`);
      if (stats.lastUsed) {
        console.log(`   Last Used: ${stats.lastUsed.toISOString()}`);
      }
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Key Rotation Complete');
    console.log('='.repeat(60));
    console.log();
    console.log('Important Notes:');
    console.log('  1. Old keys are kept for decrypting existing data');
    console.log('  2. New data will be encrypted with the new active key');
    console.log('  3. Consider re-encrypting old data with the new key');
    console.log('  4. Monitor key usage and rotation logs');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Verify application is using the new key');
    console.log('  2. Monitor for any decryption errors');
    console.log('  3. Plan re-encryption of old data (optional)');
    console.log('  4. Update key rotation schedule if needed');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Key rotation failed:', error);
    process.exit(1);
  }
}

// Run key rotation
rotateKeys();
