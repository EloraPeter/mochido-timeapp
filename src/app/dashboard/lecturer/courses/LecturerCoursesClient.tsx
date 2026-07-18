'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import { useCourseService } from '@/hooks/useCourseService';
import BottomTabBar from '@/components/BottomTabBar';
import MobileSidebar from '@/components/MobileSidebar';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonList } from '@/components/ui/SkeletonList';
import CourseImportModal from '@/components/CourseImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  ChevronRight,
  X,
  Eye,
  GripVertical,
  ShieldCheck,
  UserCheck,
  FileUp
} from 'lucide-react';
import { format } from 'date-fns';

interface CourseFormData {
  name: string;
  code: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  capacity: number;
}

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

export default function LecturerCoursesClient() {
  const { user } = useAuth();
  const { courses, loading, addCourse, updateCourse, deleteCourse, refreshCourses } = useLecturerCourses();
  const { allCatalogs, lecturerCourses, claimCourse, refresh: refreshCatalogs, loading: catalogLoading } = useCourseService();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const { success, error, confirm, toast } = useCustomAlert();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    code: '',
    days: [],
    startTime: '09:00',
    endTime: '10:30',
    location: '',
    description: '',
    capacity: 50
  });

  const handleOpenModal = (course?: any) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name,
        code: course.code,
        days: course.days,
        startTime: course.startTime,
        endTime: course.endTime,
        location: course.location || '',
        description: course.description || '',
        capacity: course.capacity || 50
      });
    } else {
      setEditingCourse(null);
      setFormData({
        name: '',
        code: '',
        days: [],
        startTime: '09:00',
        endTime: '10:30',
        location: '',
        description: '',
        capacity: 50
      });
    }
    setShowModal(true);
  };

  // Catalog entries that are still unverified and have no lecturer course
  // offering yet - these are courses students created themselves (via
  // "Create Course" on their own schedule) that no lecturer has claimed.
  // Claiming one verifies it and lets this lecturer set up its real
  // schedule, instead of leaving it permanently unverified.
  const unclaimedCatalogs = useMemo(() => {
    const claimedCatalogIds = new Set(lecturerCourses.map(lc => lc.catalogId));
    return allCatalogs.filter(c => !c.isVerified && !claimedCatalogIds.has(c.id));
  }, [allCatalogs, lecturerCourses]);

  const handleClaim = async (catalogId: string, courseTitle: string) => {
    const confirmed = await confirm(`Claim "${courseTitle}"? This will mark it as verified and let you set its schedule.`);
    if (!confirmed) return;

    setClaimingId(catalogId);
    try {
      const claimed = await claimCourse(catalogId);
      // claimCourse() already created a LecturerCourse row for this catalog
      // entry (with an empty schedule). Open the edit form against *that*
      // row so submitting calls updateCourse, not addCourse - otherwise
      // we'd end up with two LecturerCourse rows for the same catalog id.
      const catalog = allCatalogs.find(c => c.id === catalogId);
      setEditingCourse({
        id: claimed.id,
        catalogId: claimed.catalogId,
        name: catalog?.title || courseTitle,
        code: catalog?.courseCode || '',
        days: claimed.days || [],
        startTime: claimed.startTime || '09:00',
        endTime: claimed.endTime || '10:30',
        location: claimed.location || '',
      });
      setFormData({
        name: catalog?.title || courseTitle,
        code: catalog?.courseCode || '',
        days: claimed.days || [],
        startTime: claimed.startTime || '09:00',
        endTime: claimed.endTime || '10:30',
        location: claimed.location || '',
        description: catalog?.description || '',
        capacity: 50
      });
      success(`"${courseTitle}" claimed and verified. Set its schedule below.`);
      setShowModal(true);
    } catch (err) {
      error((err as Error).message || 'Failed to claim course');
    } finally {
      setClaimingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code || formData.days.length === 0) {
      error('Please fill in name, code, and at least one day');
      return;
    }

    if (editingCourse) {
      await updateCourse(editingCourse.id, formData);
      success('Course updated!');
    } else {
      await addCourse(formData);
      success('Course created!');
    }

    // A normal "New Course" submission (not just a claim) can also match
    // an existing unverified catalog entry by code via addCourse's own
    // logic - either way, refresh so the unclaimed-courses list stays accurate.
    refreshCatalogs();

    setShowModal(false);
    setEditingCourse(null);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm(`Delete "${name}"? This will also delete all assignments.`);
    if (confirmed) {
      await deleteCourse(id);
      success('Course deleted');
    }
  };

  const handleViewDetails = (course: any) => {
    setSelectedCourse(course);
    setShowDetails(true);
  };

  // Group courses by day for weekly view
  const coursesByDay = WEEKDAYS.map(day => ({
    day,
    courses: courses.filter(c => c.days.map((d: string) => d.toLowerCase()).includes(day))
  }));

  const getDaySchedule = (course: any) => {
    return course.days.map((d: string) => DAY_ABBREVS[d.toLowerCase()] || d.slice(0, 3)).join(', ');
  };

  // Stats
  const totalSessions = courses.reduce((total, c) => total + c.days.length, 0);
  const totalCapacity = courses.reduce((total, c) => total + (c.capacity || 0), 0);
  const coursesWithLocation = courses.filter(c => c.location).length;


  if (loading || catalogLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <MobileSidebar />
        <div className="p-4 pt-2">
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-2" />
          <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 h-24" />
            ))}
          </div>
        </div>
        <BottomTabBar />

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
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

      {/* Sticky Header - Mobile First */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="pl-8">
            <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              My Courses
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your course offerings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm active:scale-95 transition-transform"
              aria-label="Import Courses"
            >
              <FileUp size={20} />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white shadow-md active:scale-95 transition-transform"
              aria-label="New Course"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Stats Row - Mobile optimized cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <BookOpen size={16} className="text-blue-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{courses.length}</span>
            </div>
            <p className="text-xs text-gray-500">Total Courses</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Clock size={16} className="text-green-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalSessions}</span>
            </div>
            <p className="text-xs text-gray-500">Weekly Sessions</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <MapPin size={16} className="text-purple-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{coursesWithLocation}</span>
            </div>
            <p className="text-xs text-gray-500">With Locations</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Users size={16} className="text-orange-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalCapacity}</span>
            </div>
            <p className="text-xs text-gray-500">Total Capacity</p>
          </div>
        </div>

        {/* Unclaimed Courses - students created these themselves under a
            course code with no matching lecturer offering yet. Claiming one
            verifies it for every enrolled student and lets you set its
            schedule, instead of it silently staying unverified forever. */}
        {unclaimedCatalogs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-amber-200 dark:border-amber-800">
            <div className="p-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Unclaimed Courses</h2>
              <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                {unclaimedCatalogs.length}
              </span>
            </div>
            <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">
              Students added these course codes themselves. Claim one if it's yours - it'll be marked verified for everyone enrolled.
            </p>
            <div className="p-4 space-y-2">
              {unclaimedCatalogs.map(catalog => (
                <div
                  key={catalog.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{catalog.title}</span>
                      <span className="text-xs text-gray-500 font-mono">{catalog.courseCode}</span>
                    </div>
                    {catalog.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{catalog.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleClaim(catalog.id, catalog.title)}
                    disabled={claimingId === catalog.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    <UserCheck size={14} />
                    {claimingId === catalog.id ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Schedule View - Mobile friendly */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
            <p className="text-xs text-gray-400">Tap a course to view details</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700  ">
            {coursesByDay.map(({ day, courses: dayCourses }) => (
              <div key={day} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Calendar size={12} className="text-blue-500" />
                  </div>
                  <h3 className="font-semibold capitalize text-gray-900 dark:text-white">{day}</h3>
                  {dayCourses.length === 0 && (
                    <span className="text-xs text-gray-400 ml-auto">No classes</span>
                  )}
                </div>

                {dayCourses.length > 0 && (
                  <div className="space-y-2">
                    {dayCourses.map(course => (
                      <button
                        key={course.id}
                        onClick={() => handleViewDetails(course)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-35">
                              {course.name}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{course.code}</span>
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
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>



        {/* Empty State */}
        {courses.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-400 font-medium">No courses yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-2 text-blue-500 text-sm font-medium"
            >
              + Create your first course
            </button>
          </div>
        )}

        {/* Mochi Tip - Compact */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹💡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Adding detailed course information helps students plan their schedule better.
                Don't forget to include location and accurate time slots!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Course Bottom Sheet */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowModal(false)}
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCourse ? 'Edit Course' : 'New Course'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Introduction to CS"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white uppercase"
                    placeholder="e.g., CSC 101"
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

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Course description, prerequisites, objectives..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    min="1"
                    max="500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors"
                  >
                    {editingCourse ? 'Update' : 'Create'} Course
                  </button>
                </div>
              </form>

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Details Bottom Sheet */}
      <AnimatePresence>
        {showDetails && selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Course Details</h2>
                <button onClick={() => setShowDetails(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Course Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg mt-1">{selectedCourse.name}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Course Code</p>
                  <p className="font-mono text-gray-900 dark:text-white text-base mt-1">{selectedCourse.code}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Schedule</p>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedCourse.days.map((d: string) => DAY_ABBREVS[d.toLowerCase()] || d.slice(0, 3)).join(', ')} • {selectedCourse.startTime} - {selectedCourse.endTime}
                  </p>
                </div>

                {selectedCourse.location && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                    <p className="text-gray-900 dark:text-white mt-1 flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      {selectedCourse.location}
                    </p>
                  </div>
                )}

                {selectedCourse.description && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{selectedCourse.description}</p>
                  </div>
                )}

                {selectedCourse.capacity && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Capacity</p>
                    <p className="text-gray-900 dark:text-white mt-1 flex items-center gap-1">
                      <Users size={14} className="text-gray-400" />
                      {selectedCourse.capacity} students
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 pt-0 space-y-2">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    router.push(`/dashboard/lecturer/courses/${selectedCourse.catalogId}/materials`);
                  }}
                  className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium shadow-md active:bg-teal-600 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  Course Materials
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      handleOpenModal(selectedCourse);
                    }}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors"
                  >
                    Edit Course
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CourseImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => {
          refreshCourses();
          refreshCatalogs();
        }}
      />
    </div>
  );
}