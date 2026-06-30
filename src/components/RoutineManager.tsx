// components/RoutineManager.tsx
// Mobile-First Redesign: Full height usage, bottom sheets, thumb-friendly layout

'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Sparkles,
  ChevronRight
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
  { title: 'Morning Meditation', durationMinutes: 10, affectsWakeUp: true, icon: <Sparkles size={20} />, color: 'bg-purple-100 text-purple-600' },
  { title: 'Shower & Get Ready', durationMinutes: 20, affectsWakeUp: true, icon: <Sun size={20} />, color: 'bg-yellow-100 text-yellow-600' },
  { title: 'Healthy Breakfast', durationMinutes: 15, affectsWakeUp: true, icon: <Coffee size={20} />, color: 'bg-amber-100 text-amber-600' },
  { title: 'Study Session', durationMinutes: 60, affectsWakeUp: false, icon: <BookOpen size={20} />, color: 'bg-blue-100 text-blue-600' },
  { title: 'Exercise / Stretch', durationMinutes: 30, affectsWakeUp: false, icon: <Dumbbell size={20} />, color: 'bg-green-100 text-green-600' },
  { title: 'Evening Wind Down', durationMinutes: 15, affectsWakeUp: false, icon: <Bed size={20} />, color: 'bg-indigo-100 text-indigo-600' },
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

  // Sync ordered routines when main list changes
  useEffect(() => {
    setOrderedRoutines(routines);
  }, [routines]);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <MobileSidebar />
        <div className="p-4 pt-2">
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-1" />
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

      {/* Sticky Header - Mobile Friendly */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="pl-8">
            <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Routines</h1>
            <p className="text-xs text-gray-500 mt-0.5">Daily habits & preparations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 active:scale-95 transition-transform"
              aria-label="Templates"
            >
              <Lightbulb size={20} />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white shadow-md active:scale-95 transition-transform"
              aria-label="Add Routine"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Stats Cards - Touch friendly */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Clock size={16} className="text-blue-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalRoutinesTime}</span>
            </div>
            <p className="text-xs text-gray-500">Total daily mins</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Award size={16} className="text-orange-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{routines.length}</span>
            </div>
            <p className="text-xs text-gray-500">Active routines</p>
          </div>
        </div>

        {/* Morning Prep Summary - Mobile Card */}
        {morningRoutines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sun size={18} />
                  <h2 className="font-semibold text-sm">Morning Prep</h2>
                </div>
                <p className="text-3xl font-bold tracking-tight">{totalPrepTime} min</p>
                <p className="text-xs opacity-90 mt-1">{morningRoutines.length} routines before class</p>
              </div>
              <TrendingUp size={36} className="opacity-80" />
            </div>
          </motion.div>
        )}

        {/* Routines List with Drag & Drop - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">All Routines</h2>
              <p className="text-xs text-gray-400">Drag handle to reorder</p>
            </div>
            <span className="text-xs text-gray-400">{orderedRoutines.length} items</span>
          </div>

          <Reorder.Group axis="y" values={orderedRoutines} onReorder={handleReorder} className="divide-y divide-gray-100 dark:divide-gray-700">
            {orderedRoutines.map((routine) => (
              <Reorder.Item key={routine.id} value={routine} className="p-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Drag Handle - Large touch area */}
                  <div className="shrink-0 p-1 -ml-1 touch-none">
                    <GripVertical size={20} className="text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate max-w-40">{routine.title}</h3>
                      {routine.affectsWakeUp && (
                        <span className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sun size={10} /> Wake
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {routine.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        {getScheduleIcon(routine)}
                        <span className="truncate max-w-32.5">{getScheduleText(routine)}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons - Mobile friendly tap targets */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(routine)}
                      className="p-2 text-blue-500 active:bg-blue-50 dark:active:bg-blue-900/20 rounded-full transition-colors"
                      aria-label="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(routine.id, routine.title)}
                      className="p-2 text-red-500 active:bg-red-50 dark:active:bg-red-900/20 rounded-full transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {orderedRoutines.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-400 font-medium">No routines yet</p>
              <button
                onClick={() => setShowTemplates(true)}
                className="mt-2 text-blue-500 text-sm font-medium"
              >
                Browse templates →
              </button>
            </div>
          )}
        </div>

        {/* Info Card - Compact */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Bell className="text-blue-500 mt-0.5 shrink-0" size={18} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">About Routines</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Routines marked as <strong>"Wake-up"</strong> are included in your morning preparation calculation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Bottom Sheet */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowTemplates(false)}
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Templates</h2>
                <button onClick={() => setShowTemplates(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    onClick={() => handleUseTemplate(template)}
                    className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-left"
                  >
                    <div className={`p-2 rounded-full ${template.color}`}>
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{template.title}</p>
                      <p className="text-xs text-gray-500">{template.durationMinutes} min • {template.affectsWakeUp ? 'Morning' : 'Anytime'}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    setShowTemplates(false);
                    handleOpenModal();
                  }}
                  className="w-full mt-4 p-3 text-center text-blue-500 font-medium border border-blue-200 dark:border-blue-800 rounded-xl active:bg-blue-50 dark:active:bg-blue-900/20 transition-colors"
                >
                  + Create Custom Routine
                </button>
              </div>
              
              {/* Safe area spacer for bottom sheet */}
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal - Bottom Sheet Style */}
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
                  {editingRoutine ? 'Edit Routine' : 'New Routine'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Morning Meditation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    min="1"
                    max="240"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Schedule</label>
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
                        className={`py-3 rounded-xl flex flex-col items-center gap-1 transition active:scale-95 ${formData.scheduleType === option.value
                            ? 'bg-blue-500 text-white shadow-md'
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
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Days</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEEKDAYS.map(day => (
                        <label key={day} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer active:bg-gray-50 dark:active:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.days?.includes(day) || false}
                            onChange={() => handleDayToggle(day)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.scheduleType === 'once' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date</label>
                    <input
                      type="date"
                      value={formData.onceDate}
                      onChange={(e) => setFormData({ ...formData, onceDate: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="affectsWakeUp"
                    checked={formData.affectsWakeUp}
                    onChange={(e) => setFormData({ ...formData, affectsWakeUp: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <label htmlFor="affectsWakeUp" className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Affects wake-up time
                  </label>
                </div>
                <p className="text-xs text-gray-500 -mt-2 ml-8">
                  Include in morning preparation calculation
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl active:bg-gray-200 dark:active:bg-gray-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl shadow-md active:bg-blue-600 font-medium transition-colors"
                  >
                    {editingRoutine ? 'Update' : 'Add'} Routine
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