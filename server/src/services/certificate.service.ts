/**
 * Certificate Management Service
 * Handles certificate lifecycle, validation, and rotation
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { certificatePaths } from '../config/tls.config';
import { auditLogger } from './audit.service';

const execAsync = promisify(exec);

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
  daysUntilExpiry: number;
}

export interface CertificateValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CertificateStatus {
  valid: boolean;
  info?: CertificateInfo;
  validation: CertificateValidation;
}

/**
 * Certificate Service for managing TLS certificates
 */
class CertificateService {
  private monitoringInterval?: NodeJS.Timeout;
  private expiryWarningDays: number = 30;
  private criticalExpiryDays: number = 7;
  
  /**
   * Get certificate information
   */
  async getCertificateInfo(certPath: string): Promise<CertificateInfo | null> {
    try {
      if (!fs.existsSync(certPath)) {
        return null;
      }
      
      // Use OpenSSL to parse certificate
      const { stdout } = await execAsync(
        `openssl x509 -in "${certPath}" -noout -subject -issuer -dates -serial -fingerprint`
      );
      
      const lines = stdout.split('\n');
      const info: any = {};
      
      for (const line of lines) {
        if (line.startsWith('subject=')) {
          info.subject = line.substring('subject='.length).trim();
        } else if (line.startsWith('issuer=')) {
          info.issuer = line.substring('issuer='.length).trim();
        } else if (line.startsWith('notBefore=')) {
          info.validFrom = new Date(line.substring('notBefore='.length).trim());
        } else if (line.startsWith('notAfter=')) {
          info.validTo = new Date(line.substring('notAfter='.length).trim());
        } else if (line.startsWith('serial=')) {
          info.serialNumber = line.substring('serial='.length).trim();
        } else if (line.startsWith('SHA256 Fingerprint=')) {
          info.fingerprint = line.substring('SHA256 Fingerprint='.length).trim();
        }
      }
      
      // Calculate days until expiry
      const now = new Date();
      info.daysUntilExpiry = Math.floor(
        (info.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return info as CertificateInfo;
    } catch (error) {
      console.error('Error getting certificate info:', error);
      return null;
    }
  }
  
  /**
   * Validate certificate
   */
  async validateCertificate(certPath: string, keyPath?: string): Promise<CertificateValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if certificate file exists
      if (!fs.existsSync(certPath)) {
        errors.push(`Certificate file not found: ${certPath}`);
        return { valid: false, errors, warnings };
      }
      
      // Get certificate info
      const info = await this.getCertificateInfo(certPath);
      
      if (!info) {
        errors.push('Failed to parse certificate');
        return { valid: false, errors, warnings };
      }
      
      // Check if certificate is expired
      const now = new Date();
      if (info.validTo < now) {
        errors.push(`Certificate expired on ${info.validTo.toISOString()}`);
      }
      
      // Check if certificate is not yet valid
      if (info.validFrom > now) {
        errors.push(`Certificate not yet valid (valid from ${info.validFrom.toISOString()})`);
      }
      
      // Warn if certificate is expiring soon
      if (info.daysUntilExpiry <= this.criticalExpiryDays) {
        warnings.push(`Certificate expires in ${info.daysUntilExpiry} days (CRITICAL)`);
      } else if (info.daysUntilExpiry <= this.expiryWarningDays) {
        warnings.push(`Certificate expires in ${info.daysUntilExpiry} days`);
      }
      
      // Validate key matches certificate (if key provided)
      if (keyPath && fs.existsSync(keyPath)) {
        const keyValid = await this.validateKeyPair(certPath, keyPath);
        if (!keyValid) {
          errors.push('Private key does not match certificate');
        }
      }
      
      // Validate certificate chain
      const chainValid = await this.validateCertificateChain(certPath);
      if (!chainValid) {
        warnings.push('Certificate chain validation failed');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { valid: false, errors, warnings };
    }
  }
  
  /**
   * Validate private key matches certificate
   */
  private async validateKeyPair(certPath: string, keyPath: string): Promise<boolean> {
    try {
      // Get certificate modulus
      const { stdout: certModulus } = await execAsync(
        `openssl x509 -in "${certPath}" -noout -modulus`
      );
      
      // Get key modulus
      const { stdout: keyModulus } = await execAsync(
        `openssl rsa -in "${keyPath}" -noout -modulus 2>/dev/null || openssl ec -in "${keyPath}" -noout -text`
      );
      
      // Compare moduli (for RSA keys)
      if (certModulus.includes('Modulus=') && keyModulus.includes('Modulus=')) {
        return certModulus.trim() === keyModulus.trim();
      }
      
      // For EC keys, just check if key is valid
      return keyModulus.length > 0;
    } catch (error) {
      console.error('Error validating key pair:', error);
      return false;
    }
  }
  
  /**
   * Validate certificate chain
   */
  private async validateCertificateChain(certPath: string): Promise<boolean> {
    try {
      const caPath = certificatePaths.serverCA;
      
      if (!fs.existsSync(caPath)) {
        // No CA certificate to validate against
        return true;
      }
      
      // Verify certificate against CA
      await execAsync(
        `openssl verify -CAfile "${caPath}" "${certPath}"`
      );
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get certificate status (info + validation)
   */
  async getCertificateStatus(certPath?: string): Promise<CertificateStatus> {
    const path = certPath || certificatePaths.serverCert;
    
    const validation = await this.validateCertificate(
      path,
      certPath ? undefined : certificatePaths.serverKey
    );
    
    const info = await this.getCertificateInfo(path);
    
    return {
      valid: validation.valid,
      info: info || undefined,
      validation,
    };
  }
  
  /**
   * Start certificate monitoring
   */
  startMonitoring(checkIntervalHours: number = 24) {
    this.stopMonitoring();
    
    // Check immediately
    this.checkCertificates();
    
    // Schedule periodic checks
    this.monitoringInterval = setInterval(
      () => this.checkCertificates(),
      checkIntervalHours * 60 * 60 * 1000
    );
    
    console.log(`✅ Certificate monitoring started (checking every ${checkIntervalHours} hours)`);
  }
  
  /**
   * Stop certificate monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
  
  /**
   * Check all certificates
   */
  private async checkCertificates() {
    try {
      // Check server certificate
      const serverStatus = await this.getCertificateStatus();
      
      if (!serverStatus.valid) {
        console.error('❌ Server certificate validation failed:');
        serverStatus.validation.errors.forEach(err => console.error(`   - ${err}`));
        
        await auditLogger.log({
          userId: 'system',
          action: 'certificate.validation_failed',
          resource: 'tls_certificate',
          details: {
            type: 'server',
            errors: serverStatus.validation.errors,
          },
          ipAddress: 'system',
          userAgent: 'certificate-monitor',
        });
      }
      
      if (serverStatus.validation.warnings.length > 0) {
        console.warn('⚠️ Server certificate warnings:');
        serverStatus.validation.warnings.forEach(warn => console.warn(`   - ${warn}`));
        
        await auditLogger.log({
          userId: 'system',
          action: 'certificate.expiry_warning',
          resource: 'tls_certificate',
          details: {
            type: 'server',
            warnings: serverStatus.validation.warnings,
            daysUntilExpiry: serverStatus.info?.daysUntilExpiry,
          },
          ipAddress: 'system',
          userAgent: 'certificate-monitor',
        });
      }
      
      if (serverStatus.info) {
        console.log(`✅ Server certificate valid until ${serverStatus.info.validTo.toISOString()}`);
        console.log(`   Days remaining: ${serverStatus.info.daysUntilExpiry}`);
      }
      
      // Check client certificate (for mutual TLS)
      if (fs.existsSync(certificatePaths.clientCert)) {
        const clientStatus = await this.getCertificateStatus(certificatePaths.clientCert);
        
        if (!clientStatus.valid) {
          console.error('❌ Client certificate validation failed:');
          clientStatus.validation.errors.forEach(err => console.error(`   - ${err}`));
        }
        
        if (clientStatus.validation.warnings.length > 0) {
          console.warn('⚠️ Client certificate warnings:');
          clientStatus.validation.warnings.forEach(warn => console.warn(`   - ${warn}`));
        }
      }
    } catch (error) {
      console.error('❌ Error checking certificates:', error);
    }
  }
  
  /**
   * Generate self-signed certificate (for development)
   */
  async generateSelfSignedCertificate(
    commonName: string = 'localhost',
    validDays: number = 365
  ): Promise<boolean> {
    try {
      const certDir = path.dirname(certificatePaths.serverCert);
      
      // Create certs directory if it doesn't exist
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }
      
      // Generate private key
      await execAsync(
        `openssl genrsa -out "${certificatePaths.serverKey}" 2048`
      );
      
      // Generate self-signed certificate
      await execAsync(
        `openssl req -new -x509 -key "${certificatePaths.serverKey}" ` +
        `-out "${certificatePaths.serverCert}" -days ${validDays} ` +
        `-subj "/CN=${commonName}"`
      );
      
      console.log(`✅ Self-signed certificate generated for ${commonName}`);
      
      await auditLogger.log({
        userId: 'system',
        action: 'certificate.generated',
        resource: 'tls_certificate',
        details: {
          type: 'self-signed',
          commonName,
          validDays,
        },
        ipAddress: 'system',
        userAgent: 'certificate-service',
      });
      
      return true;
    } catch (error) {
      console.error('Error generating self-signed certificate:', error);
      return false;
    }
  }
  
  /**
   * Rotate certificate
   */
  async rotateCertificate(
    newCertPath: string,
    newKeyPath: string,
    backup: boolean = true
  ): Promise<boolean> {
    try {
      // Validate new certificate
      const validation = await this.validateCertificate(newCertPath, newKeyPath);
      
      if (!validation.valid) {
        console.error('❌ New certificate validation failed:');
        validation.errors.forEach(err => console.error(`   - ${err}`));
        return false;
      }
      
      // Backup old certificates
      if (backup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(path.dirname(certificatePaths.serverCert), 'backup');
        
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        if (fs.existsSync(certificatePaths.serverCert)) {
          fs.copyFileSync(
            certificatePaths.serverCert,
            path.join(backupDir, `server-${timestamp}.crt`)
          );
        }
        
        if (fs.existsSync(certificatePaths.serverKey)) {
          fs.copyFileSync(
            certificatePaths.serverKey,
            path.join(backupDir, `server-${timestamp}.key`)
          );
        }
      }
      
      // Copy new certificates
      fs.copyFileSync(newCertPath, certificatePaths.serverCert);
      fs.copyFileSync(newKeyPath, certificatePaths.serverKey);
      
      console.log('✅ Certificate rotated successfully');
      
      await auditLogger.log({
        userId: 'system',
        action: 'certificate.rotated',
        resource: 'tls_certificate',
        details: {
          backup,
        },
        ipAddress: 'system',
        userAgent: 'certificate-service',
      });
      
      return true;
    } catch (error) {
      console.error('Error rotating certificate:', error);
      return false;
    }
  }
  
  /**
   * Set expiry warning thresholds
   */
  setExpiryThresholds(warningDays: number, criticalDays: number) {
    this.expiryWarningDays = warningDays;
    this.criticalExpiryDays = criticalDays;
  }
}

export const certificateService = new CertificateService();
