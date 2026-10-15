/**
 * Key Management Service Usage Examples
 * 
 * This file demonstrates how to use the Key Management Service
 * for encryption key management, rotation, and tracking.
 */

import { keyManagementService } from '../src/services/KeyManagementService';

async function demonstrateKeyManagement() {
  console.log('='.repeat(60));
  console.log('Key Management Service Usage Examples');
  console.log('='.repeat(60));
  console.log();

  // ─── Example 1: Initialize Service ─────────────────────────
  console.log('Example 1: Initialize Service');
  console.log('-'.repeat(60));
  
  await keyManagementService.initialize();
  console.log('✅ Service initialized');
  console.log();

  // ─── Example 2: Get Provider Information ───────────────────
  console.log('Example 2: Get Provider Information');
  console.log('-'.repeat(60));
  
  const providerInfo = keyManagementService.getProviderInfo();
  console.log('Provider:', providerInfo.provider);
  console.log('Production Ready:', providerInfo.isProduction);
  console.log('Features:', providerInfo.features);
  console.log();

  // ─── Example 3: Generate Data Encryption Key ───────────────
  console.log('Example 3: Generate Data Encryption Key');
  console.log('-'.repeat(60));
  
  const { keyId, key } = await keyManagementService.generateDataKey();
  console.log('Key ID:', keyId);
  console.log('Key Length:', key.length, 'bytes');
  console.log('✅ Key generated successfully');
  console.log();

  // ─── Example 4: Get Key Metadata ───────────────────────────
  console.log('Example 4: Get Key Metadata');
  console.log('-'.repeat(60));
  
  const metadata = keyManagementService.getKeyMetadata(keyId);
  if (metadata) {
    console.log('Key ID:', metadata.id);
    console.log('Provider:', metadata.provider);
    console.log('Created:', metadata.createdAt);
    console.log('Expires:', metadata.expiresAt);
    console.log('Active:', metadata.isActive);
    console.log('Usage Count:', metadata.usageCount);
    console.log('Version:', metadata.version);
  }
  console.log();

  // ─── Example 5: Encrypt and Decrypt Key ────────────────────
  console.log('Example 5: Encrypt and Decrypt Key (Key Wrapping)');
  console.log('-'.repeat(60));
  
  const plainKey = Buffer.from('my-secret-encryption-key-32b');
  console.log('Plain Key:', plainKey.toString('utf-8'));
  
  const encryptedKey = await keyManagementService.encryptKey(plainKey, keyId);
  console.log('Encrypted Key Length:', encryptedKey.length, 'bytes');
  
  const decryptedKey = await keyManagementService.decryptKey(encryptedKey, keyId);
  console.log('Decrypted Key:', decryptedKey.toString('utf-8'));
  console.log('✅ Encryption/Decryption successful');
  console.log();

  // ─── Example 6: Track Key Usage ────────────────────────────
  console.log('Example 6: Track Key Usage');
  console.log('-'.repeat(60));
  
  const stats = keyManagementService.getKeyUsageStats(keyId);
  console.log('Total Usage:', stats.totalUsage);
  console.log('Encrypt Operations:', stats.encryptOperations);
  console.log('Decrypt Operations:', stats.decryptOperations);
  console.log('Average Usage/Day:', stats.averageUsagePerDay.toFixed(2));
  if (stats.lastUsed) {
    console.log('Last Used:', stats.lastUsed);
  }
  console.log();

  // ─── Example 7: Get Usage Logs ─────────────────────────────
  console.log('Example 7: Get Usage Logs');
  console.log('-'.repeat(60));
  
  const logs = keyManagementService.getKeyUsageLogs(keyId, 5);
  console.log(`Recent ${logs.length} operations:`);
  logs.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log.operation} at ${log.timestamp.toISOString()} - ${log.success ? '✅' : '❌'}`);
  });
  console.log();

  // ─── Example 8: Get All Keys ───────────────────────────────
  console.log('Example 8: Get All Keys');
  console.log('-'.repeat(60));
  
  const allKeys = keyManagementService.getAllKeysMetadata();
  console.log('Total Keys:', allKeys.length);
  allKeys.forEach((key, index) => {
    const daysUntilExpiry = Math.floor(
      (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    console.log(`  ${index + 1}. ${key.id} - Active: ${key.isActive}, Expires in ${daysUntilExpiry} days`);
  });
  console.log();

  // ─── Example 9: Check Keys Needing Rotation ────────────────
  console.log('Example 9: Check Keys Needing Rotation');
  console.log('-'.repeat(60));
  
  const keysNeedingRotation = keyManagementService.getKeysNeedingRotation();
  console.log('Keys Needing Rotation:', keysNeedingRotation.length);
  keysNeedingRotation.forEach((key, index) => {
    const daysUntilExpiry = Math.floor(
      (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    console.log(`  ${index + 1}. ${key.id} - Expires in ${daysUntilExpiry} days`);
  });
  console.log();

  // ─── Example 10: Get Rotation Policy ───────────────────────
  console.log('Example 10: Get Rotation Policy');
  console.log('-'.repeat(60));
  
  const policy = keyManagementService.getRotationPolicy();
  console.log('Enabled:', policy.enabled);
  console.log('Rotation Interval:', policy.rotationIntervalDays, 'days');
  console.log('Auto-Rotate:', policy.autoRotate);
  console.log('Notify Before:', policy.notifyBeforeDays, 'days');
  console.log();

  // ─── Example 11: Update Rotation Policy ────────────────────
  console.log('Example 11: Update Rotation Policy');
  console.log('-'.repeat(60));
  
  keyManagementService.updateRotationPolicy({
    rotationIntervalDays: 60,
    notifyBeforeDays: 14,
  });
  
  const updatedPolicy = keyManagementService.getRotationPolicy();
  console.log('Updated Rotation Interval:', updatedPolicy.rotationIntervalDays, 'days');
  console.log('Updated Notify Before:', updatedPolicy.notifyBeforeDays, 'days');
  console.log('✅ Policy updated');
  console.log();

  // Reset to default
  keyManagementService.updateRotationPolicy({
    rotationIntervalDays: 90,
    notifyBeforeDays: 7,
  });

  // ─── Example 12: Rotate Key ────────────────────────────────
  console.log('Example 12: Rotate Key');
  console.log('-'.repeat(60));
  
  console.log('Old Key ID:', keyId);
  const rotationResult = await keyManagementService.rotateKey(keyId);
  console.log('New Key ID:', rotationResult.keyId);
  
  const oldKeyMetadata = keyManagementService.getKeyMetadata(keyId);
  const newKeyMetadata = keyManagementService.getKeyMetadata(rotationResult.keyId);
  
  console.log('Old Key Active:', oldKeyMetadata?.isActive);
  console.log('Old Key Rotated At:', oldKeyMetadata?.rotatedAt);
  console.log('New Key Active:', newKeyMetadata?.isActive);
  console.log('✅ Key rotated successfully');
  console.log();

  // ─── Example 13: Delete Inactive Key ───────────────────────
  console.log('Example 13: Delete Inactive Key');
  console.log('-'.repeat(60));
  
  try {
    await keyManagementService.deleteKey(keyId);
    console.log('✅ Key deleted:', keyId);
  } catch (error) {
    console.log('Note:', error instanceof Error ? error.message : 'Deletion failed');
  }
  console.log();

  // ─── Summary ───────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('✅ All Examples Completed Successfully');
  console.log('='.repeat(60));
  console.log();
  console.log('Key Takeaways:');
  console.log('  1. Always initialize the service before use');
  console.log('  2. Keys are automatically tracked for usage');
  console.log('  3. Rotation creates new keys and deactivates old ones');
  console.log('  4. Old keys are kept for decrypting existing data');
  console.log('  5. Monitor keys needing rotation regularly');
  console.log('  6. Use AWS KMS or Azure Key Vault in production');
  console.log();
}

// Run examples
demonstrateKeyManagement()
  .then(() => {
    console.log('Examples completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
