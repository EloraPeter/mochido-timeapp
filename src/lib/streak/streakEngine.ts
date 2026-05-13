// lib/streak/streakEngine.ts

import { StreakData, getStreakData, recordLogin, recordTaskCompletion } from './streakStore';
import { getCurrentUserId } from '@/lib/auth/pinAuth';

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  perfectWeeks: number;
  streakStatus: 'on_fire' | 'warming_up' | 'cold' | 'broken';
  daysUntilMilestone: number;
  nextMilestone: number;
}

export function getStreakStatus(streak: number): StreakStats['streakStatus'] {
  if (streak >= 7) return 'on_fire';
  if (streak >= 3) return 'warming_up';
  if (streak > 0) return 'cold';
  return 'broken';
}

export function getNextMilestone(currentStreak: number): number {
  const milestones = [3, 7, 14, 30, 60, 100];
  const next = milestones.find(m => m > currentStreak);
  return next || currentStreak + 30;
}

export async function getCurrentUserStreak(): Promise<StreakStats | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  const streakData = await getStreakData(userId);
  if (!streakData) return null;
  
  const nextMilestone = getNextMilestone(streakData.currentStreak);
  
  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    perfectWeeks: streakData.perfectWeeks,
    streakStatus: getStreakStatus(streakData.currentStreak),
    daysUntilMilestone: nextMilestone - streakData.currentStreak,
    nextMilestone
  };
}

export async function updateLoginStreak(): Promise<StreakStats | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  await recordLogin(userId);
  return getCurrentUserStreak();
}

export async function updateCompletionStreak(completedOnTime: boolean): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  
  await recordTaskCompletion(userId, completedOnTime);
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '🔥👑🔥';
  if (streak >= 30) return '🔥🔥🔥';
  if (streak >= 14) return '🔥🔥';
  if (streak >= 7) return '🔥';
  if (streak >= 3) return '💪';
  if (streak >= 1) return '🌱';
  return '💀';
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your streak today! 🌱";
  if (streak < 3) return `${streak} day${streak === 1 ? '' : 's'}! Keep going! 🌱`;
  if (streak < 7) return `${streak} days! You're warming up! 💪`;
  if (streak < 14) return `${streak} days on fire! 🔥`;
  if (streak < 30) return `${streak} days! UNSTOPPABLE! 🔥🔥`;
  return `${streak} days! ABSOLUTE LEGEND! 👑🔥`;
}