/**
 * Authentication Service
 * 
 * Handles user authentication, token management, and session persistence
 * Uses secure storage (Keychain on iOS, Keystore on Android)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import axios from 'axios';
import {API_CONFIG, API_ENDPOINTS} from '../config/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const STORAGE_KEYS = {
  USER: '@nexaerp:user',
  REFRESH_TOKEN: '@nexaerp:refresh_token',
};

class AuthServiceClass {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: {
          user: User;
          token: string;
          refreshToken: string;
        };
      }>(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, credentials);

      if (!response.data.success) {
        throw new Error('Login failed');
      }

      const {user, token, refreshToken} = response.data.data;

      // Store tokens securely
      await this.storeTokens({
        accessToken: token,
        refreshToken: refreshToken,
      });

      // Store user info
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      this.user = user;
      this.accessToken = token;
      this.refreshToken = refreshToken;

      return user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  /**
   * Logout and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      if (this.accessToken) {
        await axios.post(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          },
        );
      }
    } catch (error) {
      // Ignore logout errors, proceed with local cleanup
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data
      await this.clearTokens();
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  /**
   * Store authentication tokens securely
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      // Store access token in secure keychain
      await Keychain.setGenericPassword('accessToken', tokens.accessToken, {
        service: 'nexaerp.access',
      });

      // Store refresh token in AsyncStorage (less critical)
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Get access token from secure storage
   */
  async getToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'nexaerp.access',
      });

      if (credentials) {
        this.accessToken = credentials.password;
        return this.accessToken;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }

    return null;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        this.refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      }

      if (!this.refreshToken) {
        return false;
      }

      const response = await axios.post<{
        success: boolean;
        data: {
          token: string;
          refreshToken: string;
        };
      }>(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        refreshToken: this.refreshToken,
      });

      if (!response.data.success) {
        return false;
      }

      const {token, refreshToken} = response.data.data;

      await this.storeTokens({
        accessToken: token,
        refreshToken: refreshToken,
      });

      this.accessToken = token;
      this.refreshToken = refreshToken;

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.user) {
      return this.user;
    }

    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userStr) {
        this.user = JSON.parse(userStr);
        return this.user;
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }

    return null;
  }

  /**
   * Clear all stored tokens
   */
  private async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({service: 'nexaerp.access'});
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.VERIFY_TOKEN}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}

export const AuthService = new AuthServiceClass();
