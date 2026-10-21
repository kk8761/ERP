/**
 * TLS and Certificate Management Usage Examples
 * 
 * This file demonstrates various ways to use TLS 1.3 and certificate
 * management features in NexaERP.
 */

import { secureHttpClient } from '../src/utils/secure-http-client';
import { certificateService } from '../src/services/certificate.service';
import {
  defaultTLSConfig,
  mutualTLSConfig,
  validateTLSConfig,
  createHTTPSOptions,
  createClientTLSOptions,
} from '../src/config/tls.config';
import https from 'https';
import express from 'express';

// ============================================================================
// Example 1: Basic TLS Configuration
// ============================================================================

async function example1_TLSConfiguration() {
  console.log('\n=== Example 1: TLS Configuration ===\n');

  console.log('TLS Configuration:');
  console.log('  Enabled:', defaultTLSConfig.enabled);
  console.log('  Min Version:', defaultTLSConfig.minVersion);
  console.log('  Max Version:', defaultTLSConfig.maxVersion);
  console.log('  Cipher Suites:', defaultTLSConfig.ciphers.join(', '));
  console.log('  Honor Cipher Order:', defaultTLSConfig.honorCipherOrder);
  console.log('  Session Timeout:', defaultTLSConfig.sessionTimeout, 'seconds');

  // Validate configuration
  const validation = validateTLSConfig();
  console.log('\nConfiguration Validation:');
  console.log('  Valid:', validation.valid ? '✓' : '✗');
  
  if (validation.errors.length > 0) {
    console.log('  Errors:');
    validation.errors.forEach(err => console.log(`    - ${err}`));
  } else {
    console.log('  No errors found');
  }
}

// ============================================================================
// Example 2: Certificate Information
// ============================================================================

async function example2_CertificateInfo() {
  console.log('\n=== Example 2: Certificate Information ===\n');

  try {
    // Get certificate status
    const status = await certificateService.getCertificateStatus();

    console.log('Certificate Status:');
    console.log('  Valid:', status.valid ? '✓' : '✗');

    if (status.info) {
      console.log('\nCertificate Details:');
      console.log('  Subject:', status.info.subject);
      console.log('  Issuer:', status.info.issuer);
      console.log('  Valid From:', status.info.validFrom.toISOString());
      console.log('  Valid To:', status.info.validTo.toISOString());
      console.log('  Serial Number:', status.info.serialNumber);
      console.log('  Fingerprint:', status.info.fingerprint);
      console.log('  Days Until Expiry:', status.info.daysUntilExpiry);

      if (status.info.daysUntilExpiry <= 7) {
        console.log('  ⚠️  WARNING: Certificate expires soon!');
      } else if (status.info.daysUntilExpiry <= 30) {
        console.log('  ⚠️  Certificate expires in less than 30 days');
      } else {
        console.log('  ✓ Certificate is valid');
      }
    }

    if (status.validation.errors.length > 0) {
      console.log('\nValidation Errors:');
      status.validation.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (status.validation.warnings.length > 0) {
      console.log('\nValidation Warnings:');
      status.validation.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
  } catch (error) {
    console.error('Error getting certificate info:', error);
  }
}

// ============================================================================
// Example 3: Certificate Validation
// ============================================================================

async function example3_CertificateValidation() {
  console.log('\n=== Example 3: Certificate Validation ===\n');

  try {
    // Validate server certificate
    const validation = await certificateService.validateCertificate(
      process.env.TLS_CERT_PATH || './certs/server.crt',
      process.env.TLS_KEY_PATH || './certs/server.key'
    );

    console.log('Certificate Validation:');
    console.log('  Valid:', validation.valid ? '✓' : '✗');

    if (validation.errors.length > 0) {
      console.log('\nErrors:');
      validation.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (validation.warnings.length > 0) {
      console.log('\nWarnings:');
      validation.warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    if (validation.valid) {
      console.log('\n✓ Certificate is valid and ready to use');
    }
  } catch (error) {
    console.error('Error validating certificate:', error);
  }
}

// ============================================================================
// Example 4: Certificate Monitoring
// ============================================================================

async function example4_CertificateMonitoring() {
  console.log('\n=== Example 4: Certificate Monitoring ===\n');

  // Set expiry thresholds
  certificateService.setExpiryThresholds(30, 7);
  console.log('Expiry thresholds set:');
  console.log('  Warning: 30 days');
  console.log('  Critical: 7 days');

  // Start monitoring
  console.log('\nStarting certificate monitoring...');
  certificateService.startMonitoring(24); // Check every 24 hours
  console.log('✓ Monitoring started (checks every 24 hours)');

  // Simulate monitoring for a few seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Stop monitoring
  console.log('\nStopping certificate monitoring...');
  certificateService.stopMonitoring();
  console.log('✓ Monitoring stopped');
}

// ============================================================================
// Example 5: Secure HTTP Client (TLS 1.3)
// ============================================================================

async function example5_SecureHttpClient() {
  console.log('\n=== Example 5: Secure HTTP Client ===\n');

  try {
    // Set default timeout
    secureHttpClient.setDefaultTimeout(30000);

    // Make secure GET request
    console.log('Making secure GET request...');
    const response = await secureHttpClient.get(
      'https://api.example.com/data',
      {
        headers: {
          'X-API-Key': 'your-api-key',
        },
        timeout: 10000,
      }
    );

    console.log('Response:');
    console.log('  Status:', response.status);
    console.log('  Data:', response.data);

    // Make secure POST request
    console.log('\nMaking secure POST request...');
    const postResponse = await secureHttpClient.post(
      'https://api.example.com/create',
      {
        name: 'Test Item',
        value: 123,
      },
      {
        headers: {
          'X-API-Key': 'your-api-key',
        },
      }
    );

    console.log('Response:');
    console.log('  Status:', postResponse.status);
    console.log('  Data:', postResponse.data);
  } catch (error: any) {
    console.error('Error making secure request:', error.message);
  }
}

// ============================================================================
// Example 6: Mutual TLS Configuration
// ============================================================================

async function example6_MutualTLS() {
  console.log('\n=== Example 6: Mutual TLS Configuration ===\n');

  console.log('Mutual TLS Configuration:');
  console.log('  Enabled:', mutualTLSConfig.enabled);
  console.log('  Client Cert Required:', mutualTLSConfig.clientCertRequired);
  console.log('  Allowed Services:', mutualTLSConfig.allowedServices.join(', ') || 'None');

  if (mutualTLSConfig.enabled) {
    console.log('\n✓ Mutual TLS is enabled');
    console.log('  Client certificates will be validated');
    console.log('  Only allowed services can connect');
  } else {
    console.log('\n⚠️  Mutual TLS is disabled');
    console.log('  Enable for service-to-service security');
  }
}

// ============================================================================
// Example 7: Service-to-Service Communication
// ============================================================================

async function example7_ServiceToService() {
  console.log('\n=== Example 7: Service-to-Service Communication ===\n');

  try {
    // Make request with mutual TLS
    console.log('Making service-to-service request with mutual TLS...');
    
    const response = await secureHttpClient.get(
      'https://internal-service.example.com/api/data',
      {
        serviceName: 'internal-service',
        headers: {
          'X-Service-Name': 'nexaerp',
        },
      }
    );

    console.log('Response:');
    console.log('  Status:', response.status);
    console.log('  Data:', response.data);
    console.log('✓ Mutual TLS authentication successful');
  } catch (error: any) {
    console.error('Error in service-to-service communication:', error.message);
  }
}

// ============================================================================
// Example 8: Create HTTPS Server
// ============================================================================

async function example8_HTTPSServer() {
  console.log('\n=== Example 8: Create HTTPS Server ===\n');

  try {
    // Create HTTPS options
    const httpsOptions = createHTTPSOptions();
    console.log('HTTPS Options Created:');
    console.log('  Min TLS Version:', httpsOptions.minVersion);
    console.log('  Max TLS Version:', httpsOptions.maxVersion);
    console.log('  Request Client Cert:', httpsOptions.requestCert);

    // Create Express app
    const app = express();
    app.get('/test', (req, res) => {
      res.json({
        success: true,
        message: 'TLS 1.3 is working!',
        tlsVersion: (req.socket as any).getProtocol?.(),
      });
    });

    // Create HTTPS server
    const server = https.createServer(httpsOptions, app);

    // Start server
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        console.log(`\n✓ HTTPS server started on port ${address.port}`);
        console.log('  TLS 1.3 enforced');
        console.log('  Strong cipher suites only');
      }

      // Close server after demo
      setTimeout(() => {
        server.close();
        console.log('\n✓ Server closed');
      }, 2000);
    });
  } catch (error: any) {
    console.error('Error creating HTTPS server:', error.message);
  }
}

// ============================================================================
// Example 9: Certificate Rotation
// ============================================================================

async function example9_CertificateRotation() {
  console.log('\n=== Example 9: Certificate Rotation ===\n');

  try {
    // In production, you would have new certificate files
    const newCertPath = './certs/new-server.crt';
    const newKeyPath = './certs/new-server.key';

    console.log('Certificate Rotation Process:');
    console.log('  1. Obtain new certificate from CA');
    console.log('  2. Validate new certificate');
    console.log('  3. Backup old certificate');
    console.log('  4. Install new certificate');
    console.log('  5. Restart server');

    // Validate new certificate before rotation
    console.log('\nValidating new certificate...');
    const validation = await certificateService.validateCertificate(
      newCertPath,
      newKeyPath
    );

    if (!validation.valid) {
      console.log('✗ New certificate validation failed:');
      validation.errors.forEach(err => console.log(`  - ${err}`));
      return;
    }

    console.log('✓ New certificate is valid');

    // Rotate certificate
    console.log('\nRotating certificate...');
    const success = await certificateService.rotateCertificate(
      newCertPath,
      newKeyPath,
      true // Create backup
    );

    if (success) {
      console.log('✓ Certificate rotated successfully');
      console.log('  Old certificate backed up');
      console.log('  New certificate installed');
      console.log('\n⚠️  Server restart required for changes to take effect');
    } else {
      console.log('✗ Certificate rotation failed');
    }
  } catch (error: any) {
    console.error('Error rotating certificate:', error.message);
  }
}

// ============================================================================
// Example 10: Generate Self-Signed Certificate (Development)
// ============================================================================

async function example10_GenerateSelfSigned() {
  console.log('\n=== Example 10: Generate Self-Signed Certificate ===\n');

  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Self-signed certificates not allowed in production');
    return;
  }

  try {
    console.log('Generating self-signed certificate...');
    console.log('  Common Name: localhost');
    console.log('  Valid Days: 365');

    const success = await certificateService.generateSelfSignedCertificate(
      'localhost',
      365
    );

    if (success) {
      console.log('\n✓ Self-signed certificate generated successfully');
      console.log('  Certificate: ./certs/server.crt');
      console.log('  Private Key: ./certs/server.key');
      console.log('\n⚠️  For development use only!');
    } else {
      console.log('\n✗ Failed to generate certificate');
    }
  } catch (error: any) {
    console.error('Error generating certificate:', error.message);
  }
}

// ============================================================================
// Example 11: TLS Client Options
// ============================================================================

async function example11_ClientTLSOptions() {
  console.log('\n=== Example 11: TLS Client Options ===\n');

  // Create client TLS options
  const options = createClientTLSOptions('example-service');

  console.log('Client TLS Options:');
  console.log('  Min Version:', options.minVersion);
  console.log('  Max Version:', options.maxVersion);
  console.log('  Server Name (SNI):', options.servername);
  console.log('  Reject Unauthorized:', options.rejectUnauthorized);

  if (mutualTLSConfig.enabled) {
    console.log('  Client Certificate: Included');
    console.log('  Client Key: Included');
    console.log('  CA Certificate: Included');
  }

  console.log('\n✓ Client configured for TLS 1.3 connections');
}

// ============================================================================
// Example 12: Error Handling
// ============================================================================

async function example12_ErrorHandling() {
  console.log('\n=== Example 12: Error Handling ===\n');

  // Test 1: Invalid certificate path
  try {
    await certificateService.getCertificateInfo('/nonexistent/cert.pem');
    console.log('✗ Should have handled missing certificate');
  } catch (error) {
    console.log('✓ Correctly handled missing certificate');
  }

  // Test 2: Invalid TLS configuration
  try {
    const originalMinVersion = defaultTLSConfig.minVersion;
    defaultTLSConfig.minVersion = 'TLSv1.0' as any;
    
    const validation = validateTLSConfig();
    
    if (!validation.valid) {
      console.log('✓ Correctly detected invalid TLS version');
    }
    
    // Restore
    defaultTLSConfig.minVersion = originalMinVersion;
  } catch (error) {
    console.log('✓ Correctly handled invalid configuration');
  }

  // Test 3: Connection timeout
  try {
    secureHttpClient.setDefaultTimeout(1); // 1ms timeout
    await secureHttpClient.get('https://example.com/slow-endpoint');
    console.log('✗ Should have timed out');
  } catch (error: any) {
    if (error.message.includes('timeout')) {
      console.log('✓ Correctly handled connection timeout');
    }
  } finally {
    secureHttpClient.setDefaultTimeout(30000); // Restore
  }
}

// ============================================================================
// Example 13: Real-World Scenario - API Integration
// ============================================================================

async function example13_APIIntegration() {
  console.log('\n=== Example 13: API Integration (Real-World) ===\n');

  try {
    // Scenario: Integrate with external payment gateway
    console.log('Integrating with payment gateway...');

    // Configure secure client
    secureHttpClient.setDefaultTimeout(30000);

    // Create payment
    console.log('\n1. Creating payment...');
    const paymentResponse = await secureHttpClient.post(
      'https://api.payment-gateway.com/v1/payments',
      {
        amount: 10000, // $100.00
        currency: 'USD',
        description: 'Order #12345',
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('   Payment created:', paymentResponse.data.id);

    // Verify payment
    console.log('\n2. Verifying payment...');
    const verifyResponse = await secureHttpClient.get(
      `https://api.payment-gateway.com/v1/payments/${paymentResponse.data.id}`,
      {
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
        },
      }
    );

    console.log('   Payment status:', verifyResponse.data.status);

    console.log('\n✓ API integration completed successfully');
    console.log('  All communications encrypted with TLS 1.3');
  } catch (error: any) {
    console.error('Error in API integration:', error.message);
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         NexaERP TLS & Certificate Examples                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await example1_TLSConfiguration();
    await example2_CertificateInfo();
    await example3_CertificateValidation();
    await example4_CertificateMonitoring();
    await example5_SecureHttpClient();
    await example6_MutualTLS();
    await example7_ServiceToService();
    await example8_HTTPSServer();
    await example9_CertificateRotation();
    await example10_GenerateSelfSigned();
    await example11_ClientTLSOptions();
    await example12_ErrorHandling();
    await example13_APIIntegration();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              All Examples Completed Successfully!          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_TLSConfiguration,
  example2_CertificateInfo,
  example3_CertificateValidation,
  example4_CertificateMonitoring,
  example5_SecureHttpClient,
  example6_MutualTLS,
  example7_ServiceToService,
  example8_HTTPSServer,
  example9_CertificateRotation,
  example10_GenerateSelfSigned,
  example11_ClientTLSOptions,
  example12_ErrorHandling,
  example13_APIIntegration,
};
