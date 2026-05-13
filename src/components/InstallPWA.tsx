// components/InstallPWA.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    
    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  const handleInstall = async () => {
    if (!installPrompt) return;
    
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };
  
  if (isInstalled) return null;
  if (!showBanner) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 left-4 right-4 z-40 flex justify-center pointer-events-none"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 max-w-sm w-full pointer-events-auto border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Smartphone size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Install MochiDo</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Install on your home screen for faster access and offline support.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition"
                >
                  <Download size={12} className="inline mr-1" />
                  Install
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs transition"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}