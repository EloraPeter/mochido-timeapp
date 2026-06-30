import { useEffect, useState, useCallback } from 'react';
import { getItems, updateItem, addItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { Task, CourseCatalog } from '@/lib/db/schema';

export function useAssignments() {
  const [assignments, setAssignments] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = getCurrentUserId();
  
  const loadAssignments = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get all tasks (not filtered by user)
      // We need to modify this to get ALL tasks, then filter by course enrollment
      const allTasks = await getItems<Task>(STORES.tasks);
      
      // Get user's courses
      const userCourses = await getItems<CourseCatalog>(
  STORES.courseCatalog,
  'createdBy',
  userId
);

const userCourseIds = userCourses.map(c => c.id);
      
      // Filter: assignments where catalogId matches user's enrolled courses
      // AND assignment is not created by the student (different userId)
      const filteredAssignments = allTasks.filter(task => 
        task.catalogId && 
        task.catalogId !== 'general' &&
        userCourseIds.includes(task.catalogId) &&
        task.userId !== userId // Assignment created by lecturer, not student
      );
      
      setAssignments(filteredAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Mark assignment as complete (for students)
  const markComplete = useCallback(async (assignmentId: string) => {
    await updateItem(STORES.tasks, assignmentId, {
      isDone: true,
      completedAt: new Date().toISOString(),
      status: 'completed'
    });
    await loadAssignments();
  }, [loadAssignments]);
  
  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);
  
  return {
    assignments,
    loading,
    error,
    markComplete,
    refreshAssignments: loadAssignments
  };
}