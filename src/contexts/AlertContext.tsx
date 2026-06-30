// contexts/AlertContext.tsx

'use client';

import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface AlertContextType {
  alert: (options: AlertOptions) => void;
  confirm: (options: AlertOptions) => Promise<boolean>;
  toast: (message: string, type?: AlertType, duration?: number) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [toastState, setToastState] = useState<{ message: string; type: AlertType; id: number } | null>(null);
  
  // Use a ref so the resolver survives the re-render that confirm() triggers
  // via setIsOpen/setAlertState. A plain `let` here gets reset to null on
  // every render, so handleConfirm/handleCancel (which run in a *later*
  // render than the one that called confirm()) would never see it, and the
  // confirm() promise would never resolve when Confirm/Cancel is clicked.
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  
  const alert = (options: AlertOptions) => {
    setAlertState(options);
    setIsOpen(true);
  };
  
  const confirm = (options: AlertOptions): Promise<boolean> => {
    setAlertState({ ...options, showCancel: true });
    setIsOpen(true);
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
    });
  };
  
  const toast = (message: string, type: AlertType = 'info', duration: number = 3000) => {
    const id = Date.now();
    setToastState({ message, type, id });
    setTimeout(() => {
      setToastState(prev => prev?.id === id ? null : prev);
    }, duration);
  };
  
  const closeAlert = () => {
    setIsOpen(false);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
    setAlertState(null);
  };
  
  const handleConfirm = () => {
    if (alertState?.onConfirm) {
      alertState.onConfirm();
    }
    if (confirmResolverRef.current) {
      confirmResolverRef.current(true);
      confirmResolverRef.current = null;
    }
    setIsOpen(false);
    setAlertState(null);
  };
  
  const handleCancel = () => {
    if (alertState?.onCancel) {
      alertState.onCancel();
    }
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
    setIsOpen(false);
    setAlertState(null);
  };
  
  const getIcon = (type?: AlertType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-500" />;
      case 'error':
        return <XCircle size={24} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={24} className="text-yellow-500" />;
      default:
        return <Info size={24} className="text-blue-500" />;
    }
  };
  
  const getColors = (type?: AlertType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-900 dark:text-green-100',
          button: 'bg-green-500 hover:bg-green-600',
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          button: 'bg-red-500 hover:bg-red-600',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-900 dark:text-yellow-100',
          button: 'bg-yellow-500 hover:bg-yellow-600',
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          button: 'bg-blue-500 hover:bg-blue-600',
        };
    }
  };
  
  const colors = getColors(alertState?.type);
  
  return (
    <AlertContext.Provider value={{ alert, confirm, toast, closeAlert }}>
      {children}
      
      {/* Custom Alert/Confirm Modal */}
      <AnimatePresence>
        {isOpen && alertState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-100 p-4"
            onClick={closeAlert}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`${colors.bg} ${colors.border} border rounded-2xl p-6 w-full max-w-md shadow-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {getIcon(alertState.type)}
                </div>
                <div className="flex-1">
                  {alertState.title && (
                    <h3 className={`font-semibold text-lg mb-1 ${colors.text}`}>
                      {alertState.title}
                    </h3>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {alertState.message}
                  </p>
                </div>
                <button
                  onClick={closeAlert}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                {alertState.showCancel && (
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                  >
                    {alertState.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 ${colors.button} text-white rounded-xl transition font-medium`}
                >
                  {alertState.confirmText || (alertState.showCancel ? 'Confirm' : 'OK')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {toastState && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-24 right-4 z-50 max-w-sm"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toastState.type === 'success' ? 'bg-green-500' :
              toastState.type === 'error' ? 'bg-red-500' :
              toastState.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
            } text-white`}>
              {getIcon(toastState.type)}
              <span className="text-sm flex-1">{toastState.message}</span>
              <button onClick={() => setToastState(null)} className="opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}