// components/mochi/MochiBuddy.tsx (New - Compact and Beautiful)
'use client';

import { motion } from 'framer-motion';
import MochiHamster from './MochiHamster';
import { MochiExpression } from './hamsterExpressions';
import { Sparkles, CheckCircle, TrendingUp, Target, Award } from 'lucide-react';

interface MochiBuddyProps {
  mood: MochiExpression;
  message: string;
  onMochiClick: () => void;
  stats?: {
    completedToday?: number;
    streakDays?: number;
    productivity?: number;
  };
  variant?: 'compact' | 'full' | 'minimal';
}

export default function MochiBuddy({ 
  mood, 
  message, 
  onMochiClick, 
  stats, 
  variant = 'compact' 
}: MochiBuddyProps) {
  
  if (variant === 'minimal') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onMochiClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full shadow-sm"
      >
        <MochiHamster mood={mood} size="sm" onClick={() => {}} />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{message}</span>
      </motion.button>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMochiClick}
            className="relative"
          >
            <MochiHamster mood={mood} size="sm" onClick={() => {}} />
            {mood === 'PROUD' || mood === 'CELEBRATING' || mood === 'MILESTONE' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1 -right-1"
              >
                ⭐
              </motion.div>
            ) : mood === 'CONCERNED' || mood === 'DESPERATE' ? (
              <div className="absolute -top-1 -right-1">💧</div>
            ) : null}
          </motion.button>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {message}
            </p>
            {stats && (
              <div className="flex gap-3 mt-1">
                {stats.completedToday !== undefined && (
                  <div className="flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-500" />
                    <span className="text-[10px] text-gray-500">{stats.completedToday} today</span>
                  </div>
                )}
                {stats.streakDays !== undefined && stats.streakDays > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">🔥</span>
                    <span className="text-[10px] text-gray-500">{stats.streakDays} day streak</span>
                  </div>
                )}
                {stats.productivity !== undefined && (
                  <div className="flex items-center gap-1">
                    <Target size={10} className="text-blue-500" />
                    <span className="text-[10px] text-gray-500">{stats.productivity}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMochiClick}
            className="text-gray-400 hover:text-amber-500 transition"
          >
            <Sparkles size={14} />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Full variant - more detailed
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onMochiClick}
          className="relative"
        >
          <MochiHamster mood={mood} size="md" onClick={() => {}} />
        </motion.button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mochi says:</span>
            {mood === 'PROUD' && <Award size={14} className="text-yellow-500" />}
            {mood === 'CELEBRATING' && <Sparkles size={14} className="text-green-500" />}
            {mood === 'STRESSED' && <span className="text-xs">😰</span>}
          </div>
          <p className="text-gray-800 dark:text-gray-200 text-sm">{message}</p>
          {stats && (
            <div className="flex gap-4 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              {stats.completedToday !== undefined && (
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{stats.completedToday} tasks done today</span>
                </div>
              )}
              {stats.streakDays !== undefined && stats.streakDays > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{stats.streakDays} day streak</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}