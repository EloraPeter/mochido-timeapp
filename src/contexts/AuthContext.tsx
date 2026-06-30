'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/db/schema';
import { getCurrentUser, logout as logoutUser } from '@/lib/auth/pinAuth';
import { startReminderScheduler } from '@/lib/notifications/reminderScheduler';
import { processNotificationQueue, cleanupOldNotifications } from '@/lib/notifications/notificationQueue';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  // Deadline reminders: decide which tasks need a reminder right now and
  // queue them (every 15 min), then separately flush the queue into actual
  // browser notifications (every 1 min so queued reminders fire promptly).
  // Both are safe to run even without notification permission granted yet -
  // sendNotification() internally checks Notification.permission and is a
  // no-op until the user opts in via the EnableNotifications prompt.
  useEffect(() => {
    if (!user) return;

    const reminderInterval = startReminderScheduler(15);

    processNotificationQueue().catch(console.error);
    const queueInterval = setInterval(() => {
      processNotificationQueue().catch(console.error);
    }, 60 * 1000);

    cleanupOldNotifications().catch(console.error);

    return () => {
      clearInterval(reminderInterval);
      clearInterval(queueInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}