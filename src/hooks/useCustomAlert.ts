// hooks/useCustomAlert.ts

'use client';

import { useAlert } from '@/contexts/AlertContext';

export function useCustomAlert() {
  const { alert, confirm, toast } = useAlert();
  
  return {
    // Simple alert
    showAlert: (message: string, title?: string, type?: 'success' | 'error' | 'warning' | 'info') => {
      alert({ message, title, type });
    },
    
    // Success message
    success: (message: string, title?: string) => {
      alert({ message, title, type: 'success' });
    },
    
    // Error message
    error: (message: string, title?: string) => {
      alert({ message, title, type: 'error' });
    },
    
    // Warning message
    warning: (message: string, title?: string) => {
      alert({ message, title, type: 'warning' });
    },
    
    // Info message
    info: (message: string, title?: string) => {
      alert({ message, title, type: 'info' });
    },
    
    // Confirm dialog (returns boolean)
    confirm: (message: string, title?: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
      return confirm({ message, title, confirmText, cancelText, showCancel: true });
    },
    
    // Toast notification (auto-dismisses)
    toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => {
      toast(message, type, duration);
    },
    
    // Quick toast shortcuts
    toastSuccess: (message: string) => toast(message, 'success'),
    toastError: (message: string) => toast(message, 'error'),
    toastWarning: (message: string) => toast(message, 'warning'),
    toastInfo: (message: string) => toast(message, 'info'),
  };
}