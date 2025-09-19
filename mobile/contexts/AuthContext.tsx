import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  permissions: string[];
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Simulate API call - replace with actual API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.token) {
          const userData: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            organizationId: data.user.organizationId,
            permissions: data.user.permissions || [],
            avatar: data.user.avatar,
          };

          // Store securely
          await SecureStore.setItemAsync('auth_token', data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(userData));

          setToken(data.token);
          setUser(userData);

          return { success: true };
        } else {
          return { success: false, error: data.message || 'Login failed' };
        }
      } else {
        // Fallback for demo - remove in production
        return await handleDemoLogin(email, password);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      // Fallback for demo when API is not available
      return await handleDemoLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Demo users for testing
    const demoUsers = {
      'admin@fixzit.com': {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@fixzit.com',
        role: 'admin',
        organizationId: 'org-1',
        permissions: [
          'dashboard.read',
          'work-orders.read',
          'work-orders.create',
          'work-orders.update',
          'properties.read',
          'properties.create',
          'finance.read',
          'hr.read',
          'admin.read',
        ],
      },
      'manager@fixzit.com': {
        id: 'manager-1',
        name: 'Property Manager',
        email: 'manager@fixzit.com',
        role: 'property_manager',
        organizationId: 'org-1',
        permissions: [
          'dashboard.read',
          'work-orders.read',
          'work-orders.create',
          'properties.read',
        ],
      },
      'tech@fixzit.com': {
        id: 'tech-1',
        name: 'Technician',
        email: 'tech@fixzit.com',
        role: 'technician',
        organizationId: 'org-1',
        permissions: [
          'dashboard.read',
          'work-orders.read',
          'work-orders.update',
        ],
      },
      'tenant@fixzit.com': {
        id: 'tenant-1',
        name: 'Tenant User',
        email: 'tenant@fixzit.com',
        role: 'tenant',
        organizationId: 'org-1',
        permissions: [
          'dashboard.read',
          'requests.create',
          'payments.read',
        ],
      },
    };

    if (password === 'password123' && demoUsers[email]) {
      const userData = demoUsers[email];
      const demoToken = `demo_token_${Date.now()}`;

      // Store demo data
      await SecureStore.setItemAsync('auth_token', demoToken);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      setToken(demoToken);
      setUser(userData);

      return { success: true };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      // Clear stored data
      await SecureStore.deleteItemAsync('auth_token');
      await AsyncStorage.removeItem('user_data');

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signOut,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};