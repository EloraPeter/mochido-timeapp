// app/dashboard/student/courses/CoursesClient.tsx
// Mobile-First Redesign: Full-height scroll, bottom sheets, thumb-friendly zones

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
  Filter,
  ChevronRight
} from 'lucide-react';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBREVS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

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
    const confirmed = await confirm(`Drop "${courseName}"?`);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <MobileSidebar />
        <div className="p-4 pt-2">
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-2" />
          <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="flex gap-2 mb-4">
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
          <SkeletonList count={3} variant="course" />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <MobileSidebar />
      <BottomTabBar />

      {/* Sticky Header - Mobile First */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="pl-8">
            <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              Courses
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {myCourses.length} course{myCourses.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Tab Bar - Mobile friendly */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('my-courses')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95 ${
              activeTab === 'my-courses'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <GraduationCap size={18} />
            My Courses
            {myCourses.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'my-courses' ? 'bg-white/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {myCourses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95 ${
              activeTab === 'browse'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Compass size={18} />
            Browse
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
              className="space-y-4"
            >
              {/* Create Course Button - Prominent card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-between p-4 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-md active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Create New Course</p>
                    <p className="text-xs opacity-90">Track your classes or start a study group</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-80" />
              </button>

              {/* Weekly Schedule View - Mobile optimized */}
              {myCourses.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
                    <p className="text-xs text-gray-400">Tap and hold to drop a course</p>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700 ">
                    {coursesByDay.map(({ day, courses: dayCourses }) => (
                      <div key={day} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <CalendarIcon size={12} className="text-blue-500" />
                          </div>
                          <h3 className="font-semibold capitalize text-gray-900 dark:text-white text-sm">
                            {day.slice(0, 3)}
                          </h3>
                          {dayCourses.length === 0 && (
                            <span className="text-xs text-gray-400 ml-auto">No classes</span>
                          )}
                        </div>

                        {dayCourses.length > 0 && (
                          <div className="space-y-2 ml-7">
                            {dayCourses.map(course => (
                              <div
                                key={course.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-30">
                                      {course.title}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">{course.courseCode}</span>
                                    {course.isVerified ? (
                                      <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <CheckCircle size={8} /> Verified
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <AlertCircle size={8} /> Student
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock size={10} />
                                      {course.startTime} - {course.endTime}
                                    </span>
                                    {course.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin size={10} />
                                        <span className="truncate max-w-25">{course.location}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDrop(course.id, course.title)}
                                  className="p-2 text-red-500 active:bg-red-50 dark:active:bg-red-900/20 rounded-full transition-colors"
                                  aria-label="Drop course"
                                >
                                  <LogOut size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-400 font-medium">No courses yet</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-3 px-5 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-all"
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
              {/* Stats - Mobile friendly */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center active:scale-[0.98] transition-transform">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableCourses.length}</p>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center active:scale-[0.98] transition-transform">
                  <p className="text-2xl font-bold text-green-600">
                    {availableCourses.filter(c => c.isVerified).length}
                  </p>
                  <p className="text-xs text-gray-500">Verified</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by title or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Course List - Card based */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                {filteredCourses.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-gray-400 font-medium">No courses found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search</p>
                  </div>
                ) : (
                  filteredCourses.map(course => (
                    <div
                      key={course.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate max-w-35">
                                {course.title}
                              </h3>
                              <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                {course.courseCode}
                              </span>
                              {course.isVerified ? (
                                <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle size={10} /> Verified
                                </span>
                              ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle size={10} /> Student
                                </span>
                              )}
                            </div>
                            
                            {course.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                {course.description}
                              </p>
                            )}
                            
                            {course.startTime && (
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={10} />
                                  {course.days?.map((d: string) => DAY_ABBREVS[d.toLowerCase()] || d.slice(0, 3)).join(', ')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {course.startTime} - {course.endTime}
                                </span>
                                {course.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={10} />
                                    <span className="truncate max-w-25">{course.location}</span>
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {!course.isVerified && (
                              <p className="text-xs text-gray-400 mt-2">
                                Student-created • becomes verified when claimed
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="shrink-0 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-all disabled:opacity-50"
                          >
                            {enrollingId === course.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                              'Enroll'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Mochi Tip - Compact */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹📚</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                <strong>Verified courses</strong> are backed by real lecturers. 
                <strong>Community courses</strong> become verified when a lecturer claims them!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Bottom Sheet */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Course</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCourse} className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course Code *</label>
                  <input
                    type="text"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white uppercase placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CSC101"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    If a lecturer creates this code, it becomes verified
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Introduction to CS"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Schedule Days *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEEKDAYS.map(day => (
                      <label key={day} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer active:bg-gray-50 dark:active:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="e.g., Room 201, Science Building"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Course'}
                  </button>
                </div>
              </form>
              
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}