/**
 * Generate Development TLS Certificates
 * Creates self-signed certificates for local development
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const CERT_DIR = path.join(__dirname, '../../certs');
const CONFIG = {
  country: 'US',
  state: 'California',
  locality: 'San Francisco',
  organization: 'NexaERP',
  organizationalUnit: 'Development',
  commonName: 'localhost',
  email: 'dev@nexaerp.com',
  validDays: 365,
};

/**
 * Create certificates directory
 */
function createCertDirectory() {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    console.log(`✅ Created certificates directory: ${CERT_DIR}`);
  }
}

/**
 * Generate CA (Certificate Authority)
 */
async function generateCA() {
  console.log('\n📜 Generating Certificate Authority (CA)...');
  
  const caKeyPath = path.join(CERT_DIR, 'ca.key');
  const caCertPath = path.join(CERT_DIR, 'ca.crt');
  
  // Generate CA private key
  await execAsync(
    `openssl genrsa -out "${caKeyPath}" 4096`
  );
  console.log('✅ CA private key generated');
  
  // Generate CA certificate
  await execAsync(
    `openssl req -new -x509 -days ${CONFIG.validDays} -key "${caKeyPath}" ` +
    `-out "${caCertPath}" ` +
    `-subj "/C=${CONFIG.country}/ST=${CONFIG.state}/L=${CONFIG.locality}/` +
    `O=${CONFIG.organization}/OU=${CONFIG.organizationalUnit}/CN=${CONFIG.organization} CA/` +
    `emailAddress=${CONFIG.email}"`
  );
  console.log('✅ CA certificate generated');
  
  return { caKeyPath, caCertPath };
}

/**
 * Generate server certificate
 */
async function generateServerCertificate(caKeyPath: string, caCertPath: string) {
  console.log('\n🖥️  Generating Server Certificate...');
  
  const serverKeyPath = path.join(CERT_DIR, 'server.key');
  const serverCsrPath = path.join(CERT_DIR, 'server.csr');
  const serverCertPath = path.join(CERT_DIR, 'server.crt');
  const serverExtPath = path.join(CERT_DIR, 'server.ext');
  
  // Generate server private key
  await execAsync(
    `openssl genrsa -out "${serverKeyPath}" 2048`
  );
  console.log('✅ Server private key generated');
  
  // Generate certificate signing request (CSR)
  await execAsync(
    `openssl req -new -key "${serverKeyPath}" -out "${serverCsrPath}" ` +
    `-subj "/C=${CONFIG.country}/ST=${CONFIG.state}/L=${CONFIG.locality}/` +
    `O=${CONFIG.organization}/OU=${CONFIG.organizationalUnit}/CN=${CONFIG.commonName}/` +
    `emailAddress=${CONFIG.email}"`
  );
  console.log('✅ Server CSR generated');
  
  // Create extensions file for SAN (Subject Alternative Names)
  const extContent = `
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
`;
  fs.writeFileSync(serverExtPath, extContent.trim());
  
  // Sign server certificate with CA
  await execAsync(
    `openssl x509 -req -in "${serverCsrPath}" -CA "${caCertPath}" ` +
    `-CAkey "${caKeyPath}" -CAcreateserial -out "${serverCertPath}" ` +
    `-days ${CONFIG.validDays} -sha256 -extfile "${serverExtPath}"`
  );
  console.log('✅ Server certificate signed by CA');
  
  // Clean up CSR and extensions file
  fs.unlinkSync(serverCsrPath);
  fs.unlinkSync(serverExtPath);
  
  return { serverKeyPath, serverCertPath };
}

/**
 * Generate client certificate (for mutual TLS)
 */
async function generateClientCertificate(caKeyPath: string, caCertPath: string) {
  console.log('\n👤 Generating Client Certificate (for mutual TLS)...');
  
  const clientKeyPath = path.join(CERT_DIR, 'client.key');
  const clientCsrPath = path.join(CERT_DIR, 'client.csr');
  const clientCertPath = path.join(CERT_DIR, 'client.crt');
  const clientCAPath = path.join(CERT_DIR, 'client-ca.crt');
  
  // Generate client private key
  await execAsync(
    `openssl genrsa -out "${clientKeyPath}" 2048`
  );
  console.log('✅ Client private key generated');
  
  // Generate certificate signing request (CSR)
  await execAsync(
    `openssl req -new -key "${clientKeyPath}" -out "${clientCsrPath}" ` +
    `-subj "/C=${CONFIG.country}/ST=${CONFIG.state}/L=${CONFIG.locality}/` +
    `O=${CONFIG.organization}/OU=${CONFIG.organizationalUnit}/CN=nexaerp-client/` +
    `emailAddress=${CONFIG.email}"`
  );
  console.log('✅ Client CSR generated');
  
  // Sign client certificate with CA
  await execAsync(
    `openssl x509 -req -in "${clientCsrPath}" -CA "${caCertPath}" ` +
    `-CAkey "${caKeyPath}" -CAcreateserial -out "${clientCertPath}" ` +
    `-days ${CONFIG.validDays} -sha256`
  );
  console.log('✅ Client certificate signed by CA');
  
  // Copy CA certificate as client CA
  fs.copyFileSync(caCertPath, clientCAPath);
  console.log('✅ Client CA certificate created');
  
  // Clean up CSR
  fs.unlinkSync(clientCsrPath);
  
  return { clientKeyPath, clientCertPath, clientCAPath };
}

/**
 * Generate DH parameters (optional, for additional security)
 */
async function generateDHParams() {
  console.log('\n🔐 Generating Diffie-Hellman parameters (this may take a while)...');
  
  const dhparamPath = path.join(CERT_DIR, 'dhparam.pem');
  
  try {
    await execAsync(
      `openssl dhparam -out "${dhparamPath}" 2048`
    );
    console.log('✅ DH parameters generated');
    return dhparamPath;
  } catch (error) {
    console.warn('⚠️ Failed to generate DH parameters (optional)');
    return null;
  }
}

/**
 * Display certificate information
 */
async function displayCertificateInfo(certPath: string, name: string) {
  console.log(`\n📋 ${name} Certificate Information:`);
  
  try {
    const { stdout } = await execAsync(
      `openssl x509 -in "${certPath}" -noout -subject -issuer -dates`
    );
    console.log(stdout);
  } catch (error) {
    console.error(`❌ Failed to read certificate info: ${error}`);
  }
}

/**
 * Create .env configuration
 */
function createEnvConfig() {
  const envPath = path.join(__dirname, '../../.env.tls');
  
  const envContent = `
# TLS Configuration (Development)
TLS_ENABLED=true
TLS_CERT_PATH=${path.join(CERT_DIR, 'server.crt')}
TLS_KEY_PATH=${path.join(CERT_DIR, 'server.key')}
TLS_CA_PATH=${path.join(CERT_DIR, 'ca.crt')}

# Mutual TLS Configuration (Optional)
MTLS_ENABLED=false
MTLS_CLIENT_CERT_PATH=${path.join(CERT_DIR, 'client.crt')}
MTLS_CLIENT_KEY_PATH=${path.join(CERT_DIR, 'client.key')}
MTLS_CLIENT_CA_PATH=${path.join(CERT_DIR, 'client-ca.crt')}
MTLS_ALLOWED_SERVICES=nexaerp-client,nexaerp-service

# Optional: DH Parameters
TLS_DHPARAM_PATH=${path.join(CERT_DIR, 'dhparam.pem')}
`;
  
  fs.writeFileSync(envPath, envContent.trim());
  console.log(`\n✅ TLS configuration saved to: ${envPath}`);
  console.log('   Add these variables to your .env file to enable TLS');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 NexaERP Development Certificate Generator');
    console.log('='.repeat(50));
    
    // Create certificates directory
    createCertDirectory();
    
    // Generate CA
    const { caKeyPath, caCertPath } = await generateCA();
    
    // Generate server certificate
    const { serverKeyPath, serverCertPath } = await generateServerCertificate(
      caKeyPath,
      caCertPath
    );
    
    // Generate client certificate
    const { clientKeyPath, clientCertPath, clientCAPath } = await generateClientCertificate(
      caKeyPath,
      caCertPath
    );
    
    // Generate DH parameters (optional)
    await generateDHParams();
    
    // Display certificate information
    await displayCertificateInfo(serverCertPath, 'Server');
    await displayCertificateInfo(clientCertPath, 'Client');
    
    // Create .env configuration
    createEnvConfig();
    
    console.log('\n✅ All certificates generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Add the TLS configuration from .env.tls to your .env file');
    console.log('   2. Trust the CA certificate in your system/browser:');
    console.log(`      - CA Certificate: ${caCertPath}`);
    console.log('   3. Restart the server with TLS_ENABLED=true');
    console.log('\n⚠️  Note: These certificates are for DEVELOPMENT ONLY');
    console.log('   Use proper certificates from a trusted CA in production');
    
  } catch (error) {
    console.error('\n❌ Error generating certificates:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as generateDevCertificates };
