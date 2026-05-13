// lib/backup/backupTypes.ts

import { getCurrentUserId } from '@/lib/auth/pinAuth';
import { getDB, getItems } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getStreakData } from '@/lib/streak/streakStore';
import type { CourseCatalog, Enrollment, Task, Routine } from '@/lib/db/schema';

export interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  deviceName: string;
  data: {
    courses: CourseCatalog[];
    enrollments: Enrollment[];
    tasks: Task[];
    routines: Routine[];
    streaks: any;
    userSettings: {
      darkMode: boolean;
      notificationEnabled: boolean;
      reminderTime: string;
    };
  };
}

export const CURRENT_BACKUP_VERSION = 1;

export async function exportBackupData(): Promise<BackupData> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const [courses, enrollments, tasks, routines, streakData] = await Promise.all([
    getItems<CourseCatalog>(STORES.courseCatalog),
    getItems<Enrollment>(STORES.enrollments, 'studentId', userId),
    getItems<Task>(STORES.tasks, 'userId', userId),
    getItems<Routine>(STORES.routines, 'userId', userId),
    getStreakData(userId),
  ]);

  const userSettings = {
    darkMode: localStorage.getItem('theme') === 'dark',
    notificationEnabled: Notification.permission === 'granted',
    reminderTime: localStorage.getItem('reminderTime') || '09:00',
  };

  return {
    version: CURRENT_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    deviceName: navigator.platform || 'Unknown Device',
    data: {
      courses: courses || [],
      enrollments: enrollments || [],
      tasks: tasks || [],
      routines: routines || [],
      streaks: streakData,
      userSettings,
    },
  };
}

export async function importBackupData(backupData: BackupData): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  if (backupData.version !== CURRENT_BACKUP_VERSION) {
    throw new Error(`Backup version mismatch. Expected ${CURRENT_BACKUP_VERSION}, got ${backupData.version}`);
  }

  const db = await getDB();
  const tx = db.transaction(
    [STORES.courseCatalog, STORES.enrollments, STORES.tasks, STORES.routines],
    'readwrite'
  );

  // Clear existing user data
  const existingTasks = await tx.objectStore(STORES.tasks).index('userId').getAll(userId);
  for (const task of existingTasks) {
    await tx.objectStore(STORES.tasks).delete(task.id);
  }

  const existingRoutines = await tx.objectStore(STORES.routines).index('userId').getAll(userId);
  for (const routine of existingRoutines) {
    await tx.objectStore(STORES.routines).delete(routine.id);
  }

  const existingEnrollments = await tx.objectStore(STORES.enrollments).index('studentId').getAll(userId);
  for (const enrollment of existingEnrollments) {
    await tx.objectStore(STORES.enrollments).delete(enrollment.id);
  }

  // Import new data
  for (const course of backupData.data.courses) {
    await tx.objectStore(STORES.courseCatalog).put(course);
  }

  for (const enrollment of backupData.data.enrollments) {
    await tx.objectStore(STORES.enrollments).put(enrollment);
  }

  for (const task of backupData.data.tasks) {
    await tx.objectStore(STORES.tasks).put(task);
  }

  for (const routine of backupData.data.routines) {
    await tx.objectStore(STORES.routines).put(routine);
  }

  await tx.done;

  // Import streak data if exists
  if (backupData.data.streaks) {
    const { updateStreakData } = await import('@/lib/streak/streakStore');
    await updateStreakData(userId, backupData.data.streaks);
  }

  // Import settings
  if (backupData.data.userSettings.darkMode) {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  } else {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('reminderTime', backupData.data.userSettings.reminderTime);

  return true;
}