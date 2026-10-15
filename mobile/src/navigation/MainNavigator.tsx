/**
 * Main Navigator
 * 
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from '../screens/main/DashboardScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import POSScreen from '../screens/main/POSScreen';
import OrdersScreen from '../screens/main/OrdersScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ApprovalsScreen from '../screens/main/ApprovalsScreen';
import ApprovalDetailsScreen from '../screens/main/ApprovalDetailsScreen';
import QuickActionsScreen from '../screens/main/QuickActionsScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  POS: undefined;
  Orders: undefined;
  Approvals: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ApprovalDetails: { approvalId: string };
  QuickActions: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

interface MainNavigatorProps {
  onLogout: () => void;
}

const MainTabs: React.FC<MainNavigatorProps> = ({onLogout}) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
          title: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="checkbox-marked-circle" size={size} color={color} />
          ),
          title: 'Approvals',
          tabBarBadge: undefined, // Can be set dynamically for pending count
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="package-variant" size={size} color={color} />
          ),
          title: 'Inventory',
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="file-document" size={size} color={color} />
          ),
          title: 'Orders',
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="account" size={size} color={color} />
          ),
          title: 'Profile',
        }}>
        {props => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC<MainNavigatorProps> = ({onLogout}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MainTabs">
        {props => <MainTabs {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="ApprovalDetails"
        component={ApprovalDetailsScreen}
        options={{
          headerShown: true,
          title: 'Approval Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="QuickActions"
        component={QuickActionsScreen}
        options={{
          headerShown: true,
          title: 'Quick Actions',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
