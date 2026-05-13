// hooks/useMochiMood.ts

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import { getStreakData } from '@/lib/streak/streakStore';
import { getItems } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { Task } from '@/lib/db/schema';
import { calculateMochiMood, MochiState, getGuiltLevel, shouldSendGuiltNotification, startSession, endSession } from '@/lib/mochi/mochiMoodEngine';
import { MochiExpression } from '@/components/mochi/hamsterExpressions';
import { getGuiltMessage } from '@/lib/mochi/mochiGuiltMessages';
import { queueNotification } from '@/lib/notifications/notificationQueue';

export function useMochiMood() {
  const [mood, setMood] = useState<MochiExpression>('NEUTRAL');
  const [guiltMessage, setGuiltMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastGuiltSentAt, setLastGuiltSentAt] = useState<Date | null>(null);
  
  // Track session for bounce detection
  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, []);
  
  const calculateMood = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Get streak data
      const streakData = await getStreakData(userId);
      
      // Get all tasks
      const allTasks = await getItems<Task>(STORES.tasks, 'userId', userId);
      const tasks = allTasks || [];
      
      // Calculate metrics
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      
      const completedTasks = tasks.filter(t => t.isDone);
      const overdueTasks = tasks.filter(t => !t.isDone && new Date(t.dueDate) < now);
      const onTimeTasks = completedTasks.filter(t => !t.completedLate);
      
      const onTimeRate = completedTasks.length > 0 
        ? (onTimeTasks.length / completedTasks.length) * 100 
        : 100;
      
      // Tasks completed today
      const tasksCompletedToday = tasks.filter(t => {
        if (!t.isDone) return false;
        const completedDate = t.completedAt?.split('T')[0];
        return completedDate === todayStr;
      }).length;
      
      // Urgent tasks (due within 24h, not done)
      const urgentTasks = tasks.filter(t => {
        if (t.isDone) return false;
        const hoursLeft = (new Date(t.dueDate).getTime() - now.getTime()) / (1000 * 3600);
        return hoursLeft <= 24 && hoursLeft > 0;
      });
      
      // Due within 24h count
      const dueWithin24h = urgentTasks.length;
      
      // Check for perfect week (tasks completed each day this week)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      
      const tasksThisWeek = tasks.filter(t => {
        const completedDate = t.completedAt ? new Date(t.completedAt) : null;
        return completedDate && completedDate >= weekStart && t.isDone;
      });
      
      const daysWithCompletions = new Set(
        tasksThisWeek.map(t => t.completedAt?.split('T')[0])
      );
      const perfectWeek = daysWithCompletions.size >= 7;
      
      // Check if first login of day
      const lastLoginDate = streakData?.lastLoginDate;
      const isFirstLoginOfDay = lastLoginDate !== todayStr;
      
      // Get notification count from localStorage
      const notificationCount = parseInt(localStorage.getItem('mochi_notification_count') || '0');
      
      // Build behavior data matching BehaviorData interface
      const behaviorData = {
        streakDays: streakData?.currentStreak || 0,
        overdueCount: overdueTasks.length,
        onTimeRate,
        lastLoginAt: streakData?.lastLoginDate ? new Date(streakData.lastLoginDate) : new Date(),
        tasksCompletedToday,
        perfectWeek,
        urgentCount: urgentTasks.length,
        dueWithin24h,
        currentHour,
        isFirstLoginOfDay,
        notificationCount
      };
      
      // Calculate mood
      const newMood = calculateMochiMood(behaviorData);
      setMood(newMood);
      
      // Check if we should send a guilt notification
      const guiltLevel = getGuiltLevel(newMood);
      if (guiltLevel && shouldSendGuiltNotification({ 
        mood: newMood, 
        guiltLevel,
        lastGuiltMessageAt: lastGuiltSentAt?.toISOString() || null,
        lastLoginAt: streakData?.lastLoginDate || new Date().toISOString(),
        streakDays: streakData?.currentStreak || 0,
        overdueCount: overdueTasks.length,
        onTimeRate
      })) {
        const daysSinceLastLogin = Math.floor(
          (new Date().getTime() - (streakData?.lastLoginDate ? new Date(streakData.lastLoginDate).getTime() : new Date().getTime())) 
          / (1000 * 3600 * 24)
        );
        
        const guiltMsg = getGuiltMessage(guiltLevel, daysSinceLastLogin);
        setGuiltMessage(guiltMsg.message);
        setLastGuiltSentAt(new Date());
        
        // Queue notification
        await queueNotification({
          title: `Mochi ${guiltMsg.level === 'passive_aggressive' ? '😒' : '😢'}`,
          body: guiltMsg.notificationText,
          scheduledFor: new Date().toISOString(),
          priority: 'medium',
          tag: 'mochi-guilt',
          data: { type: 'mochi-guilt', mood: newMood }
        });
      } else {
        setGuiltMessage(null);
      }
      
    } catch (error) {
      console.error('Failed to calculate Mochi mood:', error);
    } finally {
      setLoading(false);
    }
  }, [lastGuiltSentAt]);
  
  useEffect(() => {
    calculateMood();
    
    // Recalculate every hour
    const interval = setInterval(calculateMood, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [calculateMood]);
  
  const dismissGuiltMessage = useCallback(() => {
    setGuiltMessage(null);
  }, []);
  
  return {
    mood,
    guiltMessage,
    loading,
    dismissGuiltMessage,
    refreshMood: calculateMood
  };
}