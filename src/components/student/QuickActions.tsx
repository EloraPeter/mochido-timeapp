// components/student/QuickActions.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, Calendar as CalendarIcon, Search, Sparkles, Sun, BookOpen } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
  description: string;
}

export default function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    { 
      label: 'Add Task', 
      icon: Plus, 
      color: 'from-blue-500 to-blue-600', 
      onClick: () => router.push('/dashboard/student/tasks'),
      description: 'Create new task'
    },
    { 
      label: 'My Courses', 
      icon: BookOpen, 
      color: 'from-purple-500 to-purple-600', 
      onClick: () => router.push('/dashboard/student/courses'),
      description: 'View schedule'
    },
    { 
      label: 'Browse', 
      icon: Search, 
      color: 'from-green-500 to-green-600', 
      onClick: () => router.push('/dashboard/student/courses?tab=browse'),
      description: 'Find courses'
    },
    { 
      label: 'Routines', 
      icon: Sun, 
      color: 'from-orange-500 to-orange-600', 
      onClick: () => router.push('/dashboard/student/routines'),
      description: 'Build habits'
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className={`bg-linear-to-r ${action.color} text-white rounded-2xl p-3 hover:shadow-lg transition-all group`}
        >
          <action.icon size={22} className="mb-1 mx-auto" />
          <span className="text-xs font-semibold block">{action.label}</span>
          <span className="text-[9px] opacity-80 mt-0.5 block">{action.description}</span>
        </motion.button>
      ))}
    </div>
  );
}