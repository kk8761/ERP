/**
 * Initialize Key Management Service
 * 
 * This script initializes the key management service and generates
 * the initial data encryption key.
 * 
 * Usage:
 *   npm run init:key-management
 */

import { keyManagementService } from '../services/KeyManagementService';

async function initializeKeyManagement() {
  try {
    console.log('='.repeat(60));
    console.log('Key Management Service Initialization');
    console.log('='.repeat(60));
    console.log();

    // Initialize service
    console.log('1. Initializing key management service...');
    await keyManagementService.initialize();
    console.log('   ✅ Service initialized');
    console.log();

    // Get provider information
    console.log('2. Provider Information:');
    const providerInfo = keyManagementService.getProviderInfo();
    console.log(`   Provider: ${providerInfo.provider}`);
    console.log(`   Production Ready: ${providerInfo.isProduction ? 'Yes' : 'No'}`);
    console.log('   Features:');
    providerInfo.features.forEach(feature => {
      console.log(`     - ${feature}`);
    });
    console.log();

    // Get rotation policy
    console.log('3. Rotation Policy:');
    const policy = keyManagementService.getRotationPolicy();
    console.log(`   Enabled: ${policy.enabled}`);
    console.log(`   Rotation Interval: ${policy.rotationIntervalDays} days`);
    console.log(`   Auto-Rotate: ${policy.autoRotate}`);
    console.log(`   Notify Before: ${policy.notifyBeforeDays} days`);
    console.log();

    // Generate initial key
    console.log('4. Generating initial data encryption key...');
    const { keyId } = await keyManagementService.generateDataKey();
    console.log(`   ✅ Key generated: ${keyId}`);
    console.log();

    // Get key metadata
    console.log('5. Key Metadata:');
    const metadata = keyManagementService.getKeyMetadata(keyId);
    if (metadata) {
      console.log(`   ID: ${metadata.id}`);
      console.log(`   Provider: ${metadata.provider}`);
      console.log(`   Created: ${metadata.createdAt.toISOString()}`);
      console.log(`   Expires: ${metadata.expiresAt.toISOString()}`);
      console.log(`   Active: ${metadata.isActive}`);
      console.log(`   Version: ${metadata.version}`);
      
      const daysUntilExpiry = Math.floor(
        (metadata.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      console.log(`   Days Until Expiry: ${daysUntilExpiry}`);
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Key Management Service Initialized Successfully');
    console.log('='.repeat(60));
    console.log();
    console.log('Next Steps:');
    console.log('  1. Configure AWS KMS or Azure Key Vault for production');
    console.log('  2. Set up monitoring and alerting for key expiration');
    console.log('  3. Test key rotation process');
    console.log('  4. Review and update rotation policy if needed');
    console.log();

    if (!providerInfo.isProduction) {
      console.log('⚠️  WARNING: Using local key storage');
      console.log('   For production, configure AWS KMS or Azure Key Vault:');
      console.log();
      console.log('   AWS KMS:');
      console.log('     export AWS_KMS_KEY_ID=your-kms-key-id');
      console.log('     export AWS_REGION=us-east-1');
      console.log('     export AWS_ACCESS_KEY_ID=your-access-key');
      console.log('     export AWS_SECRET_ACCESS_KEY=your-secret-key');
      console.log();
      console.log('   Azure Key Vault:');
      console.log('     export AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/');
      console.log('     export AZURE_TENANT_ID=your-tenant-id');
      console.log('     export AZURE_CLIENT_ID=your-client-id');
      console.log('     export AZURE_CLIENT_SECRET=your-client-secret');
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeKeyManagement();
