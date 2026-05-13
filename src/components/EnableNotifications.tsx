// components/EnableNotifications.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X } from 'lucide-react';

export default function EnableNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      // Show banner if not granted and not denied
      if (Notification.permission === 'default') {
        setShowBanner(true);
      }
    }
  }, []);
  
  const requestPermission = async () => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setShowBanner(false);
        // Show success message
        console.log('✅ Notifications enabled!');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
    setLoading(false);
  };
  
  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
        <Bell size={16} className="text-green-600 dark:text-green-400" />
        <span className="text-xs text-green-700 dark:text-green-400">Notifications on</span>
      </div>
    );
  }
  
  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
        <BellOff size={16} className="text-red-600 dark:text-red-400" />
        <span className="text-xs text-red-700 dark:text-red-400">Notifications blocked</span>
      </div>
    );
  }
  
  return (
    <>
      <button
        onClick={requestPermission}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Bell size={16} />
        )}
        Enable Notifications
      </button>
      
      {/* Banner for mobile */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none"
          >
            <div className="bg-blue-500 text-white rounded-2xl shadow-xl p-4 max-w-sm w-full pointer-events-auto">
              <div className="flex items-start gap-3">
                <Bell size={20} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Get Deadline Reminders</p>
                  <p className="text-xs opacity-90 mt-1">
                    Mochi can notify you when tasks are due so you never miss a deadline.
                  </p>
                  <button
                    onClick={requestPermission}
                    className="mt-3 px-3 py-1.5 bg-white text-blue-500 rounded-lg text-xs font-semibold"
                  >
                    Allow Notifications
                  </button>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}