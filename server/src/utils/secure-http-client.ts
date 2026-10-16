/**
 * Secure HTTP Client with TLS 1.3 and Mutual TLS Support
 * For making secure service-to-service requests
 */

import https from 'https';
import { createClientTLSOptions } from '../config/tls.config';
import { auditLogger } from '../services/audit.service';

export interface SecureRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  serviceName?: string;
}

export interface SecureResponse<T = any> {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  data: T;
}

/**
 * Secure HTTP Client for service-to-service communication
 */
export class SecureHttpClient {
  private defaultTimeout: number = 30000; // 30 seconds
  
  /**
   * Make a secure HTTPS request with TLS 1.3 and optional mutual TLS
   */
  async request<T = any>(
    url: string,
    options: SecureRequestOptions = {}
  ): Promise<SecureResponse<T>> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        
        // Create TLS options
        const tlsOptions = createClientTLSOptions(options.serviceName);
        
        // Prepare request options
        const requestOptions: https.RequestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NexaERP-SecureClient/2.0',
            ...options.headers,
          },
          timeout: options.timeout || this.defaultTimeout,
          ...tlsOptions,
        };
        
        // Add Content-Length for POST/PUT/PATCH
        if (options.body && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method || '')) {
          const bodyString = typeof options.body === 'string' 
            ? options.body 
            : JSON.stringify(options.body);
          requestOptions.headers!['Content-Length'] = Buffer.byteLength(bodyString);
        }
        
        // Make request
        const req = https.request(requestOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsedData = data ? JSON.parse(data) : null;
              
              // Log successful request
              auditLogger.log({
                userId: 'system',
                action: 'secure_http.request',
                resource: 'external_service',
                details: {
                  url: urlObj.hostname + urlObj.pathname,
                  method: requestOptions.method,
                  status: res.statusCode,
                  tlsVersion: (res.socket as any).getProtocol?.(),
                },
                ipAddress: 'system',
                userAgent: 'secure-http-client',
              });
              
              resolve({
                status: res.statusCode || 200,
                headers: res.headers,
                data: parsedData,
              });
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error}`));
            }
          });
        });
        
        // Handle errors
        req.on('error', (error) => {
          auditLogger.log({
            userId: 'system',
            action: 'secure_http.error',
            resource: 'external_service',
            details: {
              url: urlObj.hostname + urlObj.pathname,
              method: requestOptions.method,
              error: error.message,
            },
            ipAddress: 'system',
            userAgent: 'secure-http-client',
          });
          
          reject(error);
        });
        
        // Handle timeout
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request timeout after ${requestOptions.timeout}ms`));
        });
        
        // Send body if present
        if (options.body) {
          const bodyString = typeof options.body === 'string' 
            ? options.body 
            : JSON.stringify(options.body);
          req.write(bodyString);
        }
        
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Make a GET request
   */
  async get<T = any>(url: string, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<SecureResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }
  
  /**
   * Make a POST request
   */
  async post<T = any>(url: string, body: any, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<SecureResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }
  
  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, body: any, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<SecureResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }
  
  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, body: any, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<SecureResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<SecureResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
  
  /**
   * Set default timeout
   */
  setDefaultTimeout(timeout: number) {
    this.defaultTimeout = timeout;
  }
}

// Export singleton instance
export const secureHttpClient = new SecureHttpClient();
