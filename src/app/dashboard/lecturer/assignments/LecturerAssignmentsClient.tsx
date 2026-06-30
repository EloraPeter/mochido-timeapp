'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import { useTasks } from '@/hooks/useTasks';
import MobileSidebar from '@/components/MobileSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import BottomTabBar from '@/components/BottomTabBar';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AssignmentFormData {
  title: string;
  catalogId: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export default function LecturerAssignmentsClient() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useLecturerCourses();
  const { tasks, addTask, deleteTask, updateTask, loading: tasksLoading } = useTasks();
  const [showModal, setShowModal] = useState(false);
  const { success, error, confirm, toast } = useCustomAlert();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    catalogId: '',
    dueDate: '',
    priority: 'medium',
    description: ''
  });

  // Filter assignments for lecturer's courses
  const courseCatalogIds = courses.map(c => c.catalogId);
  const assignments = tasks.filter(t => courseCatalogIds.includes(t.catalogId));

  // Filter by selected course
  const filteredAssignments = selectedCourse === 'all'
    ? assignments
    : assignments.filter(a => a.catalogId === selectedCourse);

  // Stats
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.isDone).length;
  const pendingAssignments = assignments.filter(a => !a.isDone && new Date(a.dueDate) > new Date()).length;
  const overdueAssignments = assignments.filter(a => !a.isDone && new Date(a.dueDate) < new Date()).length;

  const handleOpenModal = (assignment?: any) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        title: assignment.title,
        catalogId: assignment.catalogId,
        dueDate: assignment.dueDate.split('T')[0],
        priority: assignment.priority,
        description: assignment.notes || ''
      });
    } else {
      setEditingAssignment(null);
      setFormData({
        title: '',
        catalogId: courses[0]?.catalogId || '',
        dueDate: '',
        priority: 'medium',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.catalogId || !formData.dueDate) {
      error('Please fill in all required fields');
      return;
    }

    const dueDate = new Date(formData.dueDate);
    dueDate.setHours(23, 59, 59, 999);

    if (editingAssignment) {
      await updateTask(editingAssignment.id, {
        title: formData.title,
        catalogId: formData.catalogId,
        dueDate: dueDate.toISOString(),
        priority: formData.priority,
        notes: formData.description
      });
      success('Assignment updated!');
    } else {
      await addTask({
        title: formData.title,
        dueDate: dueDate.toISOString(),
        catalogId: formData.catalogId,
        priority: formData.priority,
        notes: formData.description,
        reminderMinutes: [1440, 60, 10, 0],
        isDone: false
      });
      success('Assignment created!');
    }

    setShowModal(false);
    setEditingAssignment(null);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm(`Delete "${title}"? This cannot be undone.`);
    if (confirmed) {
      await deleteTask(id);
      success('Assignment deleted');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  const getStatusBadge = (assignment: any) => {
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (assignment.isDone) {
      return { text: 'Completed', color: 'bg-green-500', icon: <CheckCircle size={12} /> };
    } else if (dueDate < now) {
      return { text: 'Overdue', color: 'bg-red-500', icon: <XCircle size={12} /> };
    } else if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { text: 'Due Soon', color: 'bg-orange-500', icon: <AlertCircle size={12} /> };
    } else {
      return { text: 'Pending', color: 'bg-blue-500', icon: <Clock size={12} /> };
    }
  };

  const loading = coursesLoading || tasksLoading;

  if (loading) {
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
              Assignments
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Create and manage course assignments</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white shadow-md active:scale-95 transition-transform"
            aria-label="New Assignment"
          >
            <Plus size={22} />
          </button>
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
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssignments}</span>
            </div>
            <p className="text-xs text-gray-500">Total</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <span className="text-2xl font-bold text-green-600">{completedAssignments}</span>
            </div>
            <p className="text-xs text-gray-500">Completed</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Clock size={16} className="text-blue-500" />
              </div>
              <span className="text-2xl font-bold text-blue-600">{pendingAssignments}</span>
            </div>
            <p className="text-xs text-gray-500">Pending</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle size={16} className="text-red-500" />
              </div>
              <span className="text-2xl font-bold text-red-600">{overdueAssignments}</span>
            </div>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
        </div>

        {/* Filter Bar - Horizontal scrollable for mobile */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCourse('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCourse === 'all'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
            >
              All ({totalAssignments})
            </button>
            {courses.map(course => {
              const count = assignments.filter(a => a.catalogId === course.catalogId).length;
              return (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.catalogId)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCourse === course.catalogId
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {course.name.split(' ').slice(0, 2).join(' ')} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignments List - Mobile card based */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">All Assignments</h2>
            <p className="text-xs text-gray-400">Tap to view or edit details</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[55vh] overflow-y-auto">
            {filteredAssignments.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-gray-400 font-medium">No assignments yet</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-2 text-blue-500 text-sm font-medium"
                >
                  + Create your first assignment
                </button>
              </div>
            ) : (
              filteredAssignments.map(assignment => {
                const course = courses.find(c => c.catalogId === assignment.catalogId);
                const status = getStatusBadge(assignment);
                const dueDate = new Date(assignment.dueDate);
                const isOverdue = !assignment.isDone && dueDate < new Date();

                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator dot */}
                      <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${assignment.isDone ? 'bg-green-500' :
                        isOverdue ? 'bg-red-500' :
                          status.text === 'Due Soon' ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate max-w-40">
                            {assignment.title}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(assignment.priority)}`}>
                            {assignment.priority}
                          </span>
                        </div>

                        {course && (
                          <p className="text-xs text-gray-500 mb-2">
                            {course.name} • {course.code}
                          </p>
                        )}

                        {assignment.notes && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {assignment.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white ${status.color}`}>
                            {status.icon}
                            {status.text}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar size={12} />
                            {format(dueDate, 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock size={12} />
                            {formatDistanceToNow(dueDate, { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenModal(assignment)}
                          className="p-2 text-blue-500 active:bg-blue-50 dark:active:bg-blue-900/20 rounded-full transition-colors"
                          aria-label="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id, assignment.title)}
                          className="p-2 text-red-500 active:bg-red-50 dark:active:bg-red-900/20 rounded-full transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Mochi Tip - Compact */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹💡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Setting clear deadlines and priorities helps students manage their time better.
                Try using "High Priority" for assignments due this week!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Assignment Bottom Sheet */}
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
                  {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Assignment Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Midterm Project"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course *</label>
                  <select
                    value={formData.catalogId}
                    onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.catalogId}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as const).map(priority => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority })}
                        className={`py-2.5 rounded-xl capitalize font-medium transition-all active:scale-95 ${formData.priority === priority
                          ? priority === 'high'
                            ? 'bg-red-500 text-white shadow-md'
                            : priority === 'medium'
                              ? 'bg-yellow-500 text-white shadow-md'
                              : 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description / Instructions</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the assignment, requirements, submission instructions..."
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
                    {editingAssignment ? 'Update' : 'Create'} Assignment
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