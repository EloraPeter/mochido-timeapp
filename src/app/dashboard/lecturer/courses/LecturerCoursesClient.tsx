'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import MobileSidebar from '@/components/MobileSidebar';
import { useCustomAlert } from '@/hooks/useCustomAlert';
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
  Eye
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

export default function LecturerCoursesClient() {
  const { user } = useAuth();
  const { courses, loading, addCourse, updateCourse, deleteCourse } = useLecturerCourses();
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
    const { success, error, confirm, toast } = useCustomAlert();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || formData.days.length === 0) {
      error('Please fill in name, code, and at least one day');
      return;
    }
    
    if (editingCourse) {
      await updateCourse(editingCourse.id, formData);
    } else {
      await addCourse(formData);
    }
    
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
  
  const handleDelete = async (id: string) => {
   const confirmed = await confirm('Are you sure you want to delete this course? This will also delete all associated assignments.'); if (confirmed) {
      await deleteCourse(id);
    }
  };
  
  const handleViewDetails = (course: any) => {
    setSelectedCourse(course);
    setShowDetails(true);
  };
  
  // Group courses by day for weekly view - courses now have days array
  const coursesByDay = WEEKDAYS.map(day => ({
    day,
    courses: courses.filter(c => c.days.map((d: string) => d.toLowerCase()).includes(day))
  }));
  
  const getDaySchedule = (course: any) => {
    return course.days.map((d: string) => d.slice(0, 3)).join(', ');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading courses...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Mobile Sidebar */}
      <MobileSidebar />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center ml-10 md:ml-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Courses
              </h1>
              <p className="text-xs text-gray-500">Manage your course offerings</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Plus size={18} />
              New Course
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="text-blue-500" size={24} />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{courses.length}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Courses</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-green-500" size={24} />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {courses.reduce((total, c) => total + c.days.length, 0)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Sessions</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="text-purple-500" size={24} />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {courses.filter(c => c.location).length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">With Locations</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-orange-500" size={24} />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {courses.reduce((total, c) => total + (c.capacity || 0), 0)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</p>
          </div>
        </div>
        
        {/* Weekly Schedule View */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">Weekly Schedule</h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {coursesByDay.map(({ day, courses: dayCourses }) => (
              <div key={day} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-blue-500" />
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
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition cursor-pointer"
                        onClick={() => handleViewDetails(course)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{course.name}</span>
                            <span className="text-xs text-gray-500 font-mono">{course.code}</span>
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
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(course);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(course.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* All Courses Grid */}
        {courses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">All Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => handleViewDetails(course)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                      <p className="text-xs text-gray-500">{course.code}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(course);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500 mt-2">
                    <p className="flex items-center gap-2">
                      <Clock size={12} />
                      {course.startTime} - {course.endTime}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar size={12} />
                      {getDaySchedule(course)}
                    </p>
                    {course.location && (
                      <p className="flex items-center gap-2">
                        <MapPin size={12} />
                        {course.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(course);
                    }}
                    className="mt-3 text-blue-500 text-xs flex items-center gap-1"
                  >
                    View Details <ChevronRight size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {courses.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500">No courses yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-2 text-blue-500 text-sm"
            >
              + Create your first course
            </button>
          </div>
        )}
        
        {/* Mochi Tip */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹💡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Adding detailed course information helps students plan their schedule better. 
                Don't forget to include location and accurate time slots!
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Course Modal */}
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCourse ? 'Edit Course' : 'Create New Course'}
                </h2>
                <button onClick={() => setShowModal(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Course Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Course Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., CSC 101"
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
                    <label className="block text-sm font-medium mb-1">Start Time *</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time *</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                      required
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
                
                <div>
                  <label className="block text-sm font-medium mb-1">Course Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="Course description, prerequisites, objectives..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Class Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    min="1"
                    max="500"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    {editingCourse ? 'Update' : 'Create'} Course
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Course Details Modal */}
      <AnimatePresence>
        {showDetails && selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Course Details</h2>
                <button onClick={() => setShowDetails(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Course Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCourse.name}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Course Code</p>
                  <p className="font-mono text-gray-900 dark:text-white">{selectedCourse.code}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Schedule</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedCourse.days.map((d: string) => d.slice(0, 3)).join(', ')} • {selectedCourse.startTime} - {selectedCourse.endTime}
                  </p>
                </div>
                
                {selectedCourse.location && (
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-gray-900 dark:text-white">{selectedCourse.location}</p>
                  </div>
                )}
                
                {selectedCourse.description && (
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCourse.description}</p>
                  </div>
                )}
                
                {selectedCourse.capacity && (
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="text-gray-900 dark:text-white">{selectedCourse.capacity} students</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleOpenModal(selectedCourse);
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                >
                  Edit Course
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}