/**
 * API Service
 * 
 * Centralized API client for making HTTP requests to the backend
 * Handles authentication, error handling, and offline support
 */

import axios, {AxiosInstance, AxiosError, AxiosRequestConfig} from 'axios';
import {API_CONFIG} from '../config/api';
import {AuthService} from './auth.service';
import {OfflineService} from './offline.service';
import NetInfo from '@react-native-community/netinfo';

class ApiService {
  private client: AxiosInstance;
  private isOnline: boolean = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkListener();
  }

  /**
   * Setup axios interceptors for request/response handling
   */
  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async config => {
        const token = await AuthService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      response => response.data,
      async (error: AxiosError) => {
        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401) {
          try {
            const refreshed = await AuthService.refreshToken();
            if (refreshed) {
              // Retry the original request
              const originalRequest = error.config;
              if (originalRequest) {
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await AuthService.logout();
            throw new Error('Session expired. Please login again.');
          }
        }

        // Handle other errors
        return this.handleError(error);
      },
    );
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      
      if (this.isOnline) {
        // When back online, sync offline data
        OfflineService.syncOfflineData();
      }
    });
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error
      const message =
        (error.response.data as any)?.error ||
        (error.response.data as any)?.message ||
        'An error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Check if device is online
   */
  public checkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * GET request
   */
  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (!this.isOnline) {
      // Try to get from offline cache
      const cached = await OfflineService.getCachedData(url);
      if (cached) {
        return cached;
      }
      throw new Error('No internet connection and no cached data available');
    }

    const response = await this.client.get<T>(url, config);
    
    // Cache the response for offline use
    await OfflineService.cacheData(url, response);
    
    return response as T;
  }

  /**
   * POST request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (!this.isOnline) {
      // Queue request for later sync
      await OfflineService.queueRequest({
        method: 'POST',
        url,
        data,
        config,
      });
      throw new Error('Request queued for sync when online');
    }

    return this.client.post<T>(url, data, config) as Promise<T>;
  }

  /**
   * PUT request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (!this.isOnline) {
      // Queue request for later sync
      await OfflineService.queueRequest({
        method: 'PUT',
        url,
        data,
        config,
      });
      throw new Error('Request queued for sync when online');
    }

    return this.client.put<T>(url, data, config) as Promise<T>;
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (!this.isOnline) {
      // Queue request for later sync
      await OfflineService.queueRequest({
        method: 'DELETE',
        url,
        config,
      });
      throw new Error('Request queued for sync when online');
    }

    return this.client.delete<T>(url, config) as Promise<T>;
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (!this.isOnline) {
      // Queue request for later sync
      await OfflineService.queueRequest({
        method: 'PATCH',
        url,
        data,
        config,
      });
      throw new Error('Request queued for sync when online');
    }

    return this.client.patch<T>(url, data, config) as Promise<T>;
  }
}

export default new ApiService();
