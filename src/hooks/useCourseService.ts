import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, getItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId, getCurrentUserRole } from '@/lib/auth/pinAuth';
import type { CourseCatalog, LecturerCourse, Enrollment, CourseMaterial, MaterialType } from '@/lib/db/schema';
import type { ParsedCourse } from '@/lib/import/importShared';
import { groupSchedules } from '@/lib/import/importShared';

export interface ImportSummary {
  imported: string[];
  skipped: { code: string; reason: string }[];
}

function mapImportedMaterialType(raw: string): MaterialType {
  const t = raw.trim().toLowerCase();
  if (t === 'pdf') return 'pdf';
  if (t === 'video') return 'video';
  if (t === 'slides' || t === 'slide' || t === 'ppt' || t === 'pptx') return 'slides';
  if (t === 'document' || t === 'doc' || t === 'docx') return 'document';
  if (t === 'syllabus') return 'syllabus';
  return 'link';
}

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

  // Bulk-import courses parsed from an XML file or pasted XML text.
  // Each course becomes a new, already-verified CourseCatalog entry
  // (import = the lecturer vouching for it) plus a LecturerCourse offering
  // with no schedule set yet, plus any materials listed for it. Courses
  // whose code already exists in the catalog are skipped rather than
  // overwritten, since a code collision usually means the course already
  // has real schedule/verification data attached.
  const importCourses = useCallback(async (parsed: ParsedCourse[]): Promise<ImportSummary> => {
    if (!userId) throw new Error('Not logged in');

    const summary: ImportSummary = { imported: [], skipped: [] };
    const existingCodes = new Set(allCatalogs.map(c => c.courseCode));

    for (const course of parsed) {
      if (existingCodes.has(course.code)) {
        summary.skipped.push({
          code: course.code,
          reason: 'A course with this code already exists - skipped to avoid overwriting it.'
        });
        continue;
      }

      // Defensive: the parsers should already reject schedule-less courses
      // during preview, but Mochido is a reminder app - never create a
      // course with no timetable data.
      if (!course.schedules || course.schedules.length === 0) {
        summary.skipped.push({
          code: course.code,
          reason: 'No schedule data - skipped so it wouldn\'t create a reminder-less course.'
        });
        continue;
      }

      const now = new Date().toISOString();

      const catalog: CourseCatalog = {
        id: crypto.randomUUID(),
        courseCode: course.code,
        title: course.title,
        description: course.description,
        createdBy: userId,
        isVerified: true,
        lecturerId: userId,
        department: course.department,
        faculty: course.faculty,
        level: course.level,
        semester: course.semester,
        units: course.units,
        createdAt: now
      };
      await addItem(STORES.courseCatalog, catalog);

      // Each merged (days, startTime, endTime, location) group becomes its
      // own LecturerCourse row, sharing this catalogId - identical to what
      // manually adding the same course twice (e.g. a lecture slot and a
      // separate lab slot) would produce.
      const scheduleGroups = groupSchedules(course.schedules);
      const lecturerCourseIds: string[] = [];

      for (const group of scheduleGroups) {
        const lecturerCourseData: LecturerCourse = {
          id: crypto.randomUUID(),
          catalogId: catalog.id,
          lecturerId: userId,
          days: group.days,
          startTime: group.startTime,
          endTime: group.endTime,
          location: group.location,
          currentSemester: course.semester,
          createdAt: now
        };
        await addItem(STORES.lecturerCourses, lecturerCourseData);
        lecturerCourseIds.push(lecturerCourseData.id);
      }

      // Materials (XML-only) attach to the first session/offering.
      for (const material of course.materials) {
        const materialRecord: CourseMaterial = {
          id: crypto.randomUUID(),
          catalogId: catalog.id,
          lecturerCourseId: lecturerCourseIds[0],
          type: mapImportedMaterialType(material.type),
          title: material.title,
          url: material.url,
          isPinned: false,
          createdBy: userId,
          createdAt: now,
          updatedAt: now
        };
        await addItem(STORES.materials, materialRecord);
      }

      existingCodes.add(course.code); // guard duplicates within the same batch
      summary.imported.push(course.code);
    }

    await loadCatalogs();
    await loadLecturerCourses();

    return summary;
  }, [userId, allCatalogs, loadCatalogs, loadLecturerCourses]);

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
    importCourses,
    
    // Refresh
    refresh: () => {
      loadCatalogs();
      loadLecturerCourses();
      loadMyEnrollments();
    }
  };
}