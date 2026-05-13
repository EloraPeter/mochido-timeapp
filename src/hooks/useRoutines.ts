import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { Routine } from '@/lib/db/schema';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = getCurrentUserId();
  
  const loadRoutines = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const allRoutines = await getItems<Routine>(STORES.routines, 'userId', userId);
    setRoutines(allRoutines);
    setLoading(false);
  }, [userId]);
  
  const addRoutine = useCallback(async (routine: Omit<Routine, 'id' | 'userId' | 'createdAt'>) => {
    if (!userId) throw new Error('No user logged in');
    const newRoutine = { 
      ...routine, 
      id: crypto.randomUUID(), 
      userId,
      createdAt: new Date().toISOString()
    };
    await addItem(STORES.routines, newRoutine);
    await loadRoutines();
  }, [userId, loadRoutines]);
  
  const updateRoutine = useCallback(async (id: string, updates: Partial<Routine>) => {
    await updateItem(STORES.routines, id, updates);
    await loadRoutines();
  }, [loadRoutines]);
  
  const deleteRoutine = useCallback(async (id: string) => {
    await deleteItem(STORES.routines, id);
    await loadRoutines();
  }, [loadRoutines]);
  
  const getMorningRoutines = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return routines.filter(r => {
      if (!r.affectsWakeUp) return false;
      if (r.scheduleType === 'daily') return true;
      if (r.scheduleType === 'weekly' && r.days) {
        return r.days.map(d => d.toLowerCase()).includes(today);
      }
      if (r.scheduleType === 'once' && r.onceDate) {
        return new Date(r.onceDate).toDateString() === new Date().toDateString();
      }
      return false;
    });
  }, [routines]);
  
  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);
  
  return {
    routines,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    getMorningRoutines,
    refreshRoutines: loadRoutines
  };
}