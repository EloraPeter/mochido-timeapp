// app/dashboard/student/StudentDashboardClient.tsx
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useCourseService } from '@/hooks/useCourseService';
import { useRoutines } from '@/hooks/useRoutines';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import WelcomeHeader from '@/components/student/WelcomeHeader';
import ClickableStatsCards from '@/components/student/ClickableStatsCards';
import QuickActions from '@/components/student/QuickActions';
import TodaySchedule from '@/components/student/TodaySchedule';
import TodayTasksList from '@/components/student/TodayTasksList';
import UpcomingDeadlines from '@/components/student/UpcomingDeadlines';
import MochiMessage from '@/components/mochi/MochiMessage';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonList }  from '@/components/ui/SkeletonList';
import { useMochiMood } from '@/hooks/useMochiMood';
import { useStreak } from '@/hooks/useStreak';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Circle, CheckCircle, Clock, Sun, AlertCircle, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentDashboardClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    urgentTasks, 
    todayTasks, 
    stats, 
    loading: tasksLoading, 
    toggleComplete, 
    deleteTask, 
    addTask,
    refreshData
  } = useTasks();
  const { myCourses, loading: coursesLoading, refresh: refreshCourses } = useCourseService();
  const { routines, getMorningRoutines, loading: routinesLoading, refreshRoutines } = useRoutines();
  const { mood, guiltMessage, dismissGuiltMessage, refreshMood } = useMochiMood();
  const { streak, recordLogin, getStreakEmoji, getStreakMessage, refreshStreak } = useStreak();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Record login on mount
  useEffect(() => {
    recordLogin();
  }, [recordLogin]);

  // Refresh all data periodically
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshData(),
      refreshCourses(),
      refreshRoutines(),
      refreshStreak(),
      refreshMood()
    ]);
    setIsRefreshing(false);
  }, [refreshData, refreshCourses, refreshRoutines, refreshStreak, refreshMood]);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Calculate wake-up time
  const wakeUpData = useMemo(() => {
    const courses = myCourses || [];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayCourses = courses.filter((course: any) =>
      course.days?.map((d: string) => d.toLowerCase()).includes(today)
    );

    if (todayCourses.length === 0) {
      return { time: null, firstClass: null, totalPrepMinutes: 0, routineCount: 0 };
    }

    const firstClass = todayCourses.reduce((earliest: any, current: any) =>
      (current.startTime || '99:99') < (earliest.startTime || '99:99') ? current : earliest
    );

    const morningRoutines = getMorningRoutines();
    const totalPrepMinutes = morningRoutines.reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0);
    const totalWithBuffer = totalPrepMinutes + 15;

    if (!firstClass.startTime) {
      return { time: null, firstClass: null, totalPrepMinutes: 0, routineCount: 0 };
    }

    const [classHour, classMinute] = firstClass.startTime.split(':').map(Number);
    const classMinutes = classHour * 60 + classMinute;
    const wakeMinutes = classMinutes - totalWithBuffer;

    let wakeHour = Math.floor(wakeMinutes / 60);
    let wakeMin = wakeMinutes % 60;
    if (wakeMinutes < 0) wakeHour = 24 + wakeHour;

    return {
      time: `${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
      firstClass,
      totalPrepMinutes: totalWithBuffer,
      routineCount: morningRoutines.length
    };
  }, [myCourses, getMorningRoutines]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const dueDate = newTaskDueDate ? new Date(newTaskDueDate) : new Date();
    dueDate.setHours(23, 59, 0, 0);

    await addTask({
      title: newTaskTitle,
      dueDate: dueDate.toISOString(),
      catalogId: 'general',
      priority: newTaskPriority,
      notes: '',
      reminderMinutes: [1440, 60, 10, 0],
      isDone: false
    });

    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setShowAddTask(false);
  };

  const handleToggleTask = async (id: string) => {
    await toggleComplete(id);
    // Refresh streak after completing a task
    await refreshStreak();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const loading = tasksLoading || coursesLoading || routinesLoading;

  // Prepare assignments for UpcomingDeadlines component
  const assignments = useMemo(() => {
    return urgentTasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      catalogId: task.catalogId,
      priority: task.priority
    }));
  }, [urgentTasks]);

  // Prepare courses for TodaySchedule component
  const todayCoursesList = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return (myCourses || [])
      .filter((course: any) => course.days?.map((d: string) => d.toLowerCase()).includes(today))
      .map((course: any) => ({
        id: course.id,
        title: course.title,
        courseCode: course.courseCode,
        startTime: course.startTime,
        endTime: course.endTime,
        location: course.location,
        days: course.days
      }));
  }, [myCourses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <MobileSidebar />
        <div className="max-w-4xl mx-auto p-4 space-y-5">
          <div className="ml-10 md:ml-0">
            <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonCard variant="default" className="w-28 h-28 rounded-full" />
            <div className="text-right">
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse" />
            </div>
          </div>
          <SkeletonCard variant="default" className="h-20" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} variant="stats" />
            ))}
          </div>
          <SkeletonList count={3} variant="task" />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const streakDays = streak?.currentStreak || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <MobileSidebar />
      <BottomTabBar />

      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2">
          <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
            Refreshing...
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Welcome Header */}
        <WelcomeHeader
          name={firstName}
          streakDays={streakDays}
          streakEmoji={getStreakEmoji()}
          streakMessage={getStreakMessage()}
          mood={mood}
          onMochiClick={refreshMood}
        />


        {/* Wake-Up Time Card */}
        {wakeUpData.time && wakeUpData.firstClass ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push('/dashboard/student/routines')}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sun size={20} />
                  <p className="text-sm font-medium opacity-90">Recommended Wake-Up Time</p>
                </div>
                <p className="text-4xl font-bold">{wakeUpData.time}</p>
                <p className="text-sm mt-2 opacity-90">
                  For {wakeUpData.firstClass.title} at {wakeUpData.firstClass.startTime}
                </p>
                {wakeUpData.routineCount > 0 && (
                  <p className="text-xs mt-1 opacity-75">
                    {wakeUpData.routineCount} morning routine{wakeUpData.routineCount !== 1 ? 's' : ''} • {wakeUpData.totalPrepMinutes} min prep
                  </p>
                )}
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-gray-400 to-gray-500 rounded-2xl p-5 text-white cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push('/dashboard/student/routines')}
          >
            <div className="flex items-center gap-3">
              <Sun size={24} />
              <div>
                <p className="text-sm font-medium opacity-90">No classes today!</p>
                <p className="text-sm">Sleep in, no alarm needed 🎉</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Clickable Stats Cards */}
        <ClickableStatsCards
          completionRate={stats.completionRate}
          overdueCount={stats.overdue}
          completedCount={stats.completed}
          streakDays={streakDays}
          totalTasks={stats.total}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Two Column Layout for larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Schedule */}
          <TodaySchedule courses={todayCoursesList} />

          {/* Today's Tasks */}
          <TodayTasksList
            tasks={todayTasks.map(task => ({
              id: task.id,
              title: task.title,
              dueDate: task.dueDate,
              isDone: task.isDone,
              priority: task.priority
            }))}
            onToggle={handleToggleTask}
            onAdd={() => setShowAddTask(true)}
          />
        </div>

        {/* Upcoming Deadlines */}
        <UpcomingDeadlines assignments={assignments} />

        {/* Morning Routines Preview */}
        {getMorningRoutines().length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock size={14} />
              Morning Preparation
            </h3>
            <div className="flex flex-wrap gap-2">
              {getMorningRoutines().slice(0, 4).map((routine: any) => (
                <span key={routine.id} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                  {routine.title} ({routine.durationMinutes}min)
                </span>
              ))}
              {getMorningRoutines().length > 4 && (
                <button
                  onClick={() => router.push('/dashboard/student/routines')}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-full hover:bg-gray-200 transition"
                >
                  +{getMorningRoutines().length - 4} more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mochi Encouragement Footer */}
        <div className="text-center pt-4 pb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 10 }}
            className="text-4xl mb-2 cursor-pointer inline-block"
            onClick={refreshMood}
          >
            🐹✨
          </motion.div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Keep going! Every task completed brings you closer to your goals.
          </p>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddTask(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Task</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as const).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setNewTaskPriority(priority)}
                        className={`p-3 rounded-xl capitalize transition ${
                          newTaskPriority === priority
                            ? priority === 'high'
                              ? 'bg-red-500 text-white'
                              : priority === 'medium'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for end of today</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}