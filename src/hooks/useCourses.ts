import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { CourseCatalog } from '@/lib/db/schema';

export function useCourses() {
  const [courses, setCourses] = useState<CourseCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = getCurrentUserId();
  
  const loadCourses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // Use courseCatalog instead of courses
    const allCourses = await getItems<CourseCatalog>(STORES.courseCatalog);
    // Filter to show only courses the user created OR is enrolled in
    // For now, show all courses
    setCourses(allCourses);
    setLoading(false);
  }, [userId]);
  
  const addCourse = useCallback(async (course: Omit<CourseCatalog, 'id'>) => {
    if (!userId) throw new Error('No user logged in');
    const newCourse = { 
      ...course, 
      id: crypto.randomUUID(),
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isVerified: false
    };
    await addItem(STORES.courseCatalog, newCourse);
    await loadCourses();
  }, [userId, loadCourses]);
  
  const updateCourse = useCallback(async (id: string, updates: Partial<CourseCatalog>) => {
    await updateItem(STORES.courseCatalog, id, updates);
    await loadCourses();
  }, [loadCourses]);
  
  const deleteCourse = useCallback(async (id: string) => {
    await deleteItem(STORES.courseCatalog, id);
    await loadCourses();
  }, [loadCourses]);
  
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);
  
  return {
    courses,
    loading,
    addCourse,
    updateCourse,
    deleteCourse,
    refreshCourses: loadCourses
  };
}