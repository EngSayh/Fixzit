'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check, Smartphone, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';

interface OTPVerificationProps {
  identifier: string;
  maskedPhone: string;
  expiresIn: number;
  // eslint-disable-next-line no-unused-vars
  onVerified: (otpToken: string) => void;
  onResend: () => Promise<{ success: boolean; expiresIn?: number; error?: string }>;
  onBack: () => void;
  // eslint-disable-next-line no-unused-vars
  t: (key: string, fallback: string) => string;
  isRTL: boolean;
}

export default function OTPVerification({
  identifier,
  maskedPhone,
  expiresIn: initialExpiresIn,
  onVerified,
  onResend,
  onBack,
  t,
  isRTL,
}: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(initialExpiresIn);
  useEffect(() => {
    setTimeRemaining(initialExpiresIn);
  }, [initialExpiresIn]);

  // Timer for OTP expiration
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError(t('otp.errors.invalid', 'Please enter a valid 6-digit code'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('otp.errors.verifyFailed', 'Failed to verify OTP'));
        setLoading(false);
        return;
      }

      // OTP verified successfully
      onVerified(data.data.otpToken ?? data.data.authToken);
    } catch (err) {
      logger.error('OTP verification error', err instanceof Error ? err : new Error(String(err)));
      setError(t('otp.errors.networkError', 'Network error. Please try again.'));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      const result = await onResend();
      if (!result.success) {
        setError(result.error || t('otp.errors.resendFailed', 'Failed to resend OTP'));
        setResending(false);
        return;
      }

      // Reset timers
      if (typeof result.expiresIn === 'number') {
        setTimeRemaining(result.expiresIn);
      } else {
        setTimeRemaining(initialExpiresIn);
      }
      setResendCooldown(60); // 60 second cooldown
      setOtp('');
    } catch (err) {
      logger.error('OTP resend error', err instanceof Error ? err : new Error(String(err)));
      setError(t('otp.errors.networkError', 'Network error. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('otp.title', 'Enter Verification Code')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('otp.subtitle', 'We sent a 6-digit code to')}
          <br />
          <span className="font-medium text-foreground">{maskedPhone}</span>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-5">
        {/* OTP Input */}
        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">
            {t('otp.label', 'Verification Code')}
          </label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setOtp(value);
              if (error) setError('');
            }}
            className={`h-14 text-center text-2xl tracking-widest font-mono ${
              error ? 'border-destructive focus:ring-destructive' : ''
            } ${isRTL ? 'text-right' : ''}`}
            disabled={loading || timeRemaining === 0}
            autoFocus
            required
          />
          {timeRemaining > 0 && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {t('otp.expiresIn', 'Expires in')} {formatTime(timeRemaining)}
            </p>
          )}
          {timeRemaining === 0 && (
            <p className="mt-2 text-xs text-destructive text-center">
              {t('otp.expired', 'Code expired. Please request a new one.')}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className={`flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || otp.length !== 6 || timeRemaining === 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('otp.verifying', 'Verifying...')}
            </div>
          ) : (
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Check className="h-5 w-5" />
              {t('otp.verify', 'Verify & Continue')}
            </div>
          )}
        </Button>
      </form>

      {/* Resend & Back Actions */}
      <div className="space-y-3">
        {/* Resend */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t('otp.didntReceive', "Didn't receive the code?")}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-sm text-primary hover:text-primary font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending
              ? t('otp.resending', 'Sending...')
              : resendCooldown > 0
              ? `${t('otp.resendIn', 'Resend in')} ${resendCooldown}s`
              : t('otp.resend', 'Resend Code')}
          </button>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className={`w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('otp.backToLogin', 'Back to Login')}
        </button>
      </div>
    </div>
  );
}
