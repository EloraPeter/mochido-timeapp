import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, getItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId, getCurrentUserRole } from '@/lib/auth/pinAuth';
import type { CourseCatalog, LecturerCourse, Enrollment } from '@/lib/db/schema';

// Extended course type with schedule info
export interface CourseWithSchedule extends CourseCatalog {
  days?: string[];
  startTime?: string;
  endTime?: string;
  location?: string;
}

export function useCourseService() {
  const [allCatalogs, setAllCatalogs] = useState<CourseCatalog[]>([]);
  const [lecturerCourses, setLecturerCourses] = useState<LecturerCourse[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = getCurrentUserId();
  const userRole = getCurrentUserRole();

  // Load all course catalogs
  const loadCatalogs = useCallback(async () => {
    const catalogs = await getItems<CourseCatalog>(STORES.courseCatalog);
    setAllCatalogs(catalogs);
    return catalogs;
  }, []);

  // Load lecturer courses (for schedule info)
  const loadLecturerCourses = useCallback(async () => {
    const courses = await getItems<LecturerCourse>(STORES.lecturerCourses);
    setLecturerCourses(courses);
    return courses;
  }, []);

  // Load student's enrollments
  const loadMyEnrollments = useCallback(async () => {
    if (!userId || userRole !== 'student') {
      setMyEnrollments([]);
      return;
    }
    const enrollments = await getItems<Enrollment>(STORES.enrollments, 'studentId', userId);
    setMyEnrollments(enrollments.filter(e => e.status === 'active'));
  }, [userId, userRole]);

  // Student enrolls in a course (DECLARE FIRST)
  const enrollInCourse = useCallback(async (catalogId: string): Promise<Enrollment> => {
    if (!userId) throw new Error('Not logged in');
    
    const alreadyEnrolled = myEnrollments.some(e => e.catalogId === catalogId);
    if (alreadyEnrolled) {
      throw new Error('Already enrolled in this course');
    }
    
    const lecturerCourse = lecturerCourses.find(lc => lc.catalogId === catalogId);
    
    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      studentId: userId,
      catalogId,
      lecturerCourseId: lecturerCourse?.id,
      status: 'active',
      enrolledAt: new Date().toISOString()
    };
    
    await addItem(STORES.enrollments, enrollment);
    await loadMyEnrollments();
    return enrollment;
  }, [userId, myEnrollments, lecturerCourses, loadMyEnrollments]);

  // Find or create course catalog
  const findOrCreateCatalog = useCallback(async (courseCode: string, title: string): Promise<CourseCatalog> => {
    if (!userId) throw new Error('Not logged in');
    
    const normalizedCode = courseCode.toUpperCase().trim();
    const existing = allCatalogs.find(c => c.courseCode === normalizedCode);
    if (existing) return existing;
    
    const newCatalog: CourseCatalog = {
      id: crypto.randomUUID(),
      courseCode: normalizedCode,
      title,
      description: '',
      createdBy: userId,
      isVerified: false,
      createdAt: new Date().toISOString()
    };
    
    await addItem(STORES.courseCatalog, newCatalog);
    await loadCatalogs();
    return newCatalog;
  }, [userId, allCatalogs, loadCatalogs]);

  // Student creates a course (creates catalog entry)
  const createStudentCourse = useCallback(async (courseCode: string, title: string, schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
    location?: string;
  }) => {
    if (!userId) throw new Error('Not logged in');
    
    const catalog = await findOrCreateCatalog(courseCode, title);
    
    // If schedule provided, create a lecturer course entry (self-managed)
    if (schedule) {
      const lecturerCourseData: LecturerCourse = {
        id: crypto.randomUUID(),
        catalogId: catalog.id,
        lecturerId: userId,
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        createdAt: new Date().toISOString()
      };
      await addItem(STORES.lecturerCourses, lecturerCourseData);
      await loadLecturerCourses();
    }
    
    // Auto-enroll the creator
    await enrollInCourse(catalog.id);
    
    return catalog;
  }, [userId, findOrCreateCatalog, loadLecturerCourses, enrollInCourse]);

  // Drop a course
  const dropCourse = useCallback(async (catalogId: string) => {
    if (!userId) return;
    const enrollment = myEnrollments.find(e => e.catalogId === catalogId);
    if (!enrollment) return;
    await updateItem(STORES.enrollments, enrollment.id, { status: 'dropped' });
    await loadMyEnrollments();
  }, [userId, myEnrollments, loadMyEnrollments]);

  // Lecturer claims a course
  const claimCourse = useCallback(async (catalogId: string, schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
    location?: string;
  }) => {
    if (!userId || userRole !== 'lecturer') throw new Error('Only lecturers can claim courses');
    
    const catalog = allCatalogs.find(c => c.id === catalogId);
    if (!catalog) throw new Error('Course not found');
    
    // Update catalog as verified
    await updateItem(STORES.courseCatalog, catalogId, {
      isVerified: true,
      lecturerId: userId
    });
    
    // Create lecturer course offering
    const lecturerCourseData: LecturerCourse = {
      id: crypto.randomUUID(),
      catalogId,
      lecturerId: userId,
      days: schedule?.days || [],
      startTime: schedule?.startTime || '',
      endTime: schedule?.endTime || '',
      location: schedule?.location,
      createdAt: new Date().toISOString()
    };
    await addItem(STORES.lecturerCourses, lecturerCourseData);
    await loadLecturerCourses();
    
    // Update all existing enrollments to link to this lecturer course
    const enrollments = await getItems<Enrollment>(STORES.enrollments, 'catalogId', catalogId);
    for (const enrollment of enrollments) {
      await updateItem(STORES.enrollments, enrollment.id, {
        lecturerCourseId: lecturerCourseData.id
      });
    }
    
    await loadCatalogs();
    await loadMyEnrollments();
    
    return lecturerCourseData;
  }, [userId, userRole, allCatalogs, loadCatalogs, loadLecturerCourses, loadMyEnrollments]);

  // Get full course details with schedule (for enrolled courses)
  const getCourseWithSchedule = useCallback((catalogId: string): CourseWithSchedule | null => {
    const catalog = allCatalogs.find(c => c.id === catalogId);
    if (!catalog) return null;
    
    const lecturerCourse = lecturerCourses.find(lc => lc.catalogId === catalogId);
    
    return {
      ...catalog,
      days: lecturerCourse?.days,
      startTime: lecturerCourse?.startTime,
      endTime: lecturerCourse?.endTime,
      location: lecturerCourse?.location
    };
  }, [allCatalogs, lecturerCourses]);

  // Get all courses with schedule for display
  const getAllCoursesWithSchedule = useCallback((): CourseWithSchedule[] => {
    return allCatalogs.map(catalog => {
      const lecturerCourse = lecturerCourses.find(lc => lc.catalogId === catalog.id);
      return {
        ...catalog,
        days: lecturerCourse?.days,
        startTime: lecturerCourse?.startTime,
        endTime: lecturerCourse?.endTime,
        location: lecturerCourse?.location
      };
    });
  }, [allCatalogs, lecturerCourses]);

  // Get student's enrolled courses with schedule
  const getMyCoursesWithSchedule = useCallback((): CourseWithSchedule[] => {
    const myCatalogIds = new Set(myEnrollments.map(e => e.catalogId));
    return allCatalogs
      .filter(c => myCatalogIds.has(c.id))
      .map(catalog => {
        const lecturerCourse = lecturerCourses.find(lc => lc.catalogId === catalog.id);
        return {
          ...catalog,
          days: lecturerCourse?.days,
          startTime: lecturerCourse?.startTime,
          endTime: lecturerCourse?.endTime,
          location: lecturerCourse?.location
        };
      });
  }, [allCatalogs, lecturerCourses, myEnrollments]);

  // Get available courses (not enrolled) with schedule
  const getAvailableCoursesWithSchedule = useCallback((): CourseWithSchedule[] => {
    const enrolledCatalogIds = new Set(myEnrollments.map(e => e.catalogId));
    return allCatalogs
      .filter(c => !enrolledCatalogIds.has(c.id))
      .map(catalog => {
        const lecturerCourse = lecturerCourses.find(lc => lc.catalogId === catalog.id);
        return {
          ...catalog,
          days: lecturerCourse?.days,
          startTime: lecturerCourse?.startTime,
          endTime: lecturerCourse?.endTime,
          location: lecturerCourse?.location
        };
      });
  }, [allCatalogs, lecturerCourses, myEnrollments]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadCatalogs();
      await loadLecturerCourses();
      await loadMyEnrollments();
      setLoading(false);
    };
    load();
  }, [loadCatalogs, loadLecturerCourses, loadMyEnrollments]);

  return {
    // Data
    allCatalogs,
    lecturerCourses,
    myEnrollments,
    loading,
    
    // Computed lists with schedule
    availableCourses: getAvailableCoursesWithSchedule(),
    myCourses: getMyCoursesWithSchedule(),
    allCoursesWithSchedule: getAllCoursesWithSchedule(),
    
    // Actions
    createStudentCourse,
    enrollInCourse,
    dropCourse,
    claimCourse,
    findOrCreateCatalog,
    getCourseWithSchedule,
    
    // Refresh
    refresh: () => {
      loadCatalogs();
      loadLecturerCourses();
      loadMyEnrollments();
    }
  };
}