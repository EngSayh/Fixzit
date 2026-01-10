/**
 * @fileoverview Authentication Context for Technician Mobile App
 * @module technician-app/contexts/AuthContext
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_CONFIG, ENDPOINTS } from '../config/api';
import type { MobileUser, AuthTokens, MobileLoginRequest, MobileLoginResponse } from '../types';

// State types
interface AuthState {
  user: MobileUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: string;
}

// Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: MobileUser; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'TOKEN_REFRESH'; payload: AuthTokens };

// Context type
interface AuthContextType extends AuthState {
  login: (credentials: MobileLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: undefined };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isLoading: false,
        isAuthenticated: true,
        error: undefined,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        tokens: action.payload,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER),
      ]);

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson) as MobileUser;
        const tokens: AuthTokens = {
          accessToken,
          refreshToken,
          expiresAt: '', // Will be validated on next API call
        };
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, tokens } });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }

  async function login(credentials: MobileLoginRequest): Promise<void> {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: MobileLoginResponse = await response.json();

      // Store tokens securely
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken),
        SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(data.user)),
      ]);

      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, tokens: data.tokens } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  }

  async function logout(): Promise<void> {
    try {
      if (state.tokens?.accessToken) {
        await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.LOGOUT}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.tokens.accessToken}`,
          },
        }).catch(() => {
          // Ignore logout API errors
        });
      }
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER),
      ]);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }

  async function refreshTokens(): Promise<boolean> {
    if (!state.tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: state.tokens.refreshToken }),
      });

      if (!response.ok) {
        await logout();
        return false;
      }

      const data = await response.json();
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      };

      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newTokens.accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refreshToken),
      ]);

      dispatch({ type: 'TOKEN_REFRESH', payload: newTokens });
      return true;
    } catch {
      await logout();
      return false;
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
