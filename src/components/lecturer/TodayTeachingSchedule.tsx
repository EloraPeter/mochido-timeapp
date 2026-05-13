// components/lecturer/TodayTeachingSchedule.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Calendar, Users, ChevronRight } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
  days: string[];
  startTime: string;
  endTime: string;
  location?: string;
  capacity?: number;
  enrolledCount?: number;
}

interface TodayTeachingScheduleProps {
  courses: Course[];
}

export default function TodayTeachingSchedule({ courses }: TodayTeachingScheduleProps) {
  const router = useRouter();

  if (courses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
        <div className="text-4xl mb-2">🏖️</div>
        <p className="text-gray-500 text-sm">No classes scheduled for today</p>
        <p className="text-xs text-gray-400 mt-1">Time for research and grading!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <Calendar size={16} className="text-blue-500" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Today's Teaching Schedule</h2>
        </div>
        <span className="text-xs text-gray-400">{courses.length} class{courses.length !== 1 ? 'es' : ''}</span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => router.push(`/dashboard/lecturer/courses`)}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{course.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">{course.code}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {course.startTime} - {course.endTime}
                  </span>
                  {course.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {course.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {course.enrolledCount || 0}/{course.capacity || 50} students
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}