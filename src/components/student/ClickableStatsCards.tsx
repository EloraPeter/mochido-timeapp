// components/student/ClickableStatsCards.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';

interface ClickableStatsCardsProps {
  completionRate: number;
  overdueCount: number;
  completedCount: number;
  streakDays: number;
  totalTasks: number;
}

export default function ClickableStatsCards({ 
  completionRate, 
  overdueCount, 
  completedCount, 
  streakDays,
  totalTasks 
}: ClickableStatsCardsProps) {
  const router = useRouter();

  const stats = [
    {
      label: 'Completion',
      value: `${Math.round(completionRate)}%`,
      subValue: `${completedCount}/${totalTasks} tasks`,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-500/20',
      onClick: () => router.push('/dashboard/student/tasks'),
    },
    {
      label: 'Overdue',
      value: overdueCount,
      subValue: overdueCount === 0 ? 'All caught up!' : 'Need attention',
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-500/10',
      hoverBg: 'hover:bg-red-100 dark:hover:bg-red-500/20',
      onClick: () => router.push('/dashboard/student/tasks?filter=overdue'),
    },
    {
      label: 'Completed',
      value: completedCount,
      subValue: `${Math.round((completedCount / (totalTasks || 1)) * 100)}% of all`,
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-500/10',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-500/20',
      onClick: () => router.push('/dashboard/student/tasks?filter=completed'),
    },
    {
      label: 'Streak',
      value: streakDays,
      subValue: streakDays === 0 ? 'Start today!' : streakDays === 1 ? '1 day!' : `${streakDays} days!`,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-500/20',
      onClick: () => router.push('/dashboard/student/routines'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.button
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={stat.onClick}
          className={`${stat.bg} ${stat.hoverBg} rounded-2xl p-4 transition-all text-left cursor-pointer group`}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon size={20} className={stat.color} />
            {stat.label === 'Overdue' && overdueCount > 0 && (
              <span className="text-xs text-red-500 animate-pulse font-semibold">⚠️</span>
            )}
            {stat.label === 'Streak' && streakDays >= 7 && (
              <span className="text-lg">🔥</span>
            )}
            {stat.label === 'Completion' && completionRate >= 80 && (
              <span className="text-lg">🏆</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          <p className="text-[10px] text-gray-400 mt-1 group-hover:text-blue-500 transition">
            {stat.subValue} →
          </p>
        </motion.button>
      ))}
    </div>
  );
}