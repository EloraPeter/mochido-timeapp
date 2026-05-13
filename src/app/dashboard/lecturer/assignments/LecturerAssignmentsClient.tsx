'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import { useTasks } from '@/hooks/useTasks';
import MobileSidebar from '@/components/MobileSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AssignmentFormData {
  title: string;
  catalogId: string;  // Changed from courseId
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
const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    catalogId: '',
    dueDate: '',
    priority: 'medium',
    description: ''
  });
  
  // Filter assignments for lecturer's courses - using catalogId
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
    }
    
    setShowModal(false);
    setEditingAssignment(null);
  };
  
  const handleDelete = async (id: string) => {
   const confirmed = await confirm('Are you sure you want to delete this assignment?'); if (confirmed) {
      await deleteTask(id);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📋</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading assignments...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <MobileSidebar />
      
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center ml-10 md:ml-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assignments</h1>
              <p className="text-xs text-gray-500">Create and manage course assignments</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Plus size={18} />
              New Assignment
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssignments}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{completedAssignments}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{pendingAssignments}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-red-600">{overdueAssignments}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
          </div>
        </div>
        
        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCourse('all')}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                selectedCourse === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All Courses ({totalAssignments})
            </button>
            {courses.map(course => {
              const count = assignments.filter(a => a.catalogId === course.catalogId).length;
              return (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.catalogId)}
                  className={`px-4 py-2 rounded-xl text-sm transition ${
                    selectedCourse === course.catalogId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {course.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Assignments List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">All Assignments</h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssignments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500">No assignments yet</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-2 text-blue-500 text-sm"
                >
                  + Create your first assignment
                </button>
              </div>
            ) : (
              filteredAssignments.map(assignment => {
                const course = courses.find(c => c.catalogId === assignment.catalogId);
                const status = getStatusBadge(assignment);
                const dueDate = new Date(assignment.dueDate);
                
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {assignment.title}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(assignment.priority)}`}>
                            {assignment.priority}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.text}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {course?.name} • {course?.code}
                        </p>
                        {assignment.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{assignment.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Due: {format(dueDate, 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDistanceToNow(dueDate, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(assignment)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
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
        
        {/* Mochi Tip */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹💡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Mochi's Tip</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Setting clear deadlines and priorities helps students manage their time better. 
                Try using "High Priority" for assignments due this week!
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Assignment Modal */}
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
                  {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                </h2>
                <button onClick={() => setShowModal(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., Midterm Project"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Course *</label>
                  <select
                    value={formData.catalogId}
                    onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
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
                  <label className="block text-sm font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Priority *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['high', 'medium', 'low'].map(priority => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: priority as any })}
                        className={`p-3 rounded-xl capitalize transition ${
                          formData.priority === priority
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
                  <label className="block text-sm font-medium mb-1">Description / Instructions</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="Describe the assignment, requirements, submission instructions..."
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
                    {editingAssignment ? 'Update' : 'Create'} Assignment
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