/**
 * Generate Self-Signed Certificates for Development
 * WARNING: Only use for development/testing, never in production
 */

import { CertificateManager } from '../config/tls.config';
import path from 'path';
import fs from 'fs';

const certsDir = path.join(__dirname, '../../certs');

console.log('🔐 Generating self-signed certificates for development...\n');

// Check if certificates already exist
const certPath = path.join(certsDir, 'server.crt');
const keyPath = path.join(certsDir, 'server.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('⚠️ Certificates already exist:');
  console.log(`   Certificate: ${certPath}`);
  console.log(`   Private Key: ${keyPath}`);
  console.log('\nTo regenerate, delete existing certificates and run this script again.\n');
  process.exit(0);
}

try {
  CertificateManager.generateSelfSignedCertificate(certsDir);
  
  console.log('\n✅ Self-signed certificates generated successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Set TLS_ENABLED=true in your .env file');
  console.log('   2. Set TLS_CERT_PATH and TLS_KEY_PATH if using custom paths');
  console.log('   3. Restart the server');
  console.log('\n⚠️ IMPORTANT: These are self-signed certificates for development only.');
  console.log('   For production, obtain certificates from a trusted Certificate Authority.\n');
  
  // Generate client certificates for mutual TLS testing
  console.log('🔐 Generating client certificates for mutual TLS testing...\n');
  
  const clientCertPath = path.join(certsDir, 'client.crt');
  const clientKeyPath = path.join(certsDir, 'client.key');
  
  if (!fs.existsSync(clientCertPath) && !fs.existsSync(clientKeyPath)) {
    const { execSync } = require('child_process');
    
    // Generate client private key
    execSync(
      `openssl genrsa -out ${clientKeyPath} 2048`,
      { stdio: 'inherit' }
    );
    
    // Generate client certificate
    execSync(
      `openssl req -new -x509 -key ${clientKeyPath} -out ${clientCertPath} -days 365 ` +
      `-subj "/C=US/ST=State/L=City/O=NexaERP/CN=client"`,
      { stdio: 'inherit' }
    );
    
    console.log('✅ Client certificates generated for mutual TLS');
    console.log(`   Client Certificate: ${clientCertPath}`);
    console.log(`   Client Private Key: ${clientKeyPath}`);
  }
  
  // Generate CA certificate for mutual TLS
  const caPath = path.join(certsDir, 'ca.crt');
  const caKeyPath = path.join(certsDir, 'ca.key');
  
  if (!fs.existsSync(caPath) && !fs.existsSync(caKeyPath)) {
    const { execSync } = require('child_process');
    
    // Generate CA private key
    execSync(
      `openssl genrsa -out ${caKeyPath} 2048`,
      { stdio: 'inherit' }
    );
    
    // Generate CA certificate
    execSync(
      `openssl req -new -x509 -key ${caKeyPath} -out ${caPath} -days 365 ` +
      `-subj "/C=US/ST=State/L=City/O=NexaERP/CN=NexaERP-CA"`,
      { stdio: 'inherit' }
    );
    
    console.log('✅ CA certificate generated');
    console.log(`   CA Certificate: ${caPath}`);
    console.log(`   CA Private Key: ${caKeyPath}`);
  }
  
  console.log('\n📋 Mutual TLS setup:');
  console.log('   1. Set MTLS_ENABLED=true in your .env file');
  console.log('   2. Configure client certificate paths');
  console.log('   3. Use client certificates for service-to-service calls\n');
  
} catch (error) {
  console.error('❌ Failed to generate certificates:', error);
  console.error('\nMake sure OpenSSL is installed and available in your PATH.');
  console.error('Install OpenSSL:');
  console.error('   - Windows: https://slproweb.com/products/Win32OpenSSL.html');
  console.error('   - macOS: brew install openssl');
  console.error('   - Linux: apt-get install openssl or yum install openssl\n');
  process.exit(1);
}
