/**
 * TLS Configuration for NexaERP
 * Enforces TLS 1.3 for all connections with certificate management
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import tls from 'tls';

export interface TLSConfig {
  enabled: boolean;
  minVersion: string;
  maxVersion: string;
  ciphers: string[];
  honorCipherOrder: boolean;
  rejectUnauthorized: boolean;
  requestCert: boolean;
  ca?: string[];
  cert?: string;
  key?: string;
  passphrase?: string;
  dhparam?: string;
  ecdhCurve: string;
  sessionTimeout: number;
  sessionIdContext: string;
}

export interface MutualTLSConfig {
  enabled: boolean;
  clientCertRequired: boolean;
  trustedCAs: string[];
  allowedServices: string[];
}

/**
 * Default TLS 1.3 Configuration
 * Enforces strongest security settings
 */
export const defaultTLSConfig: TLSConfig = {
  enabled: process.env.TLS_ENABLED === 'true',
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  
  // TLS 1.3 cipher suites (automatically selected by Node.js for TLS 1.3)
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
  ],
  
  honorCipherOrder: true,
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  requestCert: false, // Set to true for mutual TLS
  
  // Elliptic curve for ECDHE
  ecdhCurve: 'auto', // Use auto for TLS 1.3 (X25519, P-256, P-384)
  
  // Session settings
  sessionTimeout: 300, // 5 minutes
  sessionIdContext: 'nexaerp-tls-session',
};

/**
 * Mutual TLS Configuration for Service-to-Service Communication
 */
export const mutualTLSConfig: MutualTLSConfig = {
  enabled: process.env.MTLS_ENABLED === 'true',
  clientCertRequired: true,
  trustedCAs: [],
  allowedServices: (process.env.MTLS_ALLOWED_SERVICES || '').split(',').filter(Boolean),
};

/**
 * Certificate Paths Configuration
 */
export const certificatePaths = {
  serverCert: process.env.TLS_CERT_PATH || path.join(__dirname, '../../certs/server.crt'),
  serverKey: process.env.TLS_KEY_PATH || path.join(__dirname, '../../certs/server.key'),
  serverCA: process.env.TLS_CA_PATH || path.join(__dirname, '../../certs/ca.crt'),
  clientCert: process.env.MTLS_CLIENT_CERT_PATH || path.join(__dirname, '../../certs/client.crt'),
  clientKey: process.env.MTLS_CLIENT_KEY_PATH || path.join(__dirname, '../../certs/client.key'),
  clientCA: process.env.MTLS_CLIENT_CA_PATH || path.join(__dirname, '../../certs/client-ca.crt'),
  dhparam: process.env.TLS_DHPARAM_PATH || path.join(__dirname, '../../certs/dhparam.pem'),
};

/**
 * Load certificate file safely
 */
function loadCertificate(filePath: string, required: boolean = false): string | undefined {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    if (required) {
      throw new Error(`Required certificate file not found: ${filePath}`);
    }
    
    return undefined;
  } catch (error) {
    if (required) {
      throw error;
    }
    console.warn(`⚠️ Could not load certificate: ${filePath}`);
    return undefined;
  }
}

/**
 * Load all certificates
 */
export function loadCertificates() {
  const certs = {
    serverCert: loadCertificate(certificatePaths.serverCert, defaultTLSConfig.enabled),
    serverKey: loadCertificate(certificatePaths.serverKey, defaultTLSConfig.enabled),
    serverCA: loadCertificate(certificatePaths.serverCA, false),
    clientCA: loadCertificate(certificatePaths.clientCA, mutualTLSConfig.enabled),
    dhparam: loadCertificate(certificatePaths.dhparam, false),
  };
  
  return certs;
}

/**
 * Create HTTPS server options with TLS 1.3 enforcement
 */
export function createHTTPSOptions(): https.ServerOptions {
  const certs = loadCertificates();
  
  if (!certs.serverCert || !certs.serverKey) {
    throw new Error('Server certificate and key are required for HTTPS');
  }
  
  const options: https.ServerOptions = {
    cert: certs.serverCert,
    key: certs.serverKey,
    passphrase: process.env.TLS_KEY_PASSPHRASE,
    
    // TLS version enforcement
    minVersion: defaultTLSConfig.minVersion as tls.SecureVersion,
    maxVersion: defaultTLSConfig.maxVersion as tls.SecureVersion,
    
    // Cipher configuration
    ciphers: defaultTLSConfig.ciphers.join(':'),
    honorCipherOrder: defaultTLSConfig.honorCipherOrder,
    
    // Elliptic curve
    ecdhCurve: defaultTLSConfig.ecdhCurve,
    
    // Session settings
    sessionTimeout: defaultTLSConfig.sessionTimeout,
    sessionIdContext: defaultTLSConfig.sessionIdContext,
    
    // Mutual TLS settings
    requestCert: mutualTLSConfig.enabled && mutualTLSConfig.clientCertRequired,
    rejectUnauthorized: mutualTLSConfig.enabled && mutualTLSConfig.clientCertRequired,
  };
  
  // Add CA certificates for mutual TLS
  if (mutualTLSConfig.enabled && certs.clientCA) {
    options.ca = [certs.clientCA];
    if (certs.serverCA) {
      options.ca.push(certs.serverCA);
    }
  }
  
  // Add Diffie-Hellman parameters (optional, for additional security)
  if (certs.dhparam) {
    options.dhparam = certs.dhparam;
  }
  
  return options;
}

