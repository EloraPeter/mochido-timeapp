// app/dashboard/student/assignments/StudentAssignmentsClient.tsx (Fixed)
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useCourseService } from '@/hooks/useCourseService';
import { useMochiMood } from '@/hooks/useMochiMood';
import { useStreak } from '@/hooks/useStreak';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import MochiBuddy from '@/components/mochi/MochiBuddy';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow, format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';
type SortType = 'dueDate' | 'priority' | 'course';

// Kanban column types
type KanbanColumn = 'todo' | 'in-progress' | 'completed';

interface AssignmentWithMetadata {
  id: string;
  title: string;
  dueDate: string;
  isDone: boolean;
  priority: 'high' | 'medium' | 'low';
  status: string;
  catalogId: string;
  notes?: string;
  courseTitle: string;
  courseCode: string;
  daysLeft: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  urgencyLevel: 'critical' | 'urgent' | 'soon' | 'normal';
}

export default function StudentAssignmentsClient() {
  const { user } = useAuth();
  const { tasks, toggleComplete, loading: tasksLoading } = useTasks();
  const { myCourses, loading: coursesLoading } = useCourseService();
  const { mood, refreshMood } = useMochiMood();
  const { streak } = useStreak();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortBy, setSortBy] = useState<SortType>('dueDate');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithMetadata | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // My enrolled course IDs
  const myCatalogIds = myCourses.map(c => c.id);
  
  // Get assignments with metadata
  const assignmentsWithMetadata: AssignmentWithMetadata[] = useMemo(() => {
    const now = new Date();
    const assignments = tasks.filter(t => myCatalogIds.includes(t.catalogId));
    
    return assignments.map(assignment => {
      const dueDate = new Date(assignment.dueDate);
      const daysLeft = differenceInDays(dueDate, now);
      const isOverdueFlag = !assignment.isDone && isPast(dueDate);
      const isDueTodayFlag = isToday(dueDate);
      const isDueTomorrowFlag = isTomorrow(dueDate);
      const course = myCourses.find(c => c.id === assignment.catalogId);
      
      let urgencyLevel: 'critical' | 'urgent' | 'soon' | 'normal' = 'normal';
      if (!assignment.isDone && !isOverdueFlag) {
        if (daysLeft <= 1) urgencyLevel = 'critical';
        else if (daysLeft <= 3) urgencyLevel = 'urgent';
        else if (daysLeft <= 7) urgencyLevel = 'soon';
      }
      
      return {
        ...assignment,
        courseTitle: course?.title || 'Unknown Course',
        courseCode: course?.courseCode || 'N/A',
        daysLeft,
        isOverdue: isOverdueFlag,
        isDueToday: isDueTodayFlag,
        isDueTomorrow: isDueTomorrowFlag,
        urgencyLevel
      };
    });
  }, [tasks, myCourses, myCatalogIds]);
  
  // Apply filters and sorting
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignmentsWithMetadata];
    
    // Status filter
    if (filter === 'pending') {
      filtered = filtered.filter(a => !a.isDone && !a.isOverdue);
    } else if (filter === 'completed') {
      filtered = filtered.filter(a => a.isDone);
    } else if (filter === 'overdue') {
      filtered = filtered.filter(a => a.isOverdue);
    }
    
    // Course filter
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(a => a.catalogId === selectedCourse);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else {
        // Sort by course title - both are guaranteed non-undefined
        const titleA = a.courseTitle;
        const titleB = b.courseTitle;
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
      }
    });
    
    return filtered;
  }, [assignmentsWithMetadata, filter, selectedCourse, sortBy]);
  
  // Stats
  const stats = useMemo(() => ({
    total: assignmentsWithMetadata.length,
    completed: assignmentsWithMetadata.filter(a => a.isDone).length,
    pending: assignmentsWithMetadata.filter(a => !a.isDone && !a.isOverdue).length,
    overdue: assignmentsWithMetadata.filter(a => a.isOverdue).length,
    completionRate: assignmentsWithMetadata.length > 0 
      ? Math.round((assignmentsWithMetadata.filter(a => a.isDone).length / assignmentsWithMetadata.length) * 100)
      : 0
  }), [assignmentsWithMetadata]);
  
  // Kanban board data
  const kanbanData = useMemo(() => ({
    todo: filteredAssignments.filter(a => !a.isDone && !a.isOverdue && a.daysLeft > 3),
    inProgress: filteredAssignments.filter(a => !a.isDone && !a.isOverdue && a.daysLeft <= 3 && a.daysLeft > 0),
    completed: filteredAssignments.filter(a => a.isDone)
  }), [filteredAssignments]);
  
  // Dynamic Mochi message
  const getMochiMessage = () => {
    if (stats.overdue > 2) return `⚠️ ${stats.overdue} overdue assignments! Let's tackle them together! 🐹💪`;
    if (stats.overdue > 0) return `${stats.overdue} assignment${stats.overdue > 1 ? 's are' : ' is'} overdue. Focus on these first! 🎯`;
    if (stats.completionRate >= 80) return `Amazing ${stats.completionRate}% completion rate! You're crushing it! 🔥🐹`;
    if (stats.pending === 0 && stats.total > 0) return `🎉 All caught up! Great job completing all your assignments! 🎉`;
    if (stats.pending > 0) return `You have ${stats.pending} assignment${stats.pending > 1 ? 's' : ''} pending. Take it one at a time! 📚✨`;
    if (stats.total === 0) return `No assignments yet. Time to relax or check back later! 🐹🌱`;
    return `Keep up the great work with your assignments! 🐹📖`;
  };
  
  const getMochiStats = useMemo(() => ({
    completedToday: stats.completed,
    streakDays: streak?.currentStreak || 0,
    productivity: stats.completionRate
  }), [stats.completed, streak?.currentStreak, stats.completionRate]);
  
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'soon': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      default: return 'border-l-4 border-l-green-500';
    }
  };
  
  const getStatusBadge = (assignment: AssignmentWithMetadata) => {
    if (assignment.isDone) {
      return { text: 'Completed', color: 'bg-green-500', icon: <CheckCircle size={12} /> };
    }
    if (assignment.isOverdue) {
      return { text: 'Overdue', color: 'bg-red-500', icon: <AlertCircle size={12} /> };
    }
    if (assignment.isDueToday) {
      return { text: 'Due Today', color: 'bg-orange-500', icon: <Clock size={12} /> };
    }
    if (assignment.isDueTomorrow) {
      return { text: 'Due Tomorrow', color: 'bg-yellow-500', icon: <Clock size={12} /> };
    }
    return { text: `${assignment.daysLeft} days left`, color: 'bg-blue-500', icon: <Clock size={12} /> };
  };
  
  const handleToggleComplete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await toggleComplete(id);
  };
  
  const handleViewDetails = (assignment: AssignmentWithMetadata) => {
    setSelectedAssignment(assignment);
    setShowDetails(true);
  };
  
  // Get unique courses for filter
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<string, { id: string; title: string }>();
    assignmentsWithMetadata.forEach(a => {
      if (!courseMap.has(a.catalogId)) {
        courseMap.set(a.catalogId, { id: a.catalogId, title: a.courseTitle });
      }
    });
    return Array.from(courseMap.values());
  }, [assignmentsWithMetadata]);
  
  const loading = tasksLoading || coursesLoading;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <MobileSidebar />
        <div className="max-w-6xl mx-auto p-4">
          <div className="ml-10 md:ml-0 mb-6">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="animate-pulse space-y-3">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <MobileSidebar />
      <BottomTabBar />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="ml-10 md:ml-0 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Assignments</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.completed} of {stats.total} completed ({stats.completionRate}%)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
              >
                {viewMode === 'list' ? '📊' : '📋'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 transition flex items-center gap-1"
              >
                <Filter size={14} />
                Filters
                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-4 space-y-5">
        {/* Mochi Buddy */}
        <MochiBuddy
          mood={mood}
          message={getMochiMessage()}
          onMochiClick={refreshMood}
          stats={getMochiStats}
          variant="compact"
        />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
        </div>
        
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm overflow-hidden"
            >
              <div className="space-y-3">
                {/* Status Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'pending', 'completed', 'overdue'] as FilterType[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                          filter === f 
                            ? f === 'overdue'
                              ? 'bg-red-500 text-white'
                              : f === 'completed'
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {f}
                        {f !== 'all' && (
                          <span className="ml-1 text-xs opacity-80">
                            ({f === 'pending' ? stats.pending : f === 'completed' ? stats.completed : stats.overdue})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Course Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  >
                    <option value="all">All Courses ({stats.total})</option>
                    {uniqueCourses.map(course => {
                      const count = assignmentsWithMetadata.filter(a => a.catalogId === course.id).length;
                      return (
                        <option key={course.id} value={course.id}>
                          {course.title} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                {/* Sort By */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Sort By</label>
                  <div className="flex flex-wrap gap-2">
                    {(['dueDate', 'priority', 'course'] as SortType[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                          sortBy === s
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {s === 'dueDate' ? 'Due Date' : s === 'priority' ? 'Priority' : 'Course'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Kanban View */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* To Do Column */}
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Circle size={14} className="text-blue-500" />
                  To Do
                </h3>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  {kanbanData.todo.length}
                </span>
              </div>
              <div className="space-y-3 max-h-100 overflow-y-auto">
                {kanbanData.todo.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
                ) : (
                  kanbanData.todo.map(assignment => (
                    <motion.div
                      key={assignment.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleViewDetails(assignment)}
                      className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition ${getPriorityColor(assignment.priority)}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{assignment.courseCode}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(assignment.urgencyLevel)}`}>
                              {assignment.daysLeft} days left
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleToggleComplete(e, assignment.id)}
                          className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        >
                          <Circle size={18} className="text-gray-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
            
            {/* In Progress Column */}
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Clock size={14} className="text-orange-500" />
                  In Progress
                </h3>
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  {kanbanData.inProgress.length}
                </span>
              </div>
              <div className="space-y-3 max-h-100 overflow-y-auto">
                {kanbanData.inProgress.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
                ) : (
                  kanbanData.inProgress.map(assignment => (
                    <motion.div
                      key={assignment.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleViewDetails(assignment)}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition border-l-4 border-l-orange-500"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{assignment.courseCode}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                              {assignment.daysLeft === 0 ? 'Due today!' : `${assignment.daysLeft} days left`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleToggleComplete(e, assignment.id)}
                          className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        >
                          <Circle size={18} className="text-gray-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
            
            {/* Completed Column */}
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  Completed
                </h3>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                  {kanbanData.completed.length}
                </span>
              </div>
              <div className="space-y-3 max-h-100 overflow-y-auto">
                {kanbanData.completed.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
                ) : (
                  kanbanData.completed.map(assignment => (
                    <motion.div
                      key={assignment.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleViewDetails(assignment)}
                      className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition opacity-70"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-500 line-through">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{assignment.courseCode}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <CheckCircle size={12} className="text-green-500" />
                            <span className="text-xs text-green-600">Completed</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredAssignments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="text-6xl mb-4"
                >
                  {filter === 'completed' ? '🏆' : filter === 'overdue' ? '⏰' : '📚'}
                </motion.div>
                <p className="text-gray-500">No assignments found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filter !== 'all' ? 'Try changing your filters' : 'Check back later for new assignments'}
                </p>
              </div>
            ) : (
              filteredAssignments.map((assignment, idx) => {
                const status = getStatusBadge(assignment);
                const dueDate = new Date(assignment.dueDate);
                
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleViewDetails(assignment)}
                    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${getPriorityColor(assignment.priority)}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {assignment.title}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${status.color} flex items-center gap-1`}>
                              {status.icon}
                              {status.text}
                            </span>
                            {assignment.priority === 'high' && !assignment.isDone && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle size={10} /> High Priority
                              </span>
                            )}
                            {assignment.urgencyLevel === 'critical' && !assignment.isDone && (
                              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                CRITICAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={12} className="text-gray-400" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {assignment.courseTitle} • {assignment.courseCode}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Due: {format(dueDate, 'MMM dd, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDistanceToNow(dueDate, { addSuffix: true })}
                            </span>
                          </div>
                          {assignment.notes && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleToggleComplete(e, assignment.id)}
                          className="ml-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        >
                          {assignment.isDone ? (
                            <CheckCircle className="text-green-500" size={24} />
                          ) : (
                            <Circle className="text-gray-400 hover:text-blue-500 transition" size={24} />
                          )}
                        </button>
                      </div>
                      
                      {/* Progress bar for pending assignments */}
                      {!assignment.isDone && !assignment.isOverdue && assignment.daysLeft <= 7 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                assignment.daysLeft <= 1 ? 'bg-red-500' : 
                                assignment.daysLeft <= 3 ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.max(0, (7 - assignment.daysLeft) / 7 * 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {assignment.daysLeft === 0 ? 'Due today!' : `${assignment.daysLeft} days remaining`}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
        
        {/* Achievement Card */}
        {stats.completionRate >= 50 && stats.total > 0 && (
          <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Award className="text-green-500 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400 text-sm">Great Progress!</p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  You've completed {stats.completionRate}% of your assignments. {stats.completionRate >= 80 ? 'Amazing work! 🎉' : 'Keep going! 💪'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Overdue Assignments</p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  You have {stats.overdue} overdue assignment{stats.overdue !== 1 ? 's' : ''}. 
                  Complete them as soon as possible to stay on track!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Assignment Details Modal */}
      <AnimatePresence>
        {showDetails && selectedAssignment && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assignment Details</h2>
                </div>
                <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700 transition">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Title</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedAssignment.title}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Course</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedAssignment.courseTitle} • {selectedAssignment.courseCode}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {format(new Date(selectedAssignment.dueDate), 'EEEE, MMMM dd, yyyy h:mm a')}
                  </p>
                  {selectedAssignment.isOverdue && (
                    <p className="text-xs text-red-500 mt-1">This assignment is overdue!</p>
                  )}
                  {selectedAssignment.isDueToday && !selectedAssignment.isOverdue && (
                    <p className="text-xs text-orange-500 mt-1">Due today!</p>
                  )}
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    selectedAssignment.priority === 'high' ? 'bg-red-100 text-red-600' :
                    selectedAssignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {selectedAssignment.priority}
                  </span>
                </div>
                
                {selectedAssignment.notes && (
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                      {selectedAssignment.notes}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={async () => {
                      await toggleComplete(selectedAssignment.id);
                      setShowDetails(false);
                    }}
                    className={`flex-1 py-3 rounded-xl font-semibold transition ${
                      selectedAssignment.isDone
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    disabled={selectedAssignment.isDone}
                  >
                    {selectedAssignment.isDone ? 'Completed ✓' : 'Mark as Complete'}
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
                
                {/* Mochi tip in modal */}
                {!selectedAssignment.isDone && !selectedAssignment.isOverdue && selectedAssignment.daysLeft <= 2 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-xl">🐹</span>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      This assignment is due soon! Focus on completing it today.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}