// app/dashboard/student/tasks/TasksClient.tsx (With Beautiful Mochi)
'use client';

import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useCourseService } from '@/hooks/useCourseService';
import { useMochiMood } from '@/hooks/useMochiMood';
import { useStreak } from '@/hooks/useStreak';
import { CheckCircle, Circle, Plus, X, AlertCircle, Calendar as CalendarIcon, List, CheckSquare, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import MochiBuddy from '@/components/mochi/MochiBuddy';
import { SkeletonList } from '@/components/ui/SkeletonList';

type FilterType = 'all' | 'today' | 'week' | 'overdue' | 'completed';

interface SubTask {
  id: string;
  title: string;
  isDone: boolean;
}

export default function TasksClient() {
    const { sortedTasks, stats, toggleComplete, urgentTasks, deleteTask, addTask, updateTask, loading } = useTasks();
    const { myCourses } = useCourseService();
    const { mood, guiltMessage, dismissGuiltMessage, refreshMood } = useMochiMood();
    const { streak, getStreakEmoji, getStreakMessage } = useStreak();
    
    const [showAddTask, setShowAddTask] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskCourseId, setNewTaskCourseId] = useState('');
    
    // Bulk select state
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [isBulkMode, setIsBulkMode] = useState(false);
    
    // Sub-task state
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [taskSubtasks, setTaskSubtasks] = useState<Record<string, SubTask[]>>({});

    // Get dynamic Mochi message based on tasks
    const getMochiMessage = () => {
      if (urgentTasks.length > 2) return `You have ${urgentTasks.length} urgent tasks! Let's tackle them together! 🐹💪`;
      if (urgentTasks.length > 0) return `${urgentTasks.length} task${urgentTasks.length > 1 ? 's are' : ' is'} urgent. Focus on these first! 🎯`;
      if (stats.completionRate >= 80) return `Amazing ${stats.completionRate}% completion rate! You're on fire! 🔥🐹`;
      if (stats.completed > 0) return `Great job completing ${stats.completed} tasks! Keep going! 🎉`;
      if (sortedTasks.length === 0) return `No tasks yet! Add your first task to get started 🌱`;
      return `You've got ${sortedTasks.length} tasks. Take it one step at a time! 🐹✨`;
    };

    const getMochiStats = useMemo(() => ({
      completedToday: stats.completed,
      streakDays: streak?.currentStreak || 0,
      productivity: Math.round(stats.completionRate)
    }), [stats.completed, streak?.currentStreak, stats.completionRate]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);

        let tasks = sortedTasks;
        
        switch (filter) {
            case 'today':
                tasks = sortedTasks.filter(t => t.dueDate.startsWith(today) && !t.isDone);
                break;
            case 'week':
                tasks = sortedTasks.filter(t => {
                    if (t.isDone) return false;
                    const dueDate = new Date(t.dueDate);
                    return dueDate <= weekFromNow && dueDate >= now;
                });
                break;
            case 'overdue':
                tasks = sortedTasks.filter(t => t.status === 'overdue' && !t.isDone);
                break;
            case 'completed':
                tasks = sortedTasks.filter(t => t.isDone);
                break;
            default:
                tasks = sortedTasks;
        }
        
        return tasks.map(task => ({
            ...task,
            subtasks: taskSubtasks[task.id] || []
        }));
    }, [sortedTasks, filter, taskSubtasks]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            default: return 'text-green-500 bg-green-50 dark:bg-green-900/20';
        }
    };

    const handleBulkComplete = async () => {
        for (const taskId of selectedTasks) {
            await toggleComplete(taskId);
        }
        setSelectedTasks(new Set());
        setIsBulkMode(false);
    };

    const handleBulkDelete = async () => {
        for (const taskId of selectedTasks) {
            await deleteTask(taskId);
        }
        setSelectedTasks(new Set());
        setIsBulkMode(false);
    };

    const toggleSelectTask = (taskId: string) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleAddSubtask = (taskId: string) => {
        if (!newSubtaskTitle.trim()) return;
        
        const newSubtask: SubTask = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle,
            isDone: false
        };
        
        setTaskSubtasks(prev => ({
            ...prev,
            [taskId]: [...(prev[taskId] || []), newSubtask]
        }));
        setNewSubtaskTitle('');
    };

    const toggleSubtask = (taskId: string, subtaskId: string) => {
        setTaskSubtasks(prev => ({
            ...prev,
            [taskId]: prev[taskId].map(st => 
                st.id === subtaskId ? { ...st, isDone: !st.isDone } : st
            )
        }));
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const dueDate = newTaskDueDate ? new Date(newTaskDueDate) : new Date();
        dueDate.setHours(23, 59, 0, 0);

        await addTask({
            title: newTaskTitle,
            dueDate: dueDate.toISOString(),
            catalogId: newTaskCourseId || 'general',
            priority: newTaskPriority,
            notes: '',
            reminderMinutes: [1440, 60, 10, 0],
            isDone: false
        });

        setNewTaskTitle('');
        setNewTaskPriority('medium');
        setNewTaskDueDate('');
        setNewTaskCourseId('');
        setShowAddTask(false);
    };

    const getFilterCount = (type: FilterType) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);

        switch (type) {
            case 'today':
                return sortedTasks.filter(t => t.dueDate.startsWith(today) && !t.isDone).length;
            case 'week':
                return sortedTasks.filter(t => {
                    if (t.isDone) return false;
                    const dueDate = new Date(t.dueDate);
                    return dueDate <= weekFromNow && dueDate >= now;
                }).length;
            case 'overdue':
                return sortedTasks.filter(t => t.status === 'overdue' && !t.isDone).length;
            case 'completed':
                return sortedTasks.filter(t => t.isDone).length;
            default:
                return sortedTasks.length;
        }
    };

    // Calendar View Component
    const CalendarView = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const calendarDays = [];
        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
        
        const getTasksForDay = (day: number) => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return sortedTasks.filter(t => t.dueDate.startsWith(dateStr) && !t.isDone);
        };
        
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <div className="text-center mb-4">
                    <h3 className="font-semibold">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {days.map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                        const tasksForDay = day ? getTasksForDay(day) : [];
                        const isToday = day === today.getDate() && 
                            currentMonth === today.getMonth() && 
                            currentYear === today.getFullYear();
                        return (
                            <div
                                key={idx}
                                className={`min-h-16 p-1 border rounded-lg ${
                                    isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                {day && (
                                    <>
                                        <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-600'}`}>{day}</span>
                                        {tasksForDay.length > 0 && (
                                            <div className="mt-1">
                                                <div className={`w-2 h-2 rounded-full mx-auto ${
                                                    tasksForDay.some(t => t.priority === 'high') ? 'bg-red-500' : 'bg-orange-500'
                                                }`} />
                                                <p className="text-[10px] text-center text-gray-500">{tasksForDay.length}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
                <MobileSidebar />
                <div className="max-w-4xl mx-auto p-4">
                    <div className="ml-10 md:ml-0 mb-6">
                        <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                        <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <SkeletonList count={5} variant="task" />
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
                    <div className="ml-10 md:ml-0 flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {stats.completed} of {stats.total} completed ({stats.completionRate.toFixed(0)}%)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {!isBulkMode && (
                                <button
                                    onClick={() => setIsBulkMode(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition"
                                >
                                    <CheckSquare size={16} />
                                    Select
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddTask(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                            >
                                <Plus size={18} />
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-4 space-y-5">
                {/* Beautiful Mochi Buddy */}
                <MochiBuddy
                    mood={mood}
                    message={getMochiMessage()}
                    onMochiClick={refreshMood}
                    stats={getMochiStats}
                    variant="compact"
                />

                {/* Bulk Action Bar */}
                {isBulkMode && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center justify-between"
                    >
                        <div>
                            <span className="text-sm font-semibold">{selectedTasks.size} selected</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkComplete}
                                disabled={selectedTasks.size === 0}
                                className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm disabled:opacity-50 hover:bg-green-600 transition"
                            >
                                Complete All
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedTasks.size === 0}
                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm disabled:opacity-50 hover:bg-red-600 transition"
                            >
                                Delete All
                            </button>
                            <button
                                onClick={() => {
                                    setIsBulkMode(false);
                                    setSelectedTasks(new Set());
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'today', 'week', 'overdue', 'completed'] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-xl text-sm capitalize transition ${
                                    filter === f
                                        ? f === 'overdue'
                                            ? 'bg-red-500 text-white'
                                            : f === 'completed'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {f}
                                {f !== 'all' && getFilterCount(f) > 0 && (
                                    <span className="ml-1 text-xs opacity-80">({getFilterCount(f)})</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        {viewMode === 'list' ? <CalendarIcon size={18} /> : <List size={18} />}
                    </button>
                </div>

                {/* Content */}
                {viewMode === 'calendar' ? (
                    <CalendarView />
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-125 overflow-y-auto">
                            {filteredTasks.length === 0 ? (
                                <div className="p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring' }}
                                        className="text-6xl mb-4"
                                    >
                                        {filter === 'completed' ? '🏆' : filter === 'overdue' ? '⏰' : '✅'}
                                    </motion.div>
                                    <p className="text-gray-400">No tasks in this category</p>
                                    <button
                                        onClick={() => setShowAddTask(true)}
                                        className="mt-2 text-blue-500 text-sm hover:underline"
                                    >
                                        + Add a task
                                    </button>
                                </div>
                            ) : (
                                filteredTasks.map(task => {
                                    const course = task.catalogId !== 'general' 
                                        ? myCourses.find(c => c.id === task.catalogId)
                                        : null;
                                    const isExpanded = expandedTask === task.id;
                                    const subtasks = taskSubtasks[task.id] || [];
                                    const completedSubtasks = subtasks.filter(st => st.isDone).length;
                                    
                                    return (
                                        <div key={task.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group"
                                            >
                                                {isBulkMode ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTasks.has(task.id)}
                                                        onChange={() => toggleSelectTask(task.id)}
                                                        className="w-5 h-5 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    <button 
                                                        onClick={() => toggleComplete(task.id)} 
                                                        className="shrink-0 hover:scale-110 transition-transform"
                                                    >
                                                        {task.isDone ? (
                                                            <CheckCircle className="text-green-500" size={22} />
                                                        ) : (
                                                            <Circle className="text-gray-400 group-hover:text-blue-500 transition" size={22} />
                                                        )}
                                                    </button>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`font-medium truncate ${task.isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {task.title}
                                                        </p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                        {task.status === 'overdue' && !task.isDone && (
                                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                                <AlertCircle size={10} /> Overdue
                                                            </span>
                                                        )}
                                                        {subtasks.length > 0 && (
                                                            <button
                                                                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                                                className="text-xs text-gray-400 hover:text-blue-500 transition flex items-center gap-1"
                                                            >
                                                                {isExpanded ? '▼' : '▶'} {completedSubtasks}/{subtasks.length}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {course && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            📚 {course.title} • {course.courseCode}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <span>Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
                                                        {!task.isDone && new Date(task.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 && (
                                                            <span className="text-orange-500">⚠️</span>
                                                        )}
                                                    </p>
                                                </div>
                                                {!isBulkMode && (
                                                    <button
                                                        onClick={() => deleteTask(task.id)}
                                                        className="text-gray-400 hover:text-red-500 transition p-1 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </motion.div>
                                            
                                            {/* Subtasks Section */}
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="pl-12 pr-4 pb-4 bg-gray-50 dark:bg-gray-800/50"
                                                >
                                                    <div className="space-y-2">
                                                        {subtasks.map(subtask => (
                                                            <div key={subtask.id} className="flex items-center gap-2 group/subtask">
                                                                <button 
                                                                    onClick={() => toggleSubtask(task.id, subtask.id)}
                                                                    className="hover:scale-110 transition-transform"
                                                                >
                                                                    {subtask.isDone ? (
                                                                        <CheckCircle size={16} className="text-green-500" />
                                                                    ) : (
                                                                        <Circle size={16} className="text-gray-400" />
                                                                    )}
                                                                </button>
                                                                <span className={`text-sm ${subtask.isDone ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                    {subtask.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        <div className="flex gap-2 mt-2">
                                                            <input
                                                                type="text"
                                                                value={newSubtaskTitle}
                                                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                                placeholder="Add a subtask..."
                                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                                                            />
                                                            <button
                                                                onClick={() => handleAddSubtask(task.id)}
                                                                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Motivational Footer */}
                <div className="text-center pt-2 pb-4">
                    <p className="text-xs text-gray-400">
                        {urgentTasks.length === 0 && stats.completed > 0 && "✨ Great progress today! Keep the momentum going! ✨"}
                        {urgentTasks.length === 0 && stats.completed === 0 && sortedTasks.length > 0 && "🌱 Start with one task. Small steps lead to big achievements! 🌱"}
                        {urgentTasks.length === 0 && sortedTasks.length === 0 && "🎉 All caught up! Time to relax or plan ahead! 🎉"}
                        {urgentTasks.length > 0 && `⚡ ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's need' : ' needs'} your attention! You've got this! ⚡`}
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
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className="text-2xl">🐹</div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Task</h2>
                            </div>
                            <form onSubmit={handleAddTask} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Task Title *</label>
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="What needs to be done?"
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['high', 'medium', 'low'] as const).map((priority) => (
                                            <button
                                                key={priority}
                                                type="button"
                                                onClick={() => setNewTaskPriority(priority)}
                                                className={`p-2 rounded-xl capitalize transition ${
                                                    newTaskPriority === priority
                                                        ? priority === 'high'
                                                            ? 'bg-red-500 text-white'
                                                            : priority === 'medium'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-green-500 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {priority}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Due Date (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Leave empty for end of today</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Course (Optional)</label>
                                    <select
                                        value={newTaskCourseId}
                                        onChange={(e) => setNewTaskCourseId(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="general">📚 General Task</option>
                                        {myCourses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.title} ({course.courseCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button                                        type="button"
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