"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { GlassCard, GlassButton, GlassInput } from '../theme';
import type { ConfirmationConfig, ConfirmationResult } from '../../lib/types/ui';

interface ConfirmationDialogProps {
  isOpen: boolean;
  config: ConfirmationConfig;
  onConfirm: (result: ConfirmationResult) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  config,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setComments('');
      setError('');
      setIsProcessing(false);
      // Focus first input when dialog opens
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && !isProcessing) {
        onCancel();
      } else if (event.key === 'Enter' && event.ctrlKey) {
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, reason, comments]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isProcessing) return;

    // Validate required fields
    if (config.requireReason && !reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const result: ConfirmationResult = {
        confirmed: true,
        reason: reason.trim() || undefined,
        comments: comments.trim() || undefined,
        timestamp: new Date().toISOString()
      };

      await onConfirm(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;
    onCancel();
  };

  const getIcon = () => {
    switch (config.type) {
      case 'success': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'danger': return <XCircle className="w-6 h-6 text-red-400" />;
      default: return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  const getThemeColors = () => {
    switch (config.type) {
      case 'success': return 'from-green-500/20 to-emerald-500/20 border-green-400/30';
      case 'warning': return 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30';
      case 'danger': return 'from-red-500/20 to-rose-500/20 border-red-400/30';
      default: return 'from-blue-500/20 to-indigo-500/20 border-blue-400/30';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={handleCancel}
        aria-label="Close dialog"
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          className="relative w-full max-w-md transform transition-all duration-300 scale-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          onClick={(e) => e.stopPropagation()}
        >
          <GlassCard 
            className={`p-6 bg-gradient-to-br ${getThemeColors()} border`}
            variant="strong"
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  id="dialog-title"
                  className="text-lg font-semibold text-white mb-2"
                >
                  {config.title}
                </h3>
                <p 
                  id="dialog-description"
                  className="text-sm text-white/80"
                >
                  {config.message}
                </p>
              </div>
              <GlassButton
                onClick={handleCancel}
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white"
                disabled={isProcessing}
                ariaLabel="Close dialog"
              >
                <X size={20} />
              </GlassButton>
            </div>

            {/* Form Fields */}
            {(config.requireReason || config.requireComments) && (
              <div className="space-y-4 mb-6">
                {config.requireReason && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Reason {config.requireReason && <span className="text-red-400">*</span>}
                    </label>
                    <GlassInput
                      ref={firstInputRef}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setError('');
                      }}
                      placeholder="Please provide a reason..."
                      disabled={isProcessing}
                      className="w-full"
                      maxLength={200}
                      aria-required={config.requireReason}
                      aria-describedby={error ? 'reason-error' : undefined}
                    />
                    {error && (
                      <p id="reason-error" className="text-red-400 text-xs mt-1" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                )}

                {config.requireComments && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Additional Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add any additional details..."
                      disabled={isProcessing}
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                               text-white placeholder-white/50 backdrop-blur-sm
                               focus:border-white/40 focus:ring-2 focus:ring-white/20 
                               disabled:opacity-50 disabled:cursor-not-allowed
                               resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <GlassButton
                onClick={handleCancel}
                variant="ghost"
                disabled={isProcessing}
                className="text-white/80 hover:text-white"
              >
                {config.cancelText || 'Cancel'}
              </GlassButton>
              <GlassButton
                onClick={handleConfirm}
                variant={config.destructive ? 'danger' : 'primary'}
                disabled={isProcessing || (config.requireReason && !reason.trim())}
                loading={isProcessing}
                icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {config.confirmText || 'Confirm'}
              </GlassButton>
            </div>

            {/* Loading Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-white text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Processing...
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </>
  );
};

// Hook for using confirmation dialogs
export const useConfirmation = () => {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    config: ConfirmationConfig;
    resolve: (result: ConfirmationResult | null) => void;
  } | null>(null);

  const confirm = (config: ConfirmationConfig): Promise<ConfirmationResult | null> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        config,
        resolve
      });
    });
  };

  const handleConfirm = async (result: ConfirmationResult) => {
    if (dialog) {
      dialog.resolve(result);
      setDialog(null);
    }
  };

  const handleCancel = () => {
    if (dialog) {
      dialog.resolve(null);
      setDialog(null);
    }
  };

  const ConfirmationComponent = dialog ? (
    <ConfirmationDialog
      isOpen={dialog.isOpen}
      config={dialog.config}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmationComponent };
};

export default ConfirmationDialog;