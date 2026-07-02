// Database configuration
export const DB_NAME = 'mochido_db';
export const DB_VERSION = 5; // v5: adds materials store

export const STORES = {
  users: 'users',
  courseCatalog: 'courseCatalog',
  lecturerCourses: 'lecturerCourses',
  enrollments: 'enrollments',
  tasks: 'tasks',
  routines: 'routines',
  streaks: 'streaks',
  notificationQueue: 'notificationQueue',
  materials: 'materials',             // v5: course materials & announcements
};

// ========== DATA MODELS ==========

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'student' | 'lecturer';
  createdAt: Date;
  title?: 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'Prof.';
}

// Entity 1: Global Course Identity (what the course IS)
export interface CourseCatalog {
  id: string;
  courseCode: string;        // e.g., CSC101 (UPPERCASE, trimmed)
  title: string;
  description?: string;
  createdBy: string;         // User ID who created it (student or lecturer)
  isVerified: boolean;       // true when lecturer claims it
  lecturerId?: string;       // ID of lecturer who claimed it
  schoolId?: string;
  createdAt: string;
}

// Entity 2: Lecturer Course (how the course is TAUGHT) - HAS SCHEDULE
export interface LecturerCourse {
  id: string;
  catalogId: string;         // Links to CourseCatalog
  lecturerId: string;
  capacity?: number;
  days: string[];            // MOVED HERE from CourseCatalog
  startTime: string;         // MOVED HERE from CourseCatalog
  endTime: string;           // MOVED HERE from CourseCatalog
  location?: string;         // MOVED HERE from CourseCatalog
  currentSemester?: string;
  academicYear?: string;
  createdAt: string;
}

// Entity 3: Enrollment (links student to course)
export interface Enrollment {
  id: string;
  studentId: string;
  catalogId: string;          // Links to CourseCatalog
  lecturerCourseId?: string;  // Links to LecturerCourse (if available)
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: string;
  completedAt?: string;
}

// Task remains the same but links to catalogId
export interface Task {
  id: string;
  title: string;
  dueDate: string;
  catalogId: string;          // Changed from courseId to catalogId
  lecturerCourseId?: string;  // Optional: specific offering
  userId: string;
  isDone: boolean;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'completed' | 'overdue';
  urgencyScore?: number;
  reminderMinutes: number[];
  lastNotifiedAt?: string;
  completedLate?: boolean;
  maxScore?: number;
}

export interface Routine {
  id: string;
  title: string;
  durationMinutes: number;
  scheduleType: 'daily' | 'weekly' | 'once';
  onceDate?: string;
  days?: string[];
  affectsWakeUp: boolean;
  userId: string;
  createdAt: string;
}

// Add StreakData interface:
export interface StreakData {
  id: string; // userId
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  lastCompletionDate: string | null;
  weeklyCompletions: number[];
  perfectWeeks: number;
  lastUpdatedAt: string;
}


// ========== COURSE MATERIALS (v5) ==========

export type MaterialType =
  | 'announcement'
  | 'syllabus'
  | 'pdf'
  | 'slides'
  | 'link'
  | 'document';

export interface CourseMaterial {
  id: string;
  catalogId: string;           // which course this belongs to
  lecturerCourseId?: string;   // which offering (optional - materials can be catalog-level)
  type: MaterialType;
  title: string;
  description?: string;
  // For 'link' type: external URL entered by lecturer
  url?: string;
  // For file types (pdf, slides, document, syllabus):
  // path within the Supabase Storage 'course-materials' bucket
  storagePath?: string;
  fileName?: string;           // original file name shown to students
  fileSize?: number;           // bytes, shown to students
  mimeType?: string;
  // Organisation
  isPinned: boolean;           // pinned items (usually announcements) shown first
  module?: string;             // optional grouping label e.g. "Week 3", "Module 2"
  // Metadata
  createdBy: string;           // lecturerId
  createdAt: string;
  updatedAt: string;
}
