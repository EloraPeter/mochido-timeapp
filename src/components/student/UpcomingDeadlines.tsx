// components/student/UpcomingDeadlines.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { formatDueDateRelative, isOverdue, getHoursRemaining } from '@/lib/dateUtils';

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  catalogId: string;
  priority: 'high' | 'medium' | 'low';
}

interface UpcomingDeadlinesProps {
  assignments: Assignment[];
}

export default function UpcomingDeadlines({ assignments }: UpcomingDeadlinesProps) {
  const router = useRouter();
  const now = new Date();
  
  const overdue = assignments.filter(a => isOverdue(a.dueDate));
  const upcoming = assignments.filter(a => !isOverdue(a.dueDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const getUrgencyLevel = (dueDate: string) => {
    const hoursLeft = getHoursRemaining(dueDate);
    if (hoursLeft <= 2) return 'critical';
    if (hoursLeft <= 12) return 'urgent';
    if (hoursLeft <= 24) return 'soon';
    return 'normal';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white border-red-600';
      case 'urgent': return 'bg-orange-500 text-white border-orange-600';
      case 'soon': return 'bg-yellow-500 text-white border-yellow-600';
      default: return 'bg-blue-500 text-white border-blue-600';
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
        <div className="text-5xl mb-3">🎓</div>
        <p className="text-gray-500 text-sm">No upcoming deadlines!</p>
        <p className="text-xs text-gray-400 mt-1">You're all caught up 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
            <Calendar size={16} className="text-orange-500" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
          {overdue.length > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              {overdue.length} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/student/assignments')}
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          View all <ChevronRight size={12} />
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {/* Overdue Section */}
        {overdue.slice(0, 3).map(assignment => {
          const hoursOverdue = Math.abs(getHoursRemaining(assignment.dueDate));
          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              onClick={() => router.push('/dashboard/student/assignments')}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} /> OVERDUE
                    </span>
                    {assignment.priority === 'high' && (
                      <span className="text-[10px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full">High Priority</span>
                    )}
                  </div>
                  <p className="font-semibold text-red-800 dark:text-red-200 text-sm">{assignment.title}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Overdue by {hoursOverdue} hour{hoursOverdue !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={18} className="text-red-400" />
              </div>
            </motion.div>
          );
        })}

        {/* Upcoming Section */}
        {upcoming.map((assignment, idx) => {
          const urgencyLevel = getUrgencyLevel(assignment.dueDate);
          const urgencyColor = getUrgencyColor(urgencyLevel);
          const hoursLeft = getHoursRemaining(assignment.dueDate);
          
          let urgencyText = '';
          if (urgencyLevel === 'critical') urgencyText = `${hoursLeft} hours left!`;
          else if (urgencyLevel === 'urgent') urgencyText = `${hoursLeft} hours left`;
          else if (urgencyLevel === 'soon') urgencyText = 'Due tomorrow';
          else urgencyText = formatDueDateRelative(assignment.dueDate);

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition cursor-pointer group"
              onClick={() => router.push('/dashboard/student/assignments')}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{assignment.title}</p>
                    {assignment.priority === 'high' && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">High</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyColor} bg-opacity-20`}>
                      {urgencyText}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {assignments.length > 5 && (
        <button
          onClick={() => router.push('/dashboard/student/assignments')}
          className="w-full p-3 text-center text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition font-medium"
        >
          View all {assignments.length} assignments →
        </button>
      )}
    </div>
  );
}