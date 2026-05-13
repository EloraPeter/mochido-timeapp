// components/RoutineManager.tsx (Updated - No Mochi, Add Drag & Drop)
'use client';

import { useState, useCallback } from 'react';
import { useRoutines } from '@/hooks/useRoutines';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Sun,
  X,
  Bell,
  Repeat,
  CalendarDays,
  TrendingUp,
  Award,
  GripVertical,
  Lightbulb,
  Coffee,
  BookOpen,
  Dumbbell,
  Bed,
  Sparkles
} from 'lucide-react';

interface RoutineFormData {
  title: string;
  durationMinutes: number;
  scheduleType: 'daily' | 'weekly' | 'once';
  onceDate?: string;
  days?: string[];
  affectsWakeUp: boolean;
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Template suggestions
const TEMPLATES = [
  { title: 'Morning Meditation', durationMinutes: 10, affectsWakeUp: true, icon: <Sparkles size={16} /> },
  { title: 'Shower & Get Ready', durationMinutes: 20, affectsWakeUp: true, icon: <Sun size={16} /> },
  { title: 'Healthy Breakfast', durationMinutes: 15, affectsWakeUp: true, icon: <Coffee size={16} /> },
  { title: 'Study Session', durationMinutes: 60, affectsWakeUp: false, icon: <BookOpen size={16} /> },
  { title: 'Exercise / Stretch', durationMinutes: 30, affectsWakeUp: false, icon: <Dumbbell size={16} /> },
  { title: 'Evening Wind Down', durationMinutes: 15, affectsWakeUp: false, icon: <Bed size={16} /> },
];

export default function RoutineManager() {
  const { routines, loading, addRoutine, updateRoutine, deleteRoutine, getMorningRoutines } = useRoutines();
  const { success, error, confirm } = useCustomAlert();
  const [orderedRoutines, setOrderedRoutines] = useState(routines);
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoutineFormData>({
    title: '',
    durationMinutes: 30,
    scheduleType: 'daily',
    onceDate: '',
    days: [],
    affectsWakeUp: false
  });

  // Time blocks for visual schedule (6 AM to 10 PM)
  const timeBlocks = Array.from({ length: 17 }, (_, i) => {
    const hour = 6 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Get routines for a specific time block (simplified - based on order)
  const getRoutinesForTimeBlock = (index: number) => {
    return orderedRoutines.filter((_, i) => i === index);
  };

  const morningRoutines = getMorningRoutines();
  const totalPrepTime = morningRoutines.reduce((sum, r) => sum + r.durationMinutes, 0);
  const totalRoutinesTime = routines.reduce((sum, r) => sum + r.durationMinutes, 0);

  // Handle drag end
  const handleReorder = useCallback((newOrder: any[]) => {
    setOrderedRoutines(newOrder);
    // In a real implementation, you'd save the order to the database
  }, []);

  const handleOpenModal = (routine?: any) => {
    if (routine) {
      setEditingRoutine(routine);
      setFormData({
        title: routine.title,
        durationMinutes: routine.durationMinutes,
        scheduleType: routine.scheduleType,
        onceDate: routine.onceDate?.split('T')[0] || '',
        days: routine.days || [],
        affectsWakeUp: routine.affectsWakeUp
      });
    } else {
      setEditingRoutine(null);
      setFormData({
        title: '',
        durationMinutes: 30,
        scheduleType: 'daily',
        onceDate: '',
        days: [],
        affectsWakeUp: false
      });
    }
    setShowTemplates(false);
    setShowModal(true);
  };

  const handleUseTemplate = (template: typeof TEMPLATES[0]) => {
    setFormData({
      title: template.title,
      durationMinutes: template.durationMinutes,
      scheduleType: 'daily',
      onceDate: '',
      days: [],
      affectsWakeUp: template.affectsWakeUp
    });
    setEditingRoutine(null);
    setShowTemplates(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      error('Please enter a routine title');
      return;
    }

    if (formData.durationMinutes <= 0) {
      error('Duration must be positive');
      return;
    }

    const dataToSave = {
      title: formData.title,
      durationMinutes: formData.durationMinutes,
      scheduleType: formData.scheduleType,
      onceDate: formData.onceDate ? new Date(formData.onceDate).toISOString() : undefined,
      days: formData.scheduleType === 'weekly' ? formData.days : undefined,
      affectsWakeUp: formData.affectsWakeUp
    };

    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, dataToSave);
      success('Routine updated!');
    } else {
      await addRoutine(dataToSave);
      success('Routine added!');
    }

    setShowModal(false);
    setEditingRoutine(null);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days?.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...(prev.days || []), day]
    }));
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm(`Delete "${title}"?`);
    if (confirmed) {
      await deleteRoutine(id);
      success('Routine deleted');
    }
  };

  const getScheduleIcon = (routine: any) => {
    if (routine.scheduleType === 'daily') return <Repeat size={14} />;
    if (routine.scheduleType === 'weekly') return <CalendarDays size={14} />;
    return <Calendar size={14} />;
  };

  const getScheduleText = (routine: any) => {
    if (routine.scheduleType === 'daily') return 'Every day';
    if (routine.scheduleType === 'weekly') {
      const days = routine.days?.map((d: string) => d.slice(0, 3)).join(', ');
      return `Weekly: ${days}`;
    }
    return `Once: ${new Date(routine.onceDate).toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <MobileSidebar />
        <div className="max-w-4xl mx-auto p-4">
          <div className="ml-10 md:ml-0 mb-6">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse" />
          </div>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 h-20" />
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

      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="ml-10 md:ml-0 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Routines</h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage daily habits and preparations</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
              >
                <Lightbulb size={18} />
                Templates
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
              >
                <Plus size={18} />
                Add Routine
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-blue-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalRoutinesTime}</span>
            </div>
            <p className="text-xs text-gray-500">Total minutes daily</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award size={18} className="text-orange-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{routines.length}</span>
            </div>
            <p className="text-xs text-gray-500">Active routines</p>
          </div>
        </div>

        {/* Morning Prep Summary */}
        {morningRoutines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sun size={20} />
                  <h2 className="font-semibold">Morning Preparation</h2>
                </div>
                <p className="text-3xl font-bold">{totalPrepTime} min</p>
                <p className="text-sm opacity-90 mt-1">{morningRoutines.length} routines before class</p>
              </div>
              <TrendingUp size={40} className="opacity-80" />
            </div>
          </motion.div>
        )}

        {/* Time-block Visual Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Daily Schedule</h2>
            <p className="text-xs text-gray-500">Drag to reorder your routines</p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {timeBlocks.map((time, idx) => {
                const routineAtTime = getRoutinesForTimeBlock(idx)[0];
                if (!routineAtTime && idx > orderedRoutines.length - 1) return null;
                
                return (
                  <div
                    key={time}
                    className={`flex items-center gap-3 p-3 rounded-xl transition ${
                      routineAtTime ? 'bg-gray-50 dark:bg-gray-700/30' : 'bg-gray-50/50 dark:bg-gray-800/30'
                    }`}
                  >
                    <div className="w-16 text-sm font-mono text-gray-500">{time}</div>
                    <div className="flex-1">
                      {routineAtTime ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{routineAtTime.title}</p>
                            <p className="text-xs text-gray-400">{routineAtTime.durationMinutes} min</p>
                          </div>
                          <GripVertical size={16} className="text-gray-400 cursor-move" />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTimeSlot(idx);
                            handleOpenModal();
                          }}
                          className="text-sm text-blue-500 hover:underline"
                        >
                          + Add routine here
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Routines List with Drag & Drop */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">All Routines</h2>
            <p className="text-xs text-gray-500">Drag to reorder</p>
          </div>

          <Reorder.Group axis="y" values={orderedRoutines} onReorder={handleReorder} className="divide-y divide-gray-200 dark:divide-gray-700">
            {orderedRoutines.map((routine) => (
              <Reorder.Item key={routine.id} value={routine} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group cursor-move">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{routine.title}</h3>
                        {routine.affectsWakeUp && (
                          <span className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sun size={10} /> Wake-up
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {routine.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          {getScheduleIcon(routine)}
                          {getScheduleText(routine)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenModal(routine)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(routine.id, routine.title)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {orderedRoutines.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🕐</div>
              <p className="text-gray-400">No routines yet</p>
              <button
                onClick={() => setShowTemplates(true)}
                className="mt-2 text-blue-500 text-sm"
              >
                Browse templates to get started
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Bell className="text-blue-500 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">About Routines</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Routines marked as <strong>"Affects wake-up"</strong> will be included in your morning preparation calculation.
                Mochi uses this to suggest the best time to wake up for your first class.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Routine Templates</h2>
                <button onClick={() => setShowTemplates(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              <div className="space-y-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    onClick={() => handleUseTemplate(template)}
                    className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{template.title}</p>
                      <p className="text-xs text-gray-500">{template.durationMinutes} min • {template.affectsWakeUp ? 'Morning' : 'Anytime'}</p>
                    </div>
                    <Plus size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowTemplates(false);
                  handleOpenModal();
                }}
                className="mt-4 w-full p-3 text-center text-blue-500 border border-blue-500 rounded-xl hover:bg-blue-50 transition"
              >
                Create Custom Routine
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal - Same as before */}
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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingRoutine ? 'Edit Routine' : 'Add New Routine'}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Routine Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    placeholder="e.g., Morning Meditation, Shower, Breakfast"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                    min="1"
                    max="240"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Schedule Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'daily', label: 'Daily', icon: <Repeat size={16} /> },
                      { value: 'weekly', label: 'Weekly', icon: <CalendarDays size={16} /> },
                      { value: 'once', label: 'Once', icon: <Calendar size={16} /> }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          scheduleType: option.value as any,
                          days: option.value === 'weekly' ? formData.days : [],
                          onceDate: option.value === 'once' ? formData.onceDate : ''
                        })}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${formData.scheduleType === option.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                      >
                        {option.icon}
                        <span className="text-xs">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.scheduleType === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Days</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEEKDAYS.map(day => (
                        <label key={day} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.days?.includes(day) || false}
                            onChange={() => handleDayToggle(day)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.scheduleType === 'once' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.onceDate}
                      onChange={(e) => setFormData({ ...formData, onceDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.affectsWakeUp}
                      onChange={(e) => setFormData({ ...formData, affectsWakeUp: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Affects wake-up time</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">
                    Include this routine in morning preparation calculation
                  </p>
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
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    {editingRoutine ? 'Update' : 'Add'} Routine
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