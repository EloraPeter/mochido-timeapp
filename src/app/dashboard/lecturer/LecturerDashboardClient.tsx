// app/dashboard/lecturer/LecturerDashboardClient.tsx (COMPLETE REWRITE)
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import { useTasks } from '@/hooks/useTasks';
import { useEnrollments } from '@/hooks/useEnrollments';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import LecturerStatsCards from '@/components/lecturer/LecturerStatsCards';
import LecturerWelcomeHeader from '@/components/lecturer/LecturerWelcomeHeader';
import TodayTeachingSchedule from '@/components/lecturer/TodayTeachingSchedule';
import RecentActivity from '@/components/lecturer/RecentActivity';
import { useMochiMood } from '@/hooks/useMochiMood';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonList } from '@/components/ui/SkeletonList';
import { formatDistanceToNow } from 'date-fns';

export default function LecturerDashboardClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useLecturerCourses();
  const { tasks, loading: tasksLoading } = useTasks();
  const { enrollments, loading: enrollmentsLoading } = useEnrollments();
  const { mood, guiltMessage, dismissGuiltMessage, refreshMood } = useMochiMood();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.days?.length > 0).length;

    // Get assignments created by this lecturer
    const courseCatalogIds = courses.map(c => c.catalogId);
    const lecturerAssignments = tasks.filter(t => courseCatalogIds.includes(t.catalogId));
    const totalAssignments = lecturerAssignments.length;
    const pendingGrading = lecturerAssignments.filter(a => !a.isDone && new Date(a.dueDate) > new Date()).length;

    // Calculate completion rate across all assignments
    const completedAssignments = lecturerAssignments.filter(a => a.isDone).length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // Total enrolled students (unique)
    const uniqueStudentIds = new Set(enrollments.map(e => e.studentId));
    const totalStudents = uniqueStudentIds.size;

    return {
      totalCourses,
      activeCourses,
      totalAssignments,
      pendingGrading,
      completionRate,
      totalStudents
    };
  }, [courses, tasks, enrollments]);

  // Get today's classes
  const todayClasses = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return courses.filter(course =>
      course.days?.map((d: string) => d.toLowerCase()).includes(today)
    ).map(course => ({
      ...course,
      enrolledCount: enrollments.filter(e => {
        const courseEnrollment = courses.find(c => c.catalogId === e.catalogId);
        return courseEnrollment?.id === course.id;
      }).length
    }));
  }, [courses, enrollments]);

  // Generate recent activities
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    const courseCatalogIds = courses.map(c => c.catalogId);
    const lecturerAssignments = tasks.filter(t => courseCatalogIds.includes(t.catalogId));

    // Add upcoming deadlines
    lecturerAssignments
      .filter(a => !a.isDone && new Date(a.dueDate) > new Date())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3)
      .forEach(assignment => {
        const course = courses.find(c => c.catalogId === assignment.catalogId);
        const daysLeft = Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        activities.push({
          id: assignment.id,
          type: 'deadline',
          title: assignment.title,
          courseName: course?.name || 'Unknown Course',
          timeAgo: daysLeft === 0 ? 'Due today!' : `${daysLeft} days left`,
          status: daysLeft <= 2 ? 'overdue' : 'pending'
        });
      });

    return activities.slice(0, 5);
  }, [tasks, courses]);

  const loading = coursesLoading || tasksLoading || enrollmentsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <MobileSidebar />
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          <div className="ml-10 md:ml-0">
            <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} variant="stats" />
            ))}
          </div>
          <SkeletonCard variant="course" />
          <SkeletonList count={3} variant="task" />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  const getDisplayName = () => {
    const firstName = user?.name?.split(' ')[0] || '';
    const title = user?.title;
    if (title) return `${title} ${firstName}`;
    return firstName;
  };

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

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <LecturerWelcomeHeader
            name={getDisplayName()}
            totalCourses={stats.totalCourses}
            totalStudents={stats.totalStudents}
            mood={mood}
            onMochiClick={refreshMood}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <LecturerStatsCards
          totalCourses={stats.totalCourses}
          totalStudents={stats.totalStudents}
          totalAssignments={stats.totalAssignments}
          pendingGrading={stats.pendingGrading}
          completionRate={stats.completionRate}
          activeCourses={stats.activeCourses}
        />

        {/* Two Column Layout for larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <TodayTeachingSchedule courses={todayClasses} />

          {/* Recent Activity */}
          <RecentActivity activities={recentActivities} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/lecturer/assignments')}
            className="p-4 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-2xl text-left hover:shadow-lg transition"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📝</span>
              <span className="font-semibold">Create Assignment</span>
            </div>
            <p className="text-xs opacity-90">Post new tasks for your students</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/lecturer/courses')}
            className="p-4 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-2xl text-left hover:shadow-lg transition relative"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📚</span>
              <span className="font-semibold">Manage Courses</span>
            </div>
            <p className="text-xs opacity-90">Add or edit course details</p>
            {stats.pendingGrading > 0 && (
              <span className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full">
                {stats.pendingGrading}
              </span>
            )}
          </motion.button>
        </div>

        {/* Course Overview Summary */}
        {courses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="text-lg">📊</span> Course Overview
            </h3>
            <div className="space-y-3">
              {courses.slice(0, 3).map(course => {
                const courseAssignments = tasks.filter(t => t.catalogId === course.catalogId);
                const completedAssignments = courseAssignments.filter(a => a.isDone).length;
                const assignmentRate = courseAssignments.length > 0
                  ? Math.round((completedAssignments / courseAssignments.length) * 100)
                  : 0;

                return (
                  <div key={course.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {assignmentRate}% complete
                      </p>
                      <p className="text-xs text-gray-400">
                        {courseAssignments.length} assignments
                      </p>
                    </div>
                  </div>
                );
              })}
              {courses.length > 3 && (
                <button
                  onClick={() => router.push('/dashboard/lecturer/courses')}
                  className="text-center text-sm text-blue-500 hover:underline w-full pt-2"
                >
                  View all {courses.length} courses →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mochi Encouragement */}
        <div className="text-center pt-4 pb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-2 cursor-pointer inline-block"
            onClick={() => router.push('/dashboard/lecturer/assignments')}
          >
            🐹✨
          </motion.div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mochi says: "Great teachers inspire great students! You've got this! 🎓"
          </p>
        </div>
      </div>
    </div>
  );
}