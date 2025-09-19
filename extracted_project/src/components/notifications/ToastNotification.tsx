'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actionText?: string;
  actionUrl?: string;
  onAction?: () => void;
}

interface ToastNotificationProps extends ToastNotification {
  onClose: (id: string) => void;
}

const ToastNotificationComponent: React.FC<ToastNotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  actionText,
  actionUrl,
  onAction,
  onClose
}) => {
  const { isRTL } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        handleClose();
      }, duration);
    }
  }, [duration]);

  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionUrl) {
      window.location.href = actionUrl;
    }
    handleClose();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          title: 'text-green-800',
          message: 'text-green-700',
          iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 
          isRTL ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'}
        max-w-md w-full ${styles.bg} border rounded-lg shadow-lg p-4
        ${isRTL ? 'text-right' : 'text-left'}
      `}
    >
      <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-6 h-6 ${styles.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className={`ml-3 ${isRTL ? 'mr-3 ml-0' : ''} flex-1`}>
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {title}
          </h3>
          <p className={`mt-1 text-sm ${styles.message}`}>
            {message}
          </p>

          {/* Action Button */}
          {(actionText || actionUrl) && (
            <div className="mt-3">
              <button
                onClick={handleAction}
                className={`
                  text-sm font-medium underline hover:no-underline
                  ${styles.title}
                `}
              >
                {actionText || 'View Details'}
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className={`ml-4 ${isRTL ? 'mr-4 ml-0' : ''} flex-shrink-0`}>
          <button
            onClick={handleClose}
            className={`
              inline-flex rounded-md p-1.5
              ${styles.icon} hover:bg-black hover:bg-opacity-10
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
            `}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
export interface ToastContainerProps {
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove
}) => {
  const { isRTL } = useTranslation();

  return (
    <div
      className={`
        fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50
        flex flex-col gap-2 max-w-md w-full
      `}
    >
      {toasts.map((toast) => (
        <ToastNotificationComponent
          key={toast.id}
          {...toast}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'success', title, message, ...options });
  };

  const error = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'error', title, message, ...options });
  };

  const warning = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'warning', title, message, ...options });
  };

  const info = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'info', title, message, ...options });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};

export default ToastNotificationComponent;