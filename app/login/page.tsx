'use client';
import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Eye, EyeOff, LogIn, AlertCircle, Shield, User, Building2, Users, Chrome, Apple, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

const DEMO_CREDENTIALS = [
  {
    role: 'Super Admin',
    email: 'superadmin@fixzit.co',
    password: 'password123',
    description: 'Full system access',
    icon: Shield,
    color: 'text-red-600'
  },
  {
    role: 'Admin',
    email: 'admin@fixzit.co',
    password: 'password123',
    description: 'Administrative access',
    icon: User,
    color: 'text-blue-600'
  },
  {
    role: 'Property Manager',
    email: 'manager@fixzit.co',
    password: 'password123',
    description: 'Property management',
    icon: Building2,
    color: 'text-green-600'
  },
  {
    role: 'Tenant',
    email: 'tenant@fixzit.co',
    password: 'password123',
    description: 'Tenant portal access',
    icon: Users,
    color: 'text-purple-600'
  },
  {
    role: 'Vendor',
    email: 'vendor@fixzit.co',
    password: 'password123',
    description: 'Vendor marketplace access',
    icon: Briefcase,
    color: 'text-orange-600'
  }
];

/**
 * Login page component providing three authentication flows: Personal Email, Corporate Account, and SSO.
 *
 * Renders a tabbed login UI with inputs and controls for personal (email/password) and corporate
 * (employee number/password) authentication, plus SSO buttons for Google and Apple.
 *
 * Behavior and side effects:
 * - Personal and corporate forms POST to /api/auth/login with `loginType` set to "personal" or "corporate".
 * - On successful login the component stores role/user data in localStorage (`fixzit-role`, `fixzit-user`),
 *   clears `fixzit-notifications`, writes a `fixzit-login-notification`, and navigates to /dashboard.
 * - Google SSO redirects the browser to /api/auth/google; Apple SSO currently shows a "coming soon" error.
 * - Provides demo credential quick-fill that populates the personal email/password fields.
 * - Manages local UI state for input values, password visibility, loading, and error messages.
 *
 * @returns The rendered login page JSX element.
 */
export default function LoginPage() {
  // Personal Email Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Corporate Login State
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [corpPassword, setCorpPassword] = useState('');
  
  // Common State
  const [showPassword, setShowPassword] = useState(false);
  const [showCorpPassword, setShowCorpPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Quick login with demo credentials
  const quickLogin = (credential: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(credential.email);
    setPassword(credential.password);
  };

  async function handlePersonalLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          loginType: 'personal' 
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.ok) {
        // Set role in localStorage for immediate access
        if (data.user && data.user.role) {
          localStorage.setItem('fixzit-role', data.user.role);
          localStorage.setItem('fixzit-user', JSON.stringify(data.user));
        }

        // Clear any stale notifications
        localStorage.removeItem('fixzit-notifications');
        
        // Show success notification
        const notification = {
          title: 'Login Successful',
          message: `Welcome back, ${data.user.name || email}!`,
          type: 'success',
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('fixzit-login-notification', JSON.stringify(notification));
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleCorporateLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeNumber, 
          password: corpPassword,
          loginType: 'corporate' 
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.ok) {
        // Set role in localStorage for immediate access
        if (data.user && data.user.role) {
          localStorage.setItem('fixzit-role', data.user.role);
          localStorage.setItem('fixzit-user', JSON.stringify(data.user));
        }

        // Clear any stale notifications
        localStorage.removeItem('fixzit-notifications');
        
        // Show success notification
        const notification = {
          title: 'Login Successful',
          message: `Welcome back, ${data.user.name || employeeNumber}!`,
          type: 'success',
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('fixzit-login-notification', JSON.stringify(notification));
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleSSOLogin(provider: 'google' | 'apple') {
    setLoading(true);
    setError('');

    try {
      if (provider === 'google') {
        // Redirect to Google OAuth
        window.location.href = '/api/auth/google';
      } else {
        // Apple login coming soon
        setError('Apple login coming soon');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex py-12">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-bold">F</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4">Fixzit Enterprise</h1>
            <p className="text-xl mb-8 opacity-90">
              Facility Management + Marketplace Platform
            </p>
          </div>

          <div className="space-y-6 text-left">
            <div className="flex items-start gap-3">
              <Building2 className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Property Management</h3>
                <p className="text-sm opacity-90">Manage real estate portfolios</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Work Orders</h3>
                <p className="text-sm opacity-90">Streamline maintenance requests</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Marketplace</h3>
                <p className="text-sm opacity-90">Connect with verified vendors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your Fixzit account • Sign in to contact</p>
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="personal">Personal Email</TabsTrigger>
                <TabsTrigger value="corporate">Corporate Account</TabsTrigger>
                <TabsTrigger value="sso">SSO Login</TabsTrigger>
              </TabsList>

              {/* Personal Email Login */}
              <TabsContent value="personal">
                <form onSubmit={handlePersonalLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personal Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your personal email"
                      required
                      disabled={loading}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link href="/forgot-password" className="text-sm text-[#0061A8] hover:underline">
                      Forgot Password?
                    </Link>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#0061A8] hover:bg-[#0061A8]/90 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </div>
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-3">Demo Credentials:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {DEMO_CREDENTIALS.map((cred) => (
                      <button
                        key={cred.email}
                        onClick={() => quickLogin(cred)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <cred.icon className={`w-4 h-4 ${cred.color}`} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{cred.role}</div>
                            <div className="text-xs text-gray-500">{cred.description}</div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {cred.email} / password123
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Corporate Account Login */}
              <TabsContent value="corporate">
                <form onSubmit={handleCorporateLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Number
                    </label>
                    <Input
                      type="text"
                      value={employeeNumber}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      placeholder="e.g. EMP002"
                      required
                      disabled={loading}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corporate Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showCorpPassword ? 'text' : 'password'}
                        value={corpPassword}
                        onChange={(e) => setCorpPassword(e.target.value)}
                        placeholder="Enter your corporate password"
                        required
                        disabled={loading}
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCorpPassword(!showCorpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showCorpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#0061A8] hover:bg-[#0061A8]/90 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </div>
                    )}
                  </Button>

                  <div className="text-center text-sm text-gray-600 mt-4">
                    <p>Example: Employee #: EMP002 / password123</p>
                  </div>
                </form>
              </TabsContent>

              {/* SSO Login */}
              <TabsContent value="sso">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 py-6 hover:border-[#4285f4] hover:text-[#4285f4]"
                    onClick={() => handleSSOLogin('google')}
                    disabled={loading}
                  >
                    <Chrome className="w-5 h-5" />
                    <span>Continue with Google</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 py-6 hover:border-gray-900 hover:text-gray-900"
                    onClick={() => handleSSOLogin('apple')}
                    disabled={loading}
                  >
                    <Apple className="w-5 h-5" />
                    <span>Continue with Apple</span>
                  </Button>

                  <div className="text-center text-sm text-gray-500 mt-4">
                    Use your corporate SSO account for quick access
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#0061A8] hover:underline font-medium">
                  Sign up here
                </Link>
              </span>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-gray-500 hover:underline">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}