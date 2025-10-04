'use client';

import { useState } from 'react';
import { X, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  action?: string;
  redirectTo?: string;
}

export default function LoginPrompt({
  isOpen,
  onClose,
  title = "Sign In Required",
  description = "Please sign in to continue with this action.",
  action = "Continue",
  redirectTo = "/"
}: LoginPromptProps) {
  const [isSignUp, setIsSignUp] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = () => {
    const params = new URLSearchParams();
    if (redirectTo) params.set('redirect', redirectTo);
    if (action) params.set('action', action);
    window.location.href = `/login?${params.toString()}`;
  };

  const handleSignUp = () => {
    const params = new URLSearchParams();
    if (redirectTo) params.set('redirect', redirectTo);
    if (action) params.set('action', action);
    window.location.href = `/login?signup=true&${params.toString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0061A8] rounded-full flex items-center justify-center">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0061A8] to-[#00A859] rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {isSignUp ? 'Create Your Account' : 'Welcome Back'}
            </h4>
            <p className="text-gray-600 text-sm">
              {isSignUp
                ? 'Join Fixzit to access exclusive features and manage your purchases.'
                : 'Sign in to your Fixzit account to continue.'
              }
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign In with Email
            </button>

            <button
              onClick={handleSignUp}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-[#00A859] text-[#00A859] rounded-lg hover:bg-[#00A859] hover:text-white transition-colors font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Create New Account
            </button>
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Why Sign In?</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Save items to your wishlist</li>
              <li>• Track your orders and purchases</li>
              <li>• Access exclusive deals and offers</li>
              <li>• Get personalized recommendations</li>
              <li>• Manage your account and preferences</li>
            </ul>
          </div>

          {/* Social Login Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">Or continue with</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Need help?</span>
            <Link href="/help" className="text-[#0061A8] hover:underline">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
