// app/dashboard/student/tasks/TasksClient.tsx
// Mobile-First Redesign: Full-height scroll, bottom sheets, thumb-friendly zones

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useCourseService } from '@/hooks/useCourseService';
import { useMochiMood } from '@/hooks/useMochiMood';
import { useStreak } from '@/hooks/useStreak';
import { CheckCircle, Circle, Plus, X, AlertCircle, Calendar as CalendarIcon, List, CheckSquare, Trash2, Sparkles, ChevronRight } from 'lucide-react';
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

    // Get dynamic Mochi message
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

    // Calendar View - Mobile optimized
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="text-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
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
                        const hasUrgent = tasksForDay.some(t => t.priority === 'high');
                        return (
                            <div
                                key={idx}
                                className={`aspect-square p-1 rounded-lg border ${isToday
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                                        : 'border-gray-100 dark:border-gray-700'
                                    }`}
                            >
                                {day && (
                                    <div className="flex flex-col items-center">
                                        <span className={`text-xs ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {day}
                                        </span>
                                        {tasksForDay.length > 0 && (
                                            <div className="mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full mx-auto ${hasUrgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                                                {tasksForDay.length > 1 && (
                                                    <span className="text-[8px] text-gray-400">{tasksForDay.length}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
                <MobileSidebar />
                <div className="p-4 pt-2">
                    <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-2" />
                    <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
                    <SkeletonList count={5} variant="task" />
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
                        <h1 className="text-2xl font-bold bg-linear-to-rrom-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text">Tasks</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {stats.completed} of {stats.total} done ({stats.completionRate.toFixed(0)}%)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isBulkMode && (
                            <button
                                onClick={() => setIsBulkMode(true)}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 active:scale-95 transition-transform"
                                aria-label="Select multiple"
                            >
                                <CheckSquare size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddTask(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white shadow-md active:scale-95 transition-transform"
                            aria-label="Add Task"
                        >
                            <Plus size={22} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Mochi Buddy - Compact mobile card */}
                <MochiBuddy
                    mood={mood}
                    message={getMochiMessage()}
                    onMochiClick={refreshMood}
                    stats={getMochiStats}
                    variant="compact"
                />

                {/* Bulk Action Bar - Slide down */}
                <AnimatePresence>
                    {isBulkMode && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 flex items-center justify-between"
                        >
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {selectedTasks.size} selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkComplete}
                                    disabled={selectedTasks.size === 0}
                                    className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    ✓ Done
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedTasks.size === 0}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    🗑 Delete
                                </button>
                                <button
                                    onClick={() => {
                                        setIsBulkMode(false);
                                        setSelectedTasks(new Set());
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filter Bar - Horizontal scrollable for mobile */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {(['all', 'today', 'week', 'overdue', 'completed'] as FilterType[]).map((f) => {
                            const count = getFilterCount(f);
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${filter === f
                                            ? f === 'overdue'
                                                ? 'bg-red-500 text-white shadow-md'
                                                : f === 'completed'
                                                    ? 'bg-green-500 text-white shadow-md'
                                                    : 'bg-blue-500 text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    {f === 'all' ? 'All' : f}
                                    {count > 0 && f !== 'all' && (
                                        <span className="ml-1 text-xs opacity-90">({count})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 active:scale-95 transition-transform"
                    >
                        {viewMode === 'list' ? <CalendarIcon size={18} /> : <List size={18} />}
                    </button>
                </div>

                {/* Content Area */}
                {viewMode === 'calendar' ? (
                    <CalendarView />
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[65vh] overflow-y-auto">
                            {filteredTasks.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-3xl">
                                            {filter === 'completed' ? '🏆' : filter === 'overdue' ? '⏰' : '✅'}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">No tasks here</p>
                                    <button
                                        onClick={() => setShowAddTask(true)}
                                        className="mt-2 text-blue-500 text-sm font-medium"
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
                                    const isOverdue = task.status === 'overdue' && !task.isDone;
                                    const dueSoon = !task.isDone && new Date(task.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

                                    return (
                                        <div key={task.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* Checkbox / Select */}
                                                    {isBulkMode ? (
                                                        <button
                                                            onClick={() => toggleSelectTask(task.id)}
                                                            className="mt-0.5 w-6 h-6 rounded-md border-2 border-gray-300 flex items-center justify-center"
                                                        >
                                                            {selectedTasks.has(task.id) && (
                                                                <div className="w-4 h-4 bg-blue-500 rounded-sm" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleComplete(task.id)}
                                                            className="mt-0.5 shrink-0 active:scale-95 transition-transform"
                                                        >
                                                            {task.isDone ? (
                                                                <CheckCircle className="text-green-500" size={24} />
                                                            ) : (
                                                                <Circle className="text-gray-300 dark:text-gray-600" size={24} />
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Task Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className={`font-semibold text-gray-900 dark:text-white text-base ${task.isDone ? 'line-through text-gray-400 dark:text-gray-500' : ''
                                                                }`}>
                                                                {task.title}
                                                            </p>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)} capitalize`}>
                                                                {task.priority}
                                                            </span>
                                                            {isOverdue && (
                                                                <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <AlertCircle size={10} /> Overdue
                                                                </span>
                                                            )}
                                                            {dueSoon && !isOverdue && (
                                                                <span className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                                                                    Due soon
                                                                </span>
                                                            )}
                                                        </div>

                                                        {course && (
                                                            <p className="text-xs text-gray-400 mb-1">
                                                                📚 {course.title}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                <span>Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
                                                            </p>

                                                            <div className="flex gap-1">
                                                                {subtasks.length > 0 && (
                                                                    <button
                                                                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                                                        className="text-xs text-gray-400 flex items-center gap-1 px-2 py-1 rounded-full active:bg-gray-100 dark:active:bg-gray-700"
                                                                    >
                                                                        {isExpanded ? '▼' : '▶'} {completedSubtasks}/{subtasks.length}
                                                                    </button>
                                                                )}
                                                                {!isBulkMode && (
                                                                    <button
                                                                        onClick={() => deleteTask(task.id)}
                                                                        className="p-1 text-gray-400 active:text-red-500 transition-colors"
                                                                        aria-label="Delete"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Subtasks Section */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-3 ml-9 pl-3 border-l-2 border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div className="space-y-2">
                                                                {subtasks.map(subtask => (
                                                                    <div key={subtask.id} className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => toggleSubtask(task.id, subtask.id)}
                                                                            className="active:scale-95 transition-transform"
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
                                                                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                                                                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleAddSubtask(task.id)}
                                                                        className="px-3 py-2 text-sm bg-blue-500 text-white rounded-xl active:scale-95 transition-all"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Motivational Footer - Minimal */}
                <div className="text-center py-3">
                    <p className="text-xs text-gray-400">
                        {urgentTasks.length > 0
                            ? `⚡ ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's need' : ' needs'} attention!`
                            : stats.completed > 0
                                ? "✨ Great progress! Keep the momentum! ✨"
                                : "🌱 Start with one small task today 🌱"}
                    </p>
                </div>
            </div>

            {/* Add Task Bottom Sheet */}
            <AnimatePresence>
                {showAddTask && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
                        onClick={() => setShowAddTask(false)}
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
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">🐹</span>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Task</h2>
                                </div>
                                <button onClick={() => setShowAddTask(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                                    <X size={22} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleAddTask} className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">What needs to be done?</label>
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="e.g., Finish essay, Study math..."
                                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['high', 'medium', 'low'] as const).map((priority) => (
                                            <button
                                                key={priority}
                                                type="button"
                                                onClick={() => setNewTaskPriority(priority)}
                                                className={`py-2.5 rounded-xl capitalize font-medium transition-all active:scale-95 ${newTaskPriority === priority
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
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Due Date</label>
                                    <input
                                        type="datetime-local"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Leave empty for end of today</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Course (Optional)</label>
                                    <select
                                        value={newTaskCourseId}
                                        onChange={(e) => setNewTaskCourseId(e.target.value)}
                                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        <option value="general">📚 General Task</option>
                                        {myCourses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.title} ({course.courseCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddTask(false)}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors"
                                    >
                                        Add Task
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