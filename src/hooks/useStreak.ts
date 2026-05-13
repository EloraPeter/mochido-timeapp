// hooks/useStreak.ts

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUserStreak, updateLoginStreak, StreakStats, getStreakEmoji, getStreakMessage } from '@/lib/streak/streakEngine';

export function useStreak() {
  const [streak, setStreak] = useState<StreakStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadStreak = useCallback(async () => {
    setLoading(true);
    const data = await getCurrentUserStreak();
    setStreak(data);
    setLoading(false);
  }, []);
  
  const recordLogin = useCallback(async () => {
    const updated = await updateLoginStreak();
    setStreak(updated);
    return updated;
  }, []);
  
  useEffect(() => {
    loadStreak();
  }, [loadStreak]);
  
  return {
    streak,
    loading,
    recordLogin,
    refreshStreak: loadStreak,
    getStreakEmoji: () => streak ? getStreakEmoji(streak.currentStreak) : '🌱',
    getStreakMessage: () => streak ? getStreakMessage(streak.currentStreak) : 'Start your streak today!',
    isOnFire: streak?.streakStatus === 'on_fire',
    daysUntilMilestone: streak?.daysUntilMilestone || 0
  };
}