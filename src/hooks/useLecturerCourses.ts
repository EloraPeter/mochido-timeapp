import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import type { CourseCatalog, LecturerCourse } from '@/lib/db/schema';

export interface LecturerCourseWithDetails {
  id: string;
  catalogId: string;
  name: string;
  code: string;
  description?: string;
  days: string[];
  startTime: string;
  endTime: string;
  location?: string;
  capacity?: number;
  lecturerId: string;
  isVerified: boolean;
  createdAt: string;
}

export function useLecturerCourses() {
  const [courses, setCourses] = useState<LecturerCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = getCurrentUserId();
  
  const loadCourses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    // Get all lecturer courses (schedule info)
    const lecturerCourses = await getItems<LecturerCourse>(STORES.lecturerCourses, 'lecturerId', userId);
    
    // Get all course catalogs (basic info)
    const catalogs = await getItems<CourseCatalog>(STORES.courseCatalog);
    
    // Merge the data
    const mergedCourses: LecturerCourseWithDetails[] = lecturerCourses.map(lc => {
      const catalog = catalogs.find(c => c.id === lc.catalogId);
      return {
        id: lc.id,
        catalogId: lc.catalogId,
        name: catalog?.title || 'Unknown Course',
        code: catalog?.courseCode || 'N/A',
        description: catalog?.description,
        days: lc.days,
        startTime: lc.startTime,
        endTime: lc.endTime,
        location: lc.location,
        capacity: lc.capacity,
        lecturerId: lc.lecturerId,
        isVerified: catalog?.isVerified || false,
        createdAt: lc.createdAt
      };
    });
    
    setCourses(mergedCourses);
    setLoading(false);
  }, [userId]);
  
  const addCourse = useCallback(async (courseData: Omit<LecturerCourseWithDetails, 'id' | 'lecturerId' | 'createdAt' | 'catalogId' | 'isVerified'>) => {
    if (!userId) throw new Error('No user logged in');
    
    // First, check if catalog exists or create it
    const existingCatalog = await getItems<CourseCatalog>(STORES.courseCatalog);
    let catalog = existingCatalog.find(c => c.courseCode === courseData.code.toUpperCase());
    
    if (!catalog) {
      // Create new catalog
      catalog = {
        id: crypto.randomUUID(),
        courseCode: courseData.code.toUpperCase(),
        title: courseData.name,
        description: courseData.description,
        createdBy: userId,
        isVerified: true, // Lecturer creates verified course
        createdAt: new Date().toISOString()
      };
      await addItem(STORES.courseCatalog, catalog);
    }
    
    // Create lecturer course
    const newCourse: LecturerCourse = {
      id: crypto.randomUUID(),
      catalogId: catalog.id,
      lecturerId: userId,
      days: courseData.days,
      startTime: courseData.startTime,
      endTime: courseData.endTime,
      location: courseData.location,
      capacity: courseData.capacity,
      createdAt: new Date().toISOString()
    };
    
    await addItem(STORES.lecturerCourses, newCourse);
    await loadCourses();
  }, [userId, loadCourses]);
  
  const updateCourse = useCallback(async (id: string, updates: Partial<LecturerCourseWithDetails>) => {
    // Update lecturer course
    const lecturerUpdate: Partial<LecturerCourse> = {
      days: updates.days,
      startTime: updates.startTime,
      endTime: updates.endTime,
      location: updates.location,
      capacity: updates.capacity
    };
    await updateItem(STORES.lecturerCourses, id, lecturerUpdate);
    
    // Update catalog if name/code changed
    const lecturerCourse = await getItems<LecturerCourse>(STORES.lecturerCourses);
    const found = lecturerCourse.find(lc => lc.id === id);
    if (found && (updates.name || updates.code)) {
      await updateItem(STORES.courseCatalog, found.catalogId, {
        title: updates.name,
        courseCode: updates.code?.toUpperCase()
      });
    }
    
    await loadCourses();
  }, [loadCourses]);
  
  const deleteCourse = useCallback(async (id: string) => {
    await deleteItem(STORES.lecturerCourses, id);
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