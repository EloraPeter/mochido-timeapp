'use client';

import { useState } from 'react';
import { useCourseService } from '@/hooks/useCourseService';
import { motion, AnimatePresence } from 'framer-motion';
import MobileSidebar from '@/components/MobileSidebar';
import { useCustomAlert } from '@/hooks/useCustomAlert';

import {
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  LogOut,
  BookOpen,
  Plus,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function StudentCourseManager() {
  const { myCourses, loading, dropCourse, createStudentCourse } = useCourseService();
   const { success, error, confirm, toast } = useCustomAlert();
 const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    courseCode: '',
    title: '',
    days: [] as string[],
    startTime: '09:00',
    endTime: '10:00',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group courses by day for weekly view
  const coursesByDay = WEEKDAYS.map(day => ({
    day,
    courses: myCourses.filter(c => 
      c.days && c.days.map(d => d.toLowerCase()).includes(day)
    )
  }));

  const handleSubmit = async (e: React.FormEvent) => {
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
      setShowModal(false);
      setFormData({
        courseCode: '',
        title: '',
        days: [],
        startTime: '09:00',
        endTime: '10:00',
        location: ''
      });
    } catch (err) {
      error((err as Error).message);
    } finally {
      setIsSubmitting(false);
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

  const handleDrop = async (catalogId: string, courseName: string) => {
    const confirmed = await confirm(`Are you sure you want to drop ${courseName}?`);
    if (confirmed) {
      await dropCourse(catalogId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Sidebar */}
      <MobileSidebar />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <p className="text-sm text-gray-500 mt-1">
            {myCourses.length} course{myCourses.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
        >
          <Plus size={18} />
          Create Course
        </button>
      </div>

      {/* Weekly Schedule View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition"
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
                        {course.days && (
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
                        )}
                      </div>
                      <button
                        onClick={() => handleDrop(course.id, course.title)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
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

      {/* Empty State */}
      {myCourses.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">You're not enrolled in any courses yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Create a Course
          </button>
        </div>
      )}

      {/* Create Course Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
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
                <button onClick={() => setShowModal(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    onClick={() => setShowModal(false)}
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