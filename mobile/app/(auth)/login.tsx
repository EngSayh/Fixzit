import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  IconButton,
} from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@fixzit.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.success) {
        // Navigation will be handled by auth state change
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="headlineMedium" style={styles.title}>
              Fixzit Mobile
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Facility Management on the go
            </Text>
          </View>

          {/* Login Form */}
          <Card style={styles.loginCard}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.loginTitle}>
                Welcome Back
              </Text>
              
              <View style={styles.formContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>

                <Link href="/forgot-password" asChild>
                  <Button mode="text" style={styles.forgotButton}>
                    Forgot Password?
                  </Button>
                </Link>
              </View>
            </Card.Content>
          </Card>

          {/* Demo Accounts */}
          <Card style={styles.demoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.demoTitle}>
                Demo Accounts
              </Text>
              <Divider style={styles.demoDivider} />
              
              <View style={styles.demoAccount}>
                <Text variant="bodyMedium" style={styles.demoRole}>
                  👨‍💼 Admin
                </Text>
                <Text variant="bodySmall" style={styles.demoCredentials}>
                  admin@fixzit.com / password123
                </Text>
              </View>

              <View style={styles.demoAccount}>
                <Text variant="bodyMedium" style={styles.demoRole}>
                  🏢 Property Manager
                </Text>
                <Text variant="bodySmall" style={styles.demoCredentials}>
                  manager@fixzit.com / password123
                </Text>
              </View>

              <View style={styles.demoAccount}>
                <Text variant="bodyMedium" style={styles.demoRole}>
                  🔧 Technician
                </Text>
                <Text variant="bodySmall" style={styles.demoCredentials}>
                  tech@fixzit.com / password123
                </Text>
              </View>

              <View style={styles.demoAccount}>
                <Text variant="bodyMedium" style={styles.demoRole}>
                  🏠 Tenant
                </Text>
                <Text variant="bodySmall" style={styles.demoCredentials}>
                  tenant@fixzit.com / password123
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Quick Login Buttons */}
          <View style={styles.quickLoginContainer}>
            <Text variant="titleSmall" style={styles.quickLoginTitle}>
              Quick Demo Login
            </Text>
            
            <View style={styles.quickLoginButtons}>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  setEmail('admin@fixzit.com');
                  setPassword('password123');
                }}
                style={styles.quickButton}
              >
                Admin
              </Button>
              
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  setEmail('manager@fixzit.com');
                  setPassword('password123');
                }}
                style={styles.quickButton}
              >
                Manager
              </Button>
              
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  setEmail('tech@fixzit.com');
                  setPassword('password123');
                }}
                style={styles.quickButton}
              >
                Tech
              </Button>
              
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  setEmail('tenant@fixzit.com');
                  setPassword('password123');
                }}
                style={styles.quickButton}
              >
                Tenant
              </Button>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              © 2025 Fixzit Enterprise. All rights reserved.
            </Text>
            <Text variant="bodySmall" style={styles.footerText}>
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#0078D4',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  loginCard: {
    marginBottom: 20,
    elevation: 4,
  },
  loginTitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#023047',
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    marginTop: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  forgotButton: {
    alignSelf: 'center',
  },
  demoCard: {
    marginBottom: 20,
    elevation: 2,
  },
  demoTitle: {
    textAlign: 'center',
    color: '#023047',
    marginBottom: 8,
  },
  demoDivider: {
    marginBottom: 16,
  },
  demoAccount: {
    marginBottom: 12,
  },
  demoRole: {
    fontWeight: '500',
    marginBottom: 4,
  },
  demoCredentials: {
    color: '#666',
    fontFamily: 'monospace',
  },
  quickLoginContainer: {
    marginBottom: 20,
  },
  quickLoginTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#023047',
  },
  quickLoginButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    minWidth: 70,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
});