// components/student/WelcomeHeader.tsx

'use client';

import { motion } from 'framer-motion';
import { Bell, Calendar, Sparkles } from 'lucide-react';
import MochiHamster from '@/components/mochi/MochiHamster';
import { MochiExpression } from '@/components/mochi/hamsterExpressions';

interface WelcomeHeaderProps {
  name: string;
  streakDays: number;
  streakEmoji: string;
  streakMessage: string;
  mood: MochiExpression;
  onMochiClick: () => void;
}

export default function WelcomeHeader({ 
  name, 
  streakDays, 
  streakEmoji, 
  streakMessage, 
  mood, 
  onMochiClick 
}: WelcomeHeaderProps) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 to-purple-600 p-5 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white" />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-90">{greeting()}! 👋</p>
          <h1 className="text-2xl font-bold mt-0.5">{name}</h1>
          <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
            <Calendar size={12} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="text-right">
          {streakDays > 0 && (
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 5 }}
              className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1.5"
            >
              <span className="text-lg">{streakEmoji}</span>
              <span className="text-sm font-semibold">{streakDays}</span>
              <span className="text-xs opacity-80">day streak</span>
            </motion.div>
          )}
          <p className="text-xs opacity-80 mt-2">{streakMessage}</p>
        </div>
      </div>
      
      {/* Mini Mochi */}
      <div className="absolute -bottom-4 -right-2 opacity-30">
        <MochiHamster mood={mood} size="sm" onClick={onMochiClick} />
      </div>
    </div>
  );
}