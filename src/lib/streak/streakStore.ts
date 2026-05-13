// lib/streak/streakStore.ts

import { getDB } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';

export interface StreakData {
  id: string; // userId
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
  lastCompletionDate: string | null;
  weeklyCompletions: number[]; // Last 7 days completion counts
  perfectWeeks: number;
  lastUpdatedAt: string;
}

export interface DailyActivity {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  loggedIn: boolean;
}

// Get streak data for a user
export async function getStreakData(userId: string): Promise<StreakData | null> {
  const db = await getDB();
  try {
    const data = await db.get(STORES.streaks, userId);
    return data || null;
  } catch {
    return null;
  }
}

// Create or update streak data
export async function updateStreakData(
  userId: string, 
  data: Partial<StreakData>
): Promise<StreakData> {
  const db = await getDB();
  const existing = await getStreakData(userId);
  
  const streakData: StreakData = {
    id: userId,
    currentStreak: existing?.currentStreak || 0,
    longestStreak: existing?.longestStreak || 0,
    lastLoginDate: existing?.lastLoginDate || new Date().toISOString().split('T')[0],
    lastCompletionDate: existing?.lastCompletionDate || null,
    weeklyCompletions: existing?.weeklyCompletions || [0, 0, 0, 0, 0, 0, 0],
    perfectWeeks: existing?.perfectWeeks || 0,
    lastUpdatedAt: new Date().toISOString(),
    ...data
  };
  
  await db.put(STORES.streaks, streakData);
  return streakData;
}

// Record daily login and update streak
export async function recordLogin(userId: string): Promise<StreakData> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await getStreakData(userId);
  
  let newStreak = 1;
  let longestStreak = existing?.longestStreak || 0;
  
  if (existing) {
    const lastLogin = existing.lastLoginDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastLogin === yesterdayStr) {
      // Consecutive day
      newStreak = existing.currentStreak + 1;
      longestStreak = Math.max(longestStreak, newStreak);
    } else if (lastLogin === today) {
      // Already logged in today
      newStreak = existing.currentStreak;
      longestStreak = existing.longestStreak;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }
  
  return updateStreakData(userId, {
    currentStreak: newStreak,
    longestStreak: longestStreak,
    lastLoginDate: today,
    lastUpdatedAt: new Date().toISOString()
  });
}

// Record task completion for streak
export async function recordTaskCompletion(
  userId: string, 
  completedOnTime: boolean
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await getStreakData(userId);
  
  if (!existing) return;
  
  // Update weekly completions
  const dayOfWeek = new Date().getDay(); // 0 = Sunday
  const weeklyCompletions = [...existing.weeklyCompletions];
  weeklyCompletions[dayOfWeek] = (weeklyCompletions[dayOfWeek] || 0) + 1;
  
  // Check for perfect week (all 7 days have ≥1 completion)
  const isPerfectWeek = weeklyCompletions.every(count => count >= 1);
  let perfectWeeks = existing.perfectWeeks;
  
  if (isPerfectWeek && weeklyCompletions !== existing.weeklyCompletions) {
    perfectWeeks++;
  }
  
  await updateStreakData(userId, {
    weeklyCompletions,
    perfectWeeks,
    lastCompletionDate: today,
    lastUpdatedAt: new Date().toISOString()
  });
}

// Add streaks store to database schema
export async function ensureStreaksStore() {
  const db = await getDB();
  if (!db.objectStoreNames.contains(STORES.streaks)) {
    // This will be handled in next DB version upgrade
    console.log('Streaks store needs to be added in next DB version');
  }
}