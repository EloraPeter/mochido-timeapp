import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, deleteItem, getItem, updateItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { Course, Enrollment } from '@/lib/db/schema';

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getCurrentUserId();

  // Load student's enrollments
  const loadEnrollments = useCallback(async () => {
    if (!userId) {
      setEnrollments([]);
      setLoading(false);
      return;
    }
    
    try {
      // Try to get enrollments - if store doesn't exist yet, return empty array
      const allEnrollments = await getItems<Enrollment>(STORES.enrollments);
      const userEnrollments = allEnrollments.filter(e => e.studentId === userId && e.status === 'active');
      setEnrollments(userEnrollments);
    } catch (error) {
      console.warn('Enrollments store not ready yet:', error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Enroll in a course
  const enrollInCourse = useCallback(async (courseId: string) => {
    if (!userId) throw new Error('Not logged in');
    
    try {
      // Check if already enrolled
      const existing = enrollments.find(e => e.courseId === courseId);
      if (existing) return;
      
      const enrollment: Enrollment = {
        id: crypto.randomUUID(),
        studentId: userId,
        courseId,
        enrolledAt: new Date().toISOString(),
        status: 'active'
      };
      
      await addItem(STORES.enrollments, enrollment);
      await loadEnrollments();
    } catch (error) {
      console.error('Failed to enroll:', error);
      throw error;
    }
  }, [userId, enrollments, loadEnrollments]);
  
  // Drop a course
  const dropCourse = useCallback(async (courseId: string) => {
    try {
      const enrollment = enrollments.find(e => e.courseId === courseId);
      if (!enrollment) return;
      
      await updateItem(STORES.enrollments, enrollment.id, { status: 'dropped' });
      await loadEnrollments();
    } catch (error) {
      console.error('Failed to drop course:', error);
      throw error;
    }
  }, [enrollments, loadEnrollments]);
  
  // Check if enrolled in a course
  const isEnrolled = useCallback((courseId: string) => {
    return enrollments.some(e => e.courseId === courseId);
  }, [enrollments]);
  
  // Get student's enrolled course IDs
  const getEnrolledCourseIds = useCallback(() => {
    return enrollments.map(e => e.courseId);
  }, [enrollments]);
  
  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);
  
  return {
    enrollments,
    loading,
    enrollInCourse,
    dropCourse,
    isEnrolled,
    getEnrolledCourseIds,
    refreshEnrollments: loadEnrollments
  };
}