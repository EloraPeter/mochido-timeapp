'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/db/schema';
import { getCurrentUser, logout as logoutUser, getMyAdminAuthority, PIN_UNLOCK_GRACE_PERIOD_MS } from '@/lib/auth/pinAuth';
import { getSupabaseSession } from '@/lib/supabase/auth';
import type { AdminAuthority } from '@/lib/supabase/auth';
import { startReminderScheduler } from '@/lib/notifications/reminderScheduler';
import { processNotificationQueue, cleanupOldNotifications } from '@/lib/notifications/notificationQueue';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  adminAuthority: AdminAuthority | null;
  isInstitutionAdmin: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminAuthority, setAdminAuthority] = useState<AdminAuthority | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setAdminAuthority(null);
        return;
      }

      // Milestone 1 offline-first fix: don't hard-require a LIVE Supabase
      // session on every app load (page refresh, reopening the PWA,
      // etc.) - that has the exact same offline-breaking failure mode as
      // the PIN unlock bug (verifyLocalPin in pinAuth.ts). Use the same
      // local grace period instead; only fall back to requiring a live
      // check once that window has actually expired.
      const lastVerified = currentUser.lastVerifiedAt ? new Date(currentUser.lastVerifiedAt).getTime() : 0;
      const withinGracePeriod = Date.now() - lastVerified < PIN_UNLOCK_GRACE_PERIOD_MS;

      if (!withinGracePeriod) {
        const session = await getSupabaseSession();
        if (!session) {
          await logoutUser();
          setUser(null);
          setAdminAuthority(null);
          return;
        }
      }

      setUser(currentUser);

      // Best-effort, non-blocking - administrative authority is only
      // needed to decide whether to show an "Admin Console" entry point
      // somewhere in the UI, not to gate anything security-sensitive
      // (RLS is the real enforcement). Never block app load on this.
      getMyAdminAuthority()
        .then(setAdminAuthority)
        .catch(() => setAdminAuthority({ isPlatformAdmin: false, institutionAdminOf: [] }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      setAdminAuthority(null);
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
    getMyAdminAuthority()
      .then(setAdminAuthority)
      .catch(() => setAdminAuthority({ isPlatformAdmin: false, institutionAdminOf: [] }));
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setAdminAuthority(null);
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
    adminAuthority,
    isInstitutionAdmin: !!adminAuthority && adminAuthority.institutionAdminOf.length > 0,
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
