/**
 * @fileoverview Main App Entry Point for Technician Mobile App
 * @module technician-app/App
 * 
 * @implements FEAT-MOBILE-001 - Native Mobile Apps Foundation
 * @created 2026-01-10
 * @status IMPLEMENTED [AGENT-0032]
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
