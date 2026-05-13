// components/SetupWizard.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { driveBackup } from '@/lib/backup/googleDriveBackup';
import { importBackupData } from '@/lib/backup/backupTypes';

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<'welcome' | 'restore' | 'complete'>('welcome');
  const [hasBackups, setHasBackups] = useState(false);
  const [backups, setBackups] = useState<Array<{ id: string; name: string; createdTime: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  
  // Check for existing backups on Google Drive
  const checkBackups = async () => {
    setLoading(true);
    try {
      await driveBackup.init();
      const signedIn = await driveBackup.isSignedIn();
      if (signedIn) {
        const backupList = await driveBackup.listBackups();
        if (backupList.length > 0) {
          setHasBackups(true);
          setBackups(backupList);
          setStep('restore');
        } else {
          setStep('complete');
        }
      } else {
        setStep('complete');
      }
    } catch (error) {
      console.error('Failed to check backups:', error);
      setStep('complete');
    }
    setLoading(false);
  };
  
  const handleRestore = async (backupId: string) => {
    setLoading(true);
    try {
      const backupData = await driveBackup.restoreFromDrive(backupId);
      await importBackupData(backupData);
      setStep('complete');
    } catch (error) {
      console.error('Restore failed:', error);
      setStep('complete');
    }
    setLoading(false);
  };
  
  const handleSkip = () => {
    setStep('complete');
  };
  
  useEffect(() => {
    checkBackups();
  }, []);
  
  if (step === 'complete') {
    onComplete();
    return null;
  }
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🐹</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to MochiDo!</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Your smart academic time management system.
              </p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
              ) : (
                <button
                  onClick={checkBackups}
                  className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition flex items-center gap-2 mx-auto"
                >
                  Get Started <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
          
          {step === 'restore' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Cloud size={24} className="text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Restore from Cloud?</h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                We found existing backups on your Google Drive. Would you like to restore your data?
              </p>
              
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {backups.map(backup => (
                  <button
                    key={backup.id}
                    onClick={() => setSelectedBackup(backup.id)}
                    className={`w-full p-3 rounded-xl text-left transition border ${
                      selectedBackup === backup.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium text-sm">{backup.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(backup.createdTime).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300"
                >
                  Start Fresh
                </button>
                <button
                  onClick={() => selectedBackup && handleRestore(selectedBackup)}
                  disabled={!selectedBackup || loading}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Restore Data
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}