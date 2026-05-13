// components/student/StatsCards.tsx

'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';

interface StatsCardsProps {
  completionRate: number;
  overdueCount: number;
  completedCount: number;
  streakDays: number;
}

export default function StatsCards({ completionRate, overdueCount, completedCount, streakDays }: StatsCardsProps) {
  const stats = [
    {
      label: 'Completion',
      value: `${completionRate.toFixed(0)}%`,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      trend: completionRate >= 70 ? 'up' : 'down',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-500/10',
      trend: overdueCount === 0 ? 'none' : 'urgent',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-500/10',
      trend: 'up',
    },
    {
      label: 'Streak',
      value: streakDays,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      trend: streakDays >= 7 ? 'fire' : 'normal',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`${stat.bg} rounded-2xl p-4 transition-all hover:scale-105`}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon size={20} className={stat.color} />
            {stat.trend === 'fire' && <span className="text-lg">🔥</span>}
            {stat.trend === 'urgent' && overdueCount > 0 && (
              <span className="text-xs text-red-500 animate-pulse">URGENT</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
