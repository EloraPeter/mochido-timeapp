import { useEffect, useState, useCallback, useMemo } from 'react';
import { getItems, updateItem, addItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { Task } from '@/lib/db/schema';
import { 
  updateTaskStatus, 
  sortTasksByIntelligence,
  getBehavioralInsights,
  calculateUrgency
} from '@/lib/intelligence/taskIntelligence';

interface UseTasksReturn {
  // Data
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Derived UI state (computed, NOT business logic)
  sortedTasks: Task[];
  urgentTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  stats: {
    total: number;
    completed: number;
    overdue: number;
    urgentCount: number;
    completionRate: number;
  };
  insights: ReturnType<typeof getBehavioralInsights> | null;
  
  // CRUD operations ONLY
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'urgencyScore' | 'userId'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Side effects (trigger refresh)
  refreshData: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = getCurrentUserId(); // ✅ Use sync version
  
  // 1️⃣ DATA LOADING - fetch only, no logic
  const loadTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Just fetch raw data
      const rawTasks = await getItems<Task>(STORES.tasks, 'userId', userId);
      
      // 2️⃣ APPLY INTELLIGENCE - call external function, don't implement here
      const processedTasks = rawTasks.map(task => updateTaskStatus(task));
      
      setTasks(processedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // 4️⃣ DERIVED STATE - UI computation ONLY
  const sortedTasks = useMemo(() => sortTasksByIntelligence(tasks), [tasks]);
  
  const urgentTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.isDone) return false;
      if (t.status === 'overdue') return true;
      const urgency = t.urgencyScore ?? calculateUrgency(t);
      return urgency > 70;
    });
  }, [tasks]);
  
  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate.startsWith(today) && !t.isDone);
  }, [tasks]);
  
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    return tasks.filter(t => {
      if (t.isDone) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    });
  }, [tasks]);
  
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isDone).length;
    const overdue = tasks.filter(t => t.status === 'overdue' && !t.isDone).length;
    
    return {
      total,
      completed,
      overdue,
      urgentCount: urgentTasks.length,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [tasks, urgentTasks]);
  
  const insights = useMemo(() => {
    if (tasks.length === 0) return null;
    return getBehavioralInsights(tasks);
  }, [tasks]);
  
  // 3️⃣ CRUD OPERATIONS ONLY - no logic decisions
  const addTask = useCallback(async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'urgencyScore' | 'userId'>
  ) => {
    if (!userId) throw new Error('No user logged in');
    
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      status: 'pending',
      urgencyScore: 0,
      isDone: false,
      reminderMinutes: taskData.reminderMinutes || [1440, 60, 10, 0]
    };
    
    await addItem(STORES.tasks, newTask);
    await loadTasks();
  }, [userId, loadTasks]);
  
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await updateItem(STORES.tasks, id, updates);
    await loadTasks();
  }, [loadTasks]);
  
  const toggleComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    // Call intelligence function, don't re-implement logic
    const updated = updateTaskStatus({ ...task, isDone: !task.isDone });
    
    await updateItem(STORES.tasks, id, {
      isDone: updated.isDone,
      status: updated.status,
      completedAt: updated.completedAt,
      completedLate: updated.completedLate,
      urgencyScore: updated.urgencyScore
    });
    
    await loadTasks();
  }, [tasks, loadTasks]);
  
  const deleteTask = useCallback(async (id: string) => {
    await deleteItem(STORES.tasks, id);
    await loadTasks();
  }, [loadTasks]);
  
  // 5️⃣ SIDE EFFECTS - trigger refresh only
  const refreshData = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);
  
  // Auto-mark overdue (side effect, not logic)
  useEffect(() => {
    const checkOverdue = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.isDone && new Date(task.dueDate) < now && task.status !== 'overdue') {
          updateItem(STORES.tasks, task.id, { status: 'overdue' }).catch(console.error);
        }
      });
    };
    
    const interval = setInterval(checkOverdue, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tasks]);
  
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);
  
  return {
    // Data
    tasks,
    loading,
    error,
    
    // Derived UI state
    sortedTasks,
    urgentTasks,
    todayTasks,
    upcomingTasks,
    stats,
    insights,
    
    // CRUD operations
    addTask,
    updateTask,
    toggleComplete,
    deleteTask,
    
    // Side effects
    refreshData
  };
}