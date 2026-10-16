/**
 * Deep Linking Configuration
 * 
 * Handles deep links for workflow approvals and other features
 * Supports:
 * - nexaerp://approval/:id
 * - nexaerp://order/:id
 * - nexaerp://inventory/:id
 * - https://nexaerp.com/app/approval/:id
 */

import { Linking } from 'react-native';

export interface DeepLinkConfig {
  prefixes: string[];
  config: {
    screens: {
      [key: string]: string | { path: string; parse?: any };
    };
  };
}

/**
 * Deep link configuration for React Navigation
 */
export const deepLinkConfig: DeepLinkConfig = {
  prefixes: ['nexaerp://', 'https://nexaerp.com', 'https://www.nexaerp.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Inventory: 'inventory',
          POS: 'pos',
          Orders: 'orders',
          Approvals: 'approvals',
          ApprovalDetails: {
            path: 'approval/:approvalId',
            parse: {
              approvalId: (approvalId: string) => approvalId,
            },
          },
          Profile: 'profile',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
    },
  },
};

/**
 * Parse deep link URL
 */
export const parseDeepLink = (url: string): { screen: string; params?: any } | null => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Parse approval deep link
    const approvalMatch = path.match(/\/approval\/([a-zA-Z0-9-]+)/);
    if (approvalMatch) {
      return {
        screen: 'ApprovalDetails',
        params: { approvalId: approvalMatch[1] },
      };
    }

    // Parse order deep link
    const orderMatch = path.match(/\/order\/([a-zA-Z0-9-]+)/);
    if (orderMatch) {
      return {
        screen: 'Orders',
        params: { orderId: orderMatch[1] },
      };
    }

    // Parse inventory deep link
    const inventoryMatch = path.match(/\/inventory\/([a-zA-Z0-9-]+)/);
    if (inventoryMatch) {
      return {
        screen: 'Inventory',
        params: { itemId: inventoryMatch[1] },
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
};

/**
 * Generate deep link URL
 */
export const generateDeepLink = (screen: string, params?: any): string => {
  const baseUrl = 'https://nexaerp.com';

  switch (screen) {
    case 'ApprovalDetails':
      return `${baseUrl}/approval/${params.approvalId}`;
    case 'Orders':
      return params.orderId ? `${baseUrl}/order/${params.orderId}` : `${baseUrl}/orders`;
    case 'Inventory':
      return params.itemId ? `${baseUrl}/inventory/${params.itemId}` : `${baseUrl}/inventory`;
    default:
      return baseUrl;
  }
};

/**
 * Handle deep link navigation
 */
export const handleDeepLink = async (
  url: string,
  navigation: any
): Promise<boolean> => {
  try {
    const linkData = parseDeepLink(url);

    if (!linkData) {
      return false;
    }

    // Navigate to the appropriate screen
    if (navigation) {
      navigation.navigate(linkData.screen, linkData.params);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error handling deep link:', error);
    return false;
  }
};

/**
 * Initialize deep link handling
 */
export const initializeDeepLinking = (navigation: any): void => {
  // Handle initial URL if app was opened by deep link
  Linking.getInitialURL().then(url => {
    if (url) {
      console.log('Initial URL:', url);
      handleDeepLink(url, navigation);
    }
  });

  // Handle subsequent deep links when app is running
  const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received:', url);
    handleDeepLink(url, navigation);
  });

  // Return cleanup function
  return () => {
    linkingSubscription.remove();
  };
};

/**
 * Share approval via deep link
 */
export const shareApprovalLink = async (approvalId: string): Promise<void> => {
  try {
    const url = generateDeepLink('ApprovalDetails', { approvalId });
    // Note: Share functionality would use react-native-share
    console.log('Share URL:', url);
  } catch (error) {
    console.error('Error sharing approval link:', error);
  }
};
