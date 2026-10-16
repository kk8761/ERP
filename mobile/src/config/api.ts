/**
 * API Configuration
 * 
 * Configure API endpoints and connection settings for the backend server
 */

export const API_CONFIG = {
  // Base URL for the backend API
  // In production, this should come from environment variables
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000' // Development server
    : 'https://api.nexaerp.com', // Production server
  
  // API timeout in milliseconds
  TIMEOUT: 30000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_TOKEN: '/api/auth/verify',
  },
  
  // User endpoints
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile',
    CHANGE_PASSWORD: '/api/user/change-password',
  },
  
  // Inventory endpoints
  INVENTORY: {
    LIST: '/api/inventory',
    CREATE: '/api/inventory',
    GET: (id: string) => `/api/inventory/${id}`,
    UPDATE: (id: string) => `/api/inventory/${id}`,
    DELETE: (id: string) => `/api/inventory/${id}`,
    SCAN: '/api/inventory/scan',
  },
  
  // POS endpoints
  POS: {
    CREATE_SALE: '/api/pos/sale',
    GET_SALE: (id: string) => `/api/pos/sale/${id}`,
    LIST_SALES: '/api/pos/sales',
  },
  
  // Orders endpoints
  ORDERS: {
    LIST: '/api/orders',
    CREATE: '/api/orders',
    GET: (id: string) => `/api/orders/${id}`,
    UPDATE: (id: string) => `/api/orders/${id}`,
  },
  
  // Dashboard endpoints
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    REVENUE: '/api/dashboard/revenue',
  },
  
  // Notifications endpoints
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    REGISTER_DEVICE: '/api/notifications/register-device',
  },
};