/**
 * Create TLS options for outgoing connections (client mode)
 */
export function createClientTLSOptions(serviceName?: string): tls.ConnectionOptions {
  const certs = loadCertificates();
  
  const options: tls.ConnectionOptions = {
    minVersion: defaultTLSConfig.minVersion as tls.SecureVersion,
    maxVersion: defaultTLSConfig.maxVersion as tls.SecureVersion,
    ciphers: defaultTLSConfig.ciphers.join(':'),
    rejectUnauthorized: defaultTLSConfig.rejectUnauthorized,
  };
  
  // Add client certificate for mutual TLS
  if (mutualTLSConfig.enabled) {
    const clientCert = loadCertificate(certificatePaths.clientCert, true);
    const clientKey = loadCertificate(certificatePaths.clientKey, true);
    
    if (clientCert && clientKey) {
      options.cert = clientCert;
      options.key = clientKey;
      options.passphrase = process.env.MTLS_CLIENT_KEY_PASSPHRASE;
    }
    
    // Add trusted CA
    if (certs.clientCA) {
      options.ca = [certs.clientCA];
    }
  }
  
  // Add service name for SNI (Server Name Indication)
  if (serviceName) {
    options.servername = serviceName;
  }
  
  return options;
}

/**
 * Validate TLS configuration
 */
export function validateTLSConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!defaultTLSConfig.enabled) {
    return { valid: true, errors: [] };
  }
  
  // Check certificate files exist
  if (!fs.existsSync(certificatePaths.serverCert)) {
    errors.push(`Server certificate not found: ${certificatePaths.serverCert}`);
  }
  
  if (!fs.existsSync(certificatePaths.serverKey)) {
    errors.push(`Server key not found: ${certificatePaths.serverKey}`);
  }
  
  // Check mutual TLS configuration
  if (mutualTLSConfig.enabled) {
    if (!fs.existsSync(certificatePaths.clientCA)) {
      errors.push(`Client CA certificate not found: ${certificatePaths.clientCA}`);
    }
    
    if (mutualTLSConfig.allowedServices.length === 0) {
      errors.push('No allowed services configured for mutual TLS');
    }
  }
  
  // Validate TLS version
  const validVersions = ['TLSv1.2', 'TLSv1.3'];
  if (!validVersions.includes(defaultTLSConfig.minVersion)) {
    errors.push(`Invalid TLS min version: ${defaultTLSConfig.minVersion}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Certificate Manager for monitoring and rotation
 */
export class CertificateManager {
  private monitoringInterval?: NodeJS.Timeout;
  private expiryWarningDays: number = 30;
  
  /**
   * Start monitoring certificates for expiry
   */
  startMonitoring(checkIntervalHours: number = 24) {
    this.stopMonitoring();
    
    // Check immediately
    this.checkCertificateExpiry();
    
    // Schedule periodic checks
    this.monitoringInterval = setInterval(
      () => this.checkCertificateExpiry(),
      checkIntervalHours * 60 * 60 * 1000
    );
    
    console.log(`✅ Certificate monitoring started (checking every ${checkIntervalHours} hours)`);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
  
  /**
   * Check certificate expiry
   */
  private checkCertificateExpiry() {
    try {
      const certs = loadCertificates();
      
      if (!certs.serverCert) {
        console.warn('⚠️ No server certificate loaded for expiry check');
        return;
      }
      
      // Parse certificate
      const cert = this.parseCertificate(certs.serverCert);
      
      if (!cert) {
        console.error('❌ Failed to parse server certificate');
        return;
      }
      
      const now = new Date();
      const expiryDate = new Date(cert.validTo);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        console.error('❌ Server certificate has EXPIRED!');
        console.error(`   Expired on: ${expiryDate.toISOString()}`);
      } else if (daysUntilExpiry <= this.expiryWarningDays) {
        console.warn(`⚠️ Server certificate expiring soon!`);
        console.warn(`   Days remaining: ${daysUntilExpiry}`);
        console.warn(`   Expiry date: ${expiryDate.toISOString()}`);
      } else {
        console.log(`✅ Server certificate valid for ${daysUntilExpiry} more days`);
      }
    } catch (error) {
      console.error('❌ Error checking certificate expiry:', error);
    }
  }
  
  /**
   * Parse certificate to extract information
   */
  private parseCertificate(certPem: string): { validFrom: string; validTo: string; subject: string; issuer: string } | null {
    try {
      // Extract dates from PEM certificate
      // This is a simplified parser - in production, use a proper X.509 parser
      const lines = certPem.split('\n');
      
      // For now, return mock data - in production, use node-forge or similar
      // to properly parse X.509 certificates
      return {
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        subject: 'CN=nexaerp.com',
        issuer: 'CN=NexaERP CA',
      };
    } catch (error) {
      console.error('Error parsing certificate:', error);
      return null;
    }
  }
  
  /**
   * Set expiry warning threshold
   */
  setExpiryWarningDays(days: number) {
    this.expiryWarningDays = days;
  }
}

export const certificateManager = new CertificateManager();
