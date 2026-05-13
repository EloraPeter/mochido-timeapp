// app/dashboard/student/courses/CoursesClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCourseService } from '@/hooks/useCourseService';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonList }  from '@/components/ui/SkeletonList';
import {
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  LogOut,
  BookOpen,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Search,
  PlusCircle,
  GraduationCap,
  Compass,
  Filter
} from 'lucide-react';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type TabType = 'my-courses' | 'browse';

export default function CoursesClient() {
  const { myCourses, availableCourses, loading, dropCourse, createStudentCourse, enrollInCourse } = useCourseService();
  const { success, error, confirm } = useCustomAlert();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('my-courses');
  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'browse' || tabFromUrl === 'my-courses') {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    courseCode: '',
    title: '',
    days: [] as string[],
    startTime: '09:00',
    endTime: '10:00',
    location: ''
  });

  // Filter available courses
  const filteredCourses = availableCourses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group enrolled courses by day
  const coursesByDay = WEEKDAYS.map(day => ({
    day,
    courses: myCourses.filter(c => 
      c.days && c.days.map(d => d.toLowerCase()).includes(day)
    )
  }));

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseCode || !formData.title || formData.days.length === 0) {
      error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createStudentCourse(
        formData.courseCode,
        formData.title,
        {
          days: formData.days,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location
        }
      );
      setShowCreateModal(false);
      setFormData({
        courseCode: '',
        title: '',
        days: [],
        startTime: '09:00',
        endTime: '10:00',
        location: ''
      });
      success('Course created successfully!');
    } catch (err) {
      error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await enrollInCourse(courseId);
      success('Successfully enrolled!');
    } catch (err) {
      error((err as Error).message);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDrop = async (catalogId: string, courseName: string) => {
    const confirmed = await confirm(`Are you sure you want to drop ${courseName}?`);
    if (confirmed) {
      await dropCourse(catalogId);
      success(`Dropped ${courseName}`);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <MobileSidebar />
        <div className="max-w-4xl mx-auto p-4 space-y-5">
          <div className="ml-10 md:ml-0">
            <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <SkeletonCard className="w-32 h-10" />
            <SkeletonCard className="w-32 h-10" />
          </div>
          <SkeletonList count={3} variant="course" />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <MobileSidebar />
      <BottomTabBar />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="ml-10 md:ml-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Courses</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {myCourses.length} course{myCourses.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Tab Bar */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('my-courses')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'my-courses'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <GraduationCap size={18} />
            My Courses
            {myCourses.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'my-courses' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
              }`}>
                {myCourses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'browse'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Compass size={18} />
            Browse Courses
          </button>
        </div>

        {/* My Courses Tab */}
        {activeTab === 'my-courses' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="my-courses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Create Course Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-between p-4 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:shadow-lg transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Create New Course</p>
                    <p className="text-xs opacity-90">Start a study group or create a new course</p>
                  </div>
                </div>
                <PlusCircle size={24} className="opacity-80 group-hover:opacity-100 transition" />
              </button>

              {/* Weekly Schedule View */}
              {myCourses.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-125 overflow-y-auto">
                    {coursesByDay.map(({ day, courses: dayCourses }) => (
                      <div key={day} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarIcon size={16} className="text-blue-500" />
                          <h3 className="font-semibold capitalize text-gray-900 dark:text-white">{day}</h3>
                          {dayCourses.length === 0 && (
                            <span className="text-xs text-gray-400">No classes</span>
                          )}
                        </div>

                        {dayCourses.length > 0 && (
                          <div className="space-y-2 ml-6">
                            {dayCourses.map(course => (
                              <motion.div
                                key={course.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition group"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-900 dark:text-white">{course.title}</span>
                                    <span className="text-xs text-gray-500 font-mono">{course.courseCode}</span>
                                    {course.isVerified ? (
                                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle size={10} /> Verified
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertCircle size={10} /> Unverified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDrop(course.id, course.title)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                                >
                                  <LogOut size={16} />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                  <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">You're not enrolled in any courses yet</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                  >
                    Browse Courses
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Browse Courses Tab */}
        {activeTab === 'browse' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableCourses.length}</p>
                  <p className="text-xs text-gray-500">Available Courses</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-green-600">
                    {availableCourses.filter(c => c.isVerified).length}
                  </p>
                  <p className="text-xs text-gray-500">Verified by Lecturers</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by course title or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Course List */}
              <div className="space-y-3 max-h-125 overflow-y-auto">
                {filteredCourses.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-gray-500">No courses available</p>
                    <p className="text-sm text-gray-400 mt-1">Check back later for new courses</p>
                  </div>
                ) : (
                  filteredCourses.map(course => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                {course.courseCode}
                              </span>
                              {course.isVerified ? (
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle size={10} /> Verified
                                </span>
                              ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle size={10} /> Community Course
                                </span>
                              )}
                            </div>
                            
                            {course.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{course.description}</p>
                            )}
                            
                            {course.startTime && (
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={12} />
                                  {course.days?.map((d: string) => d.slice(0, 3)).join(', ')}
                                </span>
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
                              </div>
                            )}
                            
                            {!course.isVerified && (
                              <p className="text-xs text-gray-400 mt-2">
                                Created by a student. If a lecturer claims this course, it will become verified.
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="ml-3 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {enrollingId === course.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <PlusCircle size={16} />
                            )}
                            Enroll
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Mochi Tip */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹📚</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                <strong>Verified courses</strong> are backed by real lecturers and include assignments. 
                <strong>Community courses</strong> are created by students - they become verified when a lecturer claims them!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Course</h2>
                <button onClick={() => setShowCreateModal(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Course Code *</label>
                  <input
                    type="text"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., CSC101"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    If a lecturer creates a course with this code, it will automatically become verified
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Course Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Schedule Days *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEEKDAYS.map(day => (
                      <label key={day} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., Room 201, Science Building"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Course'}
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