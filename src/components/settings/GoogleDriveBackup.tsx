// components/settings/GoogleDriveBackup.tsx - UPDATE

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudUpload, 
  CloudDownload, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cloud,
  Wrench
} from 'lucide-react';

export default function GoogleDriveBackup() {
  const [loading, setLoading] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  const handleComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };
  
  return (
    <div className="space-y-4">
      {/* Coming Soon Toast */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm"
          >
            ⚙️ Google Drive Backup - Coming soon!
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Coming Soon Banner */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <Wrench size={28} className="text-blue-500" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Cloud Backup Coming Soon</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Backup your data to Google Drive and restore on any device.
          This feature will be available in the next update!
        </p>
        <button
          onClick={handleComingSoon}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm"
        >
          Notify me when ready
        </button>
      </div>
      
      {/* Manual Export/Import Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Cloud size={18} className="text-green-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Manual Backup Available</h4>
            <p className="text-xs text-gray-500 mt-1">
              • Use <strong>Export Data</strong> above to save a local backup file<br />
              • Transfer the file to your other device<br />
              • Use <strong>Import Data</strong> to restore on the new device<br />
              • Cloud backup (coming soon) will make this automatic!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}