'use client';

import { motion } from 'framer-motion';
import { getMochiReaction } from '@/lib/intelligence/taskIntelligence';

interface MochiProps {
  insights: {
    onTimeRate: number;
    averageCompletionDelta: number;
    overdueCount: number;
    totalCompleted: number;
    consistencyScore: number;
  } | null;
  urgentCount: number;
}

export default function MochiAvatar({ insights, urgentCount }: MochiProps) {
  if (!insights) {
    return (
      <div className="bg-linear-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl p-6 text-center">
        <div className="text-6xl mb-3">🐹</div>
        <p className="text-lg font-semibold">Loading your productivity buddy...</p>
      </div>
    );
  }
  
  const reaction = getMochiReaction(insights, urgentCount);
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring' }}
      className={`rounded-2xl p-6 text-center ${
        reaction.action === 'urgent' ? 'bg-red-500 animate-pulse' :
        reaction.action === 'celebration' ? 'bg-green-500' :
        'bg-linear-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
      }`}
    >
      <div className="text-6xl mb-3">{reaction.emoji}</div>
      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {reaction.message}
      </p>
      {insights.consistencyScore > 0 && (
        <div className="mt-3 text-sm opacity-75">
          Consistency Score: {Math.round(insights.consistencyScore)}%
        </div>
      )}
    </motion.div>
  );
}