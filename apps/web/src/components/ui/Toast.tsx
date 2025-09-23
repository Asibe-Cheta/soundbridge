'use client';

import { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const toastStyles = {
  style: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  success: {
    iconTheme: {
      primary: '#10B981',
      secondary: 'white',
    },
    style: {
      background: 'rgba(16, 185, 129, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      color: 'white',
    },
  },
  error: {
    iconTheme: {
      primary: '#EF4444',
      secondary: 'white',
    },
    style: {
      background: 'rgba(239, 68, 68, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: 'white',
    },
  },
  warning: {
    iconTheme: {
      primary: '#F59E0B',
      secondary: 'white',
    },
    style: {
      background: 'rgba(245, 158, 11, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      color: 'white',
    },
  },
  info: {
    iconTheme: {
      primary: '#3B82F6',
      secondary: 'white',
    },
    style: {
      background: 'rgba(59, 130, 246, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      color: 'white',
    },
  },
};

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: toastStyles.style,
        success: {
          ...toastStyles.success,
          icon: <CheckCircle className="w-5 h-5" />,
        },
        error: {
          ...toastStyles.error,
          icon: <XCircle className="w-5 h-5" />,
        },
        loading: {
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
          },
        },
        custom: {
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
          },
        },
      }}
    />
  );
}

// Custom toast functions with glassmorphism styling
export const toast = {
  success: (message: string) => {
    return import('react-hot-toast').then(({ toast }) =>
      toast.success(message, toastStyles.success)
    );
  },
  error: (message: string) => {
    return import('react-hot-toast').then(({ toast }) =>
      toast.error(message, toastStyles.error)
    );
  },
  warning: (message: string) => {
    return import('react-hot-toast').then(({ toast }) =>
      toast(message, {
        ...toastStyles.warning,
        icon: <AlertCircle className="w-5 h-5" />,
      })
    );
  },
  info: (message: string) => {
    return import('react-hot-toast').then(({ toast }) =>
      toast(message, {
        ...toastStyles.info,
        icon: <Info className="w-5 h-5" />,
      })
    );
  },
  loading: (message: string) => {
    return import('react-hot-toast').then(({ toast }) =>
      toast.loading(message, {
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
        },
      })
    );
  },
};
