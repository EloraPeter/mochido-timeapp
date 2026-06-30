// components/mochi/MochiMessage.tsx

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MochiExpression } from './hamsterExpressions';

interface MochiMessageProps {
  message: string;
  mood: MochiExpression;
  isVisible: boolean;
  onDismiss?: () => void;
  autoDismiss?: number;
}

// Complete color mapping for ALL MochiExpression types
const moodColors: Record<MochiExpression, string> = {
  PROUD: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
  MILESTONE: 'border-amber-500 bg-amber-50 dark:bg-amber-900/30',
  HAPPY: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30',
  NEUTRAL: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
  CONCERNED: 'border-orange-400 bg-orange-50 dark:bg-orange-900/30',
  DISAPPOINTED: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30',
  DESPERATE: 'border-purple-400 bg-purple-50 dark:bg-purple-900/30',
  PASSIVE_AGGRESSIVE: 'border-gray-500 bg-gray-100 dark:bg-gray-800',
  CELEBRATING: 'border-green-400 bg-green-50 dark:bg-green-900/30',
  EARLY_BIRD: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30',
  STRESSED: 'border-red-400 bg-red-50 dark:bg-red-900/30',
  CRAMMING: 'border-gray-700 bg-gray-800 dark:bg-gray-900',
  SLEEPY: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30',
  WAKING: 'border-orange-300 bg-orange-50 dark:bg-orange-900/30',
  ENCOURAGING: 'border-teal-400 bg-teal-50 dark:bg-teal-900/30',
  GASLIGHT: 'border-gray-500 bg-gray-100 dark:bg-gray-800',
  IGNORED: 'border-gray-400 bg-gray-100 dark:bg-gray-800'
};

// Complete emoji mapping for ALL MochiExpression types
const moodEmoji: Record<MochiExpression, string> = {
  PROUD: '🐹👑',
  MILESTONE: '🐹🏆',
  HAPPY: '🐹😊',
  NEUTRAL: '🐹',
  CONCERNED: '🐹😰',
  DISAPPOINTED: '🐹😢',
  DESPERATE: '🐹😭',
  PASSIVE_AGGRESSIVE: '🐹😒',
  CELEBRATING: '🐹🎉',
  EARLY_BIRD: '🐹☀️',
  STRESSED: '🐹😫',
  CRAMMING: '🐹☕',
  SLEEPY: '🐹😴',
  WAKING: '🐹🌅',
  ENCOURAGING: '🐹💪',
  GASLIGHT: '🐹👀',
  IGNORED: '🐹💔'
};

export default function MochiMessage({ 
  message, 
  mood, 
  isVisible, 
  onDismiss, 
  autoDismiss = 5000 
}: MochiMessageProps) {
  
  // Auto-dismiss. This must live in a useEffect, not the render body -
  // calling setTimeout directly during render scheduled a brand new timer
  // on every re-render without ever clearing the previous one, which could
  // fire onDismiss multiple times and leaked timers while mounted.
  useEffect(() => {
    if (!autoDismiss || !isVisible || !onDismiss) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismiss);

    return () => clearTimeout(timer);
  }, [autoDismiss, isVisible, onDismiss]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={cn(
            "rounded-2xl border-2 p-4 max-w-sm mx-auto shadow-lg relative",
            moodColors[mood] || moodColors.NEUTRAL
          )}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">
              {moodEmoji[mood] || '🐹'}
            </div>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">
                {message}
              </p>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
          
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-4 w-4 h-4 rotate-45 bg-inherit border-r-2 border-b-2 border-inherit" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}