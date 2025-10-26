'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, User, Building2, Users, Copy, Check } from 'lucide-react';
import Link from 'next/link';

/**
 * Developer-only page for quick login with demo credentials
 * Only accessible in development or when NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true
 * Credentials are loaded from a separate file that is gitignored
 */

// Import credentials from separate file (gitignored)
let DEMO_CREDENTIALS: Array<any> = [];
let CORPORATE_CREDENTIALS: Array<any> = [];

try {
  // Try to import credentials file
  const credentials = require('./credentials');
  DEMO_CREDENTIALS = credentials.DEMO_CREDENTIALS || [];
  CORPORATE_CREDENTIALS = credentials.CORPORATE_CREDENTIALS || [];
  
  // Validate structure
  if (!Array.isArray(DEMO_CREDENTIALS) || !Array.isArray(CORPORATE_CREDENTIALS)) {
    console.error('[Dev Login Helpers] Invalid credentials format. Check credentials.ts');
    DEMO_CREDENTIALS = [];
    CORPORATE_CREDENTIALS = [];
  }
} catch (error) {
  console.warn('[Dev Login Helpers] credentials.ts not found. Copy credentials.example.ts to credentials.ts');
}

export default function LoginHelpersPage() {
  const router = useRouter();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check if demo login is enabled
  const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || 
                        process.env.NODE_ENV === 'development';

  if (!isDemoEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Demo login helpers are not available in production.
          </p>
          <Link 
            href="/login"
            className="inline-block px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const copyCredentials = (label: string, value: string, password: string, index: number) => {
    const text = `${label}: ${value}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const autoLogin = async (credential: { email?: string; employeeNumber?: string; password: string }) => {
    try {
      const loginData = credential.email 
        ? { email: credential.email, password: credential.password, loginType: 'personal' }
        : { employeeNumber: credential.employeeNumber, password: credential.password, loginType: 'corporate' };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.ok) {
        if (data.user?.role) {
          localStorage.setItem('fixzit-role', data.user.role);
        }
        router.push('/dashboard');
      } else {
        alert('Login failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🔧 Developer Login Helpers</h1>
            <p className="text-sm text-gray-400">Quick access demo credentials</p>
          </div>
          <Link 
            href="/login"
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
          >
            ← Back to Login
          </Link>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-900/20 border-y border-yellow-700/50 py-3">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-yellow-200 text-sm flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>
              <strong>Development Only:</strong> These credentials are for testing purposes. 
              Never expose demo credentials in production environments.
            </span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Personal Email Accounts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">📧</span> Personal Email Accounts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_CREDENTIALS.map((cred, index) => {
              const Icon = cred.icon;
              return (
                <div
                  key={cred.role}
                  className={`${cred.color} border rounded-lg p-6 hover:shadow-xl transition-all`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-lg">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{cred.role}</h3>
                      <p className="text-sm opacity-80">{cred.description}</p>
                    </div>
                  </div>

                  <div className="bg-black/20 rounded p-3 mb-3 font-mono text-sm">
                    <div className="mb-1">
                      <span className="opacity-60">Email:</span> {cred.email}
                    </div>
                    <div>
                      <span className="opacity-60">Password:</span> {cred.password}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => autoLogin(cred)}
                      className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <ArrowRight size={16} />
                      Auto Login
                    </button>
                    <button
                      onClick={() => copyCredentials('Email', cred.email, cred.password, index)}
                      className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      title="Copy credentials"
                    >
                      {copiedIndex === index ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Corporate Accounts */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">🏢</span> Corporate Accounts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORPORATE_CREDENTIALS.map((cred, index) => {
              const Icon = cred.icon;
              const globalIndex = DEMO_CREDENTIALS.length + index;
              return (
                <div
                  key={cred.role}
                  className={`${cred.color} border rounded-lg p-6 hover:shadow-xl transition-all`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-lg">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{cred.role}</h3>
                      <p className="text-sm opacity-80">{cred.description}</p>
                    </div>
                  </div>

                  <div className="bg-black/20 rounded p-3 mb-3 font-mono text-sm">
                    <div className="mb-1">
                      <span className="opacity-60">Employee #:</span> {cred.employeeNumber}
                    </div>
                    <div>
                      <span className="opacity-60">Password:</span> {cred.password}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => autoLogin(cred)}
                      className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <ArrowRight size={16} />
                      Auto Login
                    </button>
                    <button
                      onClick={() => copyCredentials('Employee Number', cred.employeeNumber!, cred.password, globalIndex)}
                      className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      title="Copy credentials"
                    >
                      {copiedIndex === globalIndex ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Instructions */}
        <section className="mt-12 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">📖 Usage Instructions</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex gap-2">
              <span>•</span>
              <span><strong>Auto Login:</strong> Click to automatically log in with the selected credentials</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span><strong>Copy:</strong> Copy credentials to clipboard for manual entry</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span><strong>Access Control:</strong> This page only appears when NODE_ENV=development or NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span><strong>Security:</strong> Never enable demo credentials in production environments</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
