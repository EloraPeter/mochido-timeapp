// components/student/TodayTasksList.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Clock, Plus, AlertCircle } from 'lucide-react';
import { formatDueDateRelative, isOverdue } from '@/lib/dateUtils';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  isDone: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface TodayTasksListProps {
  tasks: Task[];
  onToggle: (id: string) => Promise<void>;
  onAdd: () => void;
}

export default function TodayTasksList({ tasks, onToggle, onAdd }: TodayTasksListProps) {
  const activeTasks = tasks.filter(t => !t.isDone);
  const completedTasks = tasks.filter(t => t.isDone);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50/30 dark:bg-red-900/10';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-green-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">High</span>;
      case 'medium': return <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full">Medium</span>;
      default: return <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Low</span>;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-gray-500 text-sm">No tasks for today!</p>
        <p className="text-xs text-gray-400 mt-1">Time to relax or plan ahead 📚</p>
        <button
          onClick={onAdd}
          className="mt-4 text-blue-500 text-sm flex items-center justify-center gap-1 mx-auto hover:gap-2 transition-all"
        >
          <Plus size={14} /> Add a task
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 dark:bg-green-500/20 rounded-lg">
            <CheckCircle size={16} className="text-green-500" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Today's Tasks</h2>
          {activeTasks.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
              {activeTasks.length} left
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition transform hover:scale-105"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-100 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {activeTasks.map((task, idx) => {
            const overdue = isOverdue(task.dueDate);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
                className={`p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition border-l-4 ${getPriorityColor(task.priority)}`}
              >
                <button
                  onClick={() => onToggle(task.id)}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  {task.isDone ? (
                    <CheckCircle size={22} className="text-green-500" />
                  ) : (
                    <Circle size={22} className="text-gray-400 hover:text-blue-500 transition" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${task.isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getPriorityBadge(task.priority)}
                    <span className={`text-xs flex items-center gap-1 ${overdue && !task.isDone ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      <Clock size={10} />
                      {formatDueDateRelative(task.dueDate)}
                      {overdue && !task.isDone && <AlertCircle size={10} className="text-red-500" />}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {completedTasks.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-2">
              <p className="text-xs text-gray-400 px-3 py-1">Completed ({completedTasks.length})</p>
              {completedTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="p-3 flex items-center gap-3 opacity-70">
                  <CheckCircle size={20} className="text-green-400" />
                  <p className="text-sm text-gray-400 line-through truncate flex-1">{task.title}</p>
                </div>
              ))}
              {completedTasks.length > 3 && (
                <p className="text-xs text-center text-gray-400 py-1">
                  +{completedTasks.length - 3} more completed
                </p>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}