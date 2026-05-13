// lib/mochi/mochiMoodEngine.ts

import { MochiExpression } from '@/components/mochi/hamsterExpressions';
import { GuiltLevel } from './mochiGuiltMessages';

export interface MochiState {
  mood: MochiExpression;
  guiltLevel: GuiltLevel | null;
  lastGuiltMessageAt: string | null;
  lastLoginAt: string;
  streakDays: number;
  overdueCount: number;
  onTimeRate: number;
}

export interface BehaviorData {
  streakDays: number;
  overdueCount: number;
  onTimeRate: number;
  lastLoginAt: Date;
  tasksCompletedToday: number;
  perfectWeek: boolean;
  urgentCount: number;           // NEW
  dueWithin24h: number;          // NEW
  currentHour: number;           // NEW
  isFirstLoginOfDay: boolean;    // NEW
  notificationCount: number;     // NEW
  sessionDuration?: number;      // NEW (seconds)
  bounceCount?: number;          // NEW (times opened & closed quickly)
}

// Track session data (store in memory or localStorage)
let sessionStartTime: Date | null = null;
let bounceCount = 0;

export function startSession(): void {
  sessionStartTime = new Date();
}

export function endSession(): void {
  if (sessionStartTime) {
    const duration = (new Date().getTime() - sessionStartTime.getTime()) / 1000;
    if (duration < 30) {
      bounceCount++;
      localStorage.setItem('mochi_bounce_count', bounceCount.toString());
    }
    sessionStartTime = null;
  }
}

export function getBounceCount(): number {
  const saved = localStorage.getItem('mochi_bounce_count');
  return saved ? parseInt(saved) : 0;
}

export function resetBounceCount(): void {
  bounceCount = 0;
  localStorage.setItem('mochi_bounce_count', '0');
}

export function calculateMochiMood(data: BehaviorData): MochiExpression {
  const daysSinceLastLogin = Math.floor(
    (new Date().getTime() - data.lastLoginAt.getTime()) / (1000 * 3600 * 24)
  );
  
  // ========== TIME-BASED EXPRESSIONS ==========
  
  // WAKING: First login of the day (morning)
  if (data.isFirstLoginOfDay && data.currentHour <= 9) {
    return 'WAKING';
  }
  
  // SLEEPY: Late night, no activity (10 PM - 6 AM)
  if ((data.currentHour >= 22 || data.currentHour <= 6) && data.tasksCompletedToday === 0) {
    return 'SLEEPY';
  }
  
  // CRAMMING: Late night studying (11 PM - 3 AM with activity)
  if ((data.currentHour >= 23 || data.currentHour <= 3) && data.tasksCompletedToday > 0) {
    return 'CRAMMING';
  }
  
  // EARLY_BIRD: Completed tasks before 10 AM
  if (data.tasksCompletedToday > 0 && data.currentHour < 10) {
    return 'EARLY_BIRD';
  }
  
  // ========== STRESS & PRESSURE EXPRESSIONS ==========
  
  // STRESSED: High urgency pressure
  if (data.urgentCount >= 5 || data.dueWithin24h >= 3) {
    return 'STRESSED';
  }
  
  // ========== NEGATIVE BEHAVIOR EXPRESSIONS ==========
  
  // GASLIGHT: Opened app and closed quickly (bounce)
  const bounceCount = getBounceCount();
  if (bounceCount >= 2) {
    resetBounceCount();
    return 'GASLIGHT';
  }
  
  // IGNORED: Long absence after many notifications
  if (daysSinceLastLogin >= 3 && data.notificationCount >= 5) {
    return 'IGNORED';
  }
  
  // PASSIVE_AGGRESSIVE: Ignoring recent notifications
  if (data.notificationCount >= 3 && daysSinceLastLogin < 1) {
    return 'PASSIVE_AGGRESSIVE';
  }
  
  // DESPERATE: Severe overdue OR very long absence
  if (daysSinceLastLogin >= 5 || data.overdueCount >= 7) {
    return 'DESPERATE';
  }
  
  // DISAPPOINTED: Moderate issues
  if (daysSinceLastLogin >= 2 || data.overdueCount >= 3) {
    return 'DISAPPOINTED';
  }
  
  // CONCERNED: Minor issues
  if (daysSinceLastLogin >= 1 || data.overdueCount >= 1 || data.onTimeRate < 50) {
    return 'CONCERNED';
  }
  
  // ========== POSITIVE REINFORCEMENT ==========
  
  // MILESTONE (PROUD): Streak milestone reached
  const isMilestone = [7, 14, 30, 60, 100].includes(data.streakDays);
  if (isMilestone && data.overdueCount === 0) {
    return 'MILESTONE';
  }
  
  // CELEBRATING: Perfect week OR all tasks completed
  if (data.perfectWeek || (data.tasksCompletedToday > 0 && data.overdueCount === 0 && data.onTimeRate === 100)) {
    return 'CELEBRATING';
  }
  
  // ENCOURAGING: Struggling but still trying
  if (data.streakDays === 0 && data.overdueCount < 3 && daysSinceLastLogin < 1) {
    return 'ENCOURAGING';
  }
  
  // HAPPY: Good performance
  if (data.streakDays >= 3 && data.onTimeRate >= 60) {
    return 'HAPPY';
  }
  
  // PROUD: High streak, excellent performance (but not milestone)
  if (data.streakDays >= 7 && data.onTimeRate >= 80 && data.overdueCount === 0) {
    return 'PROUD';
  }
  
  // PASSIVE_AGGRESSIVE: Low streak with overdue (special case)
  if (data.streakDays === 0 && data.overdueCount > 0 && daysSinceLastLogin < 1) {
    return 'PASSIVE_AGGRESSIVE';
  }
  
  // NEUTRAL: Default fallback
  if (data.streakDays >= 1) {
    return 'NEUTRAL';
  }
  
  return 'NEUTRAL';
}

export function getGuiltLevel(mood: MochiExpression): GuiltLevel | null {
  switch (mood) {
    case 'CONCERNED':
      return 'concerned';
    case 'DISAPPOINTED':
      return 'disappointed';
    case 'DESPERATE':
      return 'desperate';
    case 'PASSIVE_AGGRESSIVE':
    case 'GASLIGHT':
    case 'IGNORED':
      return 'passive_aggressive';
    default:
      return null;
  }
}

export function shouldSendGuiltNotification(mochiState: MochiState): boolean {
  // Don't spam - wait at least 12 hours between guilt trips
  if (mochiState.lastGuiltMessageAt) {
    const lastGuilt = new Date(mochiState.lastGuiltMessageAt);
    const hoursSince = (new Date().getTime() - lastGuilt.getTime()) / (1000 * 3600);
    if (hoursSince < 12) return false;
  }
  
  // Send guilt notifications for negative moods
  const guiltMoods: MochiExpression[] = [
    'CONCERNED', 'DISAPPOINTED', 'DESPERATE', 
    'PASSIVE_AGGRESSIVE', 'GASLIGHT', 'IGNORED', 'STRESSED'
  ];
  return guiltMoods.includes(mochiState.mood);
}