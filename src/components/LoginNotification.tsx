'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface LoginNotification {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
}

export default function LoginNotification() {
  const [notification, setNotification] = useState<LoginNotification | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check for login notification
    const stored = localStorage.getItem('fixzit-login-notification');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setNotification(data);
        setShow(true);
        
        // Clear the notification from storage
        localStorage.removeItem('fixzit-login-notification');
        
        // Auto-hide after 5 seconds
        const timer = setTimeout(() => {
          setShow(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error parsing login notification:', error);
      }
    }
  }, []);

  if (!notification || !show) return null;

  const handleClose = () => {
    setShow(false);
  };

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className={`bg-white rounded-lg shadow-lg border-l-4 ${
        notification.type === 'success' ? 'border-green-500' : 
        notification.type === 'error' ? 'border-red-500' : 
        'border-blue-500'
      } p-4 min-w-[300px] max-w-md`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {notification.type === 'success' && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
