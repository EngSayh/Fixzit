/**
 * @fileoverview Navigation Setup for Technician Mobile App
 * @module technician-app/navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens
function ScheduleScreen() {
  return null; // TODO: Implement
}

function WorkOrdersScreen() {
  return null; // TODO: Implement
}

function ProfileScreen() {
  return null; // TODO: Implement
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#25935F',
        tabBarInactiveTintColor: '#888',
        headerStyle: {
          backgroundColor: '#25935F',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <TabIcon name="🏠" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <TabIcon name="📅" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          title: 'Work Orders',
          tabBarIcon: ({ color }) => (
            <TabIcon name="🔧" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabIcon name="👤" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple emoji icon component
function TabIcon({ name }: { name: string; color: string }) {
  return (
    <React.Fragment>
      {name}
    </React.Fragment>
  );
}

// Root Navigator
export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // TODO: Show splash screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Add detail screens here */}
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
