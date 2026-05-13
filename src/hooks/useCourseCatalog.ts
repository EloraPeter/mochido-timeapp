// import { useEffect, useState, useCallback } from 'react';
// import { getItems, addItem, updateItem, deleteItem } from '@/lib/db/indexedDB';
// import { STORES } from '@/lib/db/schema';
// import { getCurrentUserId, getCurrentUserRole } from '@/lib/auth/pinAuth';
// import type { Course } from '@/lib/db/schema';

// export function useCourseCatalog() {
//   const [allCourses, setAllCourses] = useState<Course[]>([]);
//   const [loading, setLoading] = useState(true);
  
//   const userId = getCurrentUserId();
//   const userRole = getCurrentUserRole();
  
//   // Load all courses
//   const loadAllCourses = useCallback(async () => {
//     const courses = await getItems<Course>(STORES.courses);
//     setAllCourses(courses);
//     return courses;
//   }, []);
  
//   // Get courses the student can enroll in (master courses not enrolled yet)
//   const getAvailableCourses = useCallback(() => {
//     if (!userId || userRole !== 'student') return [];
    
//     // For now, return all master courses (isMaster === true)
//     // Enrollment check will be added later
//     return allCourses.filter(course => course.isMaster === true);
//   }, [allCourses, userId, userRole]);
  
//   // Get student's personally created courses
//   const getMyCreatedCourses = useCallback(() => {
//     if (!userId) return [];
//     return allCourses.filter(course => 
//       course.userId === userId && course.isMaster === false
//     );
//   }, [allCourses, userId]);
  
//   // Get enrolled master courses (to be implemented with enrollments)
//   const getMyEnrolledCourses = useCallback(() => {
//     return allCourses.filter(course => course.isMaster === true);
//   }, [allCourses]);
  
//   // Get ALL student's courses (created + enrolled)
//   const getMyAllCourses = useCallback(() => {
//     const created = getMyCreatedCourses();
//     const enrolled = getMyEnrolledCourses();
//     return [...created, ...enrolled];
//   }, [getMyCreatedCourses, getMyEnrolledCourses]);
  
//   // Student creates a course
//   const createStudentCourse = useCallback(async (courseData: Omit<Course, 'id' | 'userId' | 'isMaster'>) => {
//     if (!userId) throw new Error('Not logged in');
    
//     const newCourse: Course = {
//       ...courseData,
//       id: crypto.randomUUID(),
//       userId: userId,
//       isMaster: false,
//     };
    
//     await addItem(STORES.courses, newCourse);
//     await loadAllCourses();
//     return newCourse;
//   }, [userId, loadAllCourses]);
  
//   // Student updates their own course
//   const updateStudentCourse = useCallback(async (courseId: string, updates: Partial<Course>) => {
//     const course = allCourses.find(c => c.id === courseId);
//     if (!course || course.userId !== userId) {
//       throw new Error('Can only update your own courses');
//     }
//     await updateItem(STORES.courses, courseId, updates);
//     await loadAllCourses();
//   }, [userId, allCourses, loadAllCourses]);
  
//   // Delete student's own course
//   const deleteStudentCourse = useCallback(async (courseId: string) => {
//     const course = allCourses.find(c => c.id === courseId);
//     if (!course || course.userId !== userId) {
//       throw new Error('Can only delete your own courses');
//     }
//     await deleteItem(STORES.courses, courseId);
//     await loadAllCourses();
//   }, [userId, allCourses, loadAllCourses]);
  
//   // Lecturer creates master course
//   const createMasterCourse = useCallback(async (courseData: Omit<Course, 'id' | 'userId' | 'isMaster'>) => {
//     if (!userId || userRole !== 'lecturer') throw new Error('Only lecturers can create master courses');
    
//     const newCourse: Course = {
//       ...courseData,
//       id: crypto.randomUUID(),
//       userId: userId,
//       isMaster: true,
//     };
    
//     await addItem(STORES.courses, newCourse);
//     await loadAllCourses();
//     return newCourse;
//   }, [userId, userRole, loadAllCourses]);
  
//   // Delete master course (lecturer only)
//   const deleteMasterCourse = useCallback(async (courseId: string) => {
//     const course = allCourses.find(c => c.id === courseId);
//     if (!course || course.userId !== userId) {
//       throw new Error('Can only delete your own courses');
//     }
//     await deleteItem(STORES.courses, courseId);
//     await loadAllCourses();
//   }, [userId, allCourses, loadAllCourses]);
  
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       await loadAllCourses();
//       setLoading(false);
//     };
//     load();
//   }, [loadAllCourses]);
  
//   return {
//     allCourses,
//     availableCourses: getAvailableCourses(),
//     myCreatedCourses: getMyCreatedCourses(),
//     myEnrolledCourses: getMyEnrolledCourses(),
//     myAllCourses: getMyAllCourses(),
//     loading,
//     createStudentCourse,
//     updateStudentCourse,
//     deleteStudentCourse,
//     createMasterCourse,
//     deleteMasterCourse,
//     refreshCatalog: loadAllCourses
//   };
// }