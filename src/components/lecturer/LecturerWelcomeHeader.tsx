// components/lecturer/LecturerWelcomeHeader.tsx
'use client';

import { motion } from 'framer-motion';
import { Calendar, Sparkles, Users, BookOpen } from 'lucide-react';
import MochiHamster from '@/components/mochi/MochiHamster';
import { MochiExpression } from '@/components/mochi/hamsterExpressions';

interface LecturerWelcomeHeaderProps {
  name: string;
  title?: string;
  totalCourses: number;
  totalStudents: number;
  mood: MochiExpression;
  onMochiClick: () => void;
}

export default function LecturerWelcomeHeader({
  name,
  title,
  totalCourses,
  totalStudents,
  mood,
  onMochiClick
}: LecturerWelcomeHeaderProps) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-purple-600 to-indigo-600 p-5 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white" />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-90">{greeting()}! 👨‍🏫</p>
          <h1 className="text-2xl font-bold mt-0.5">
            {title ? `${title} ${name}` : name}
          </h1>
          <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
            <Calendar size={12} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="text-right">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 10 }}
            className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5"
          >
            <BookOpen size={14} />
            <span className="text-sm font-semibold">{totalCourses}</span>
            <span className="text-xs opacity-80">courses</span>
          </motion.div>
          <div className="flex items-center gap-1 justify-end mt-1">
            <Users size={12} className="opacity-70" />
            <p className="text-xs opacity-80">{totalStudents} students</p>
          </div>
        </div>
      </div>
      
      {/* Mini Mochi */}
      <div className="absolute -bottom-4 -right-2 opacity-40">
        <MochiHamster mood={mood} size="sm" onClick={onMochiClick} />
      </div>
    </div>
  );
}