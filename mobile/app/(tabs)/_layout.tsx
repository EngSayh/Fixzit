import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  // Customize tabs based on user role
  const getTabsForRole = (role: string) => {
    const baseTabs = [
      { name: 'dashboard', title: 'Dashboard', icon: 'dashboard' },
    ];

    switch (role) {
      case 'admin':
      case 'super_admin':
        return [
          ...baseTabs,
          { name: 'work-orders', title: 'Work Orders', icon: 'build' },
          { name: 'properties', title: 'Properties', icon: 'business' },
          { name: 'finance', title: 'Finance', icon: 'account-balance' },
          { name: 'more', title: 'More', icon: 'more-horiz' },
        ];
      
      case 'property_manager':
        return [
          ...baseTabs,
          { name: 'work-orders', title: 'Work Orders', icon: 'build' },
          { name: 'properties', title: 'Properties', icon: 'business' },
          { name: 'tenants', title: 'Tenants', icon: 'people' },
          { name: 'more', title: 'More', icon: 'more-horiz' },
        ];
      
      case 'technician':
        return [
          ...baseTabs,
          { name: 'my-tasks', title: 'My Tasks', icon: 'assignment' },
          { name: 'scanner', title: 'Scanner', icon: 'qr-code-scanner' },
          { name: 'profile', title: 'Profile', icon: 'person' },
        ];
      
      case 'tenant':
        return [
          ...baseTabs,
          { name: 'my-requests', title: 'My Requests', icon: 'request-page' },
          { name: 'payments', title: 'Payments', icon: 'payment' },
          { name: 'profile', title: 'Profile', icon: 'person' },
        ];
      
      default:
        return baseTabs;
    }
  };

  const tabs = getTabsForRole(user?.role || 'tenant');

  const getIconComponent = (iconName: string, focused: boolean) => {
    const color = focused ? '#0078D4' : '#666';
    const size = 24;

    // Map icon names to actual icon components
    switch (iconName) {
      case 'dashboard':
        return <MaterialIcons name="dashboard" size={size} color={color} />;
      case 'build':
        return <MaterialIcons name="build" size={size} color={color} />;
      case 'business':
        return <MaterialIcons name="business" size={size} color={color} />;
      case 'account-balance':
        return <MaterialIcons name="account-balance" size={size} color={color} />;
      case 'people':
        return <MaterialIcons name="people" size={size} color={color} />;
      case 'assignment':
        return <MaterialIcons name="assignment" size={size} color={color} />;
      case 'qr-code-scanner':
        return <MaterialIcons name="qr-code-scanner" size={size} color={color} />;
      case 'request-page':
        return <MaterialIcons name="request-page" size={size} color={color} />;
      case 'payment':
        return <MaterialIcons name="payment" size={size} color={color} />;
      case 'person':
        return <MaterialIcons name="person" size={size} color={color} />;
      case 'more-horiz':
        return <MaterialIcons name="more-horiz" size={size} color={color} />;
      default:
        return <MaterialIcons name="dashboard" size={size} color={color} />;
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0078D4',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#0078D4',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => getIconComponent(tab.icon, focused),
            headerShown: true,
          }}
        />
      ))}
    </Tabs>
  );
}