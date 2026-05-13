// components/lecturer/RecentActivity.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, FileText, ChevronRight } from 'lucide-react';

interface Activity {
  id: string;
  type: 'submission' | 'deadline' | 'enrollment';
  title: string;
  courseName: string;
  timeAgo: string;
  status?: 'pending' | 'submitted' | 'overdue';
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const router = useRouter();

  const getIcon = (type: string, status?: string) => {
    if (type === 'submission') {
      if (status === 'pending') return <Clock size={14} className="text-orange-500" />;
      return <FileText size={14} className="text-blue-500" />;
    }
    if (type === 'deadline') {
      if (status === 'overdue') return <AlertCircle size={14} className="text-red-500" />;
      return <Clock size={14} className="text-yellow-500" />;
    }
    return <CheckCircle size={14} className="text-green-500" />;
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
        <div className="text-4xl mb-2">✨</div>
        <p className="text-gray-500 text-sm">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">Activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
            <Clock size={16} className="text-purple-500" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {activities.map((activity, idx) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => router.push('/dashboard/lecturer/assignments')}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(activity.type, activity.status)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.courseName}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.timeAgo}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
