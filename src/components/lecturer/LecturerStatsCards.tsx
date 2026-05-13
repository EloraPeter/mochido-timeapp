// components/lecturer/LecturerStatsCards.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, FileText, TrendingUp, Clock, Calendar } from 'lucide-react';

interface LecturerStatsCardsProps {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  pendingGrading: number;
  completionRate: number;
  activeCourses: number;
}

export default function LecturerStatsCards({
  totalCourses,
  totalStudents,
  totalAssignments,
  pendingGrading,
  completionRate,
  activeCourses
}: LecturerStatsCardsProps) {
  const router = useRouter();

  const stats = [
    {
      label: 'Total Courses',
      value: totalCourses,
      subValue: `${activeCourses} active`,
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      onClick: () => router.push('/dashboard/lecturer/courses'),
    },
    {
      label: 'Total Students',
      value: totalStudents,
      subValue: 'enrolled',
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-500/10',
      onClick: () => router.push('/dashboard/lecturer/courses'),
    },
    {
      label: 'Assignments',
      value: totalAssignments,
      subValue: `${pendingGrading} pending grading`,
      icon: FileText,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      onClick: () => router.push('/dashboard/lecturer/assignments'),
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      subValue: 'student average',
      icon: TrendingUp,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      onClick: () => router.push('/dashboard/lecturer/assignments'),
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={stat.onClick}
          className={`${stat.bg} rounded-2xl p-4 transition-all text-left cursor-pointer hover:shadow-md`}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon size={20} className={stat.color} />
            {pendingGrading > 0 && stat.label === 'Assignments' && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingGrading}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          <p className="text-[10px] text-gray-400 mt-1">{stat.subValue}</p>
        </motion.button>
      ))}
    </div>
  );
}