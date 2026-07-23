'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, adminAuthority, isInstitutionAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!isLoading && user) {
      if (pathname.includes('/admin')) {
        // Admin authority loads asynchronously (best-effort, after user is
        // set) - wait for it to resolve rather than redirecting away on
        // the initial null/loading state, which would false-negative
        // bounce a legitimate admin before their authority check lands.
        if (adminAuthority !== null && !isInstitutionAdmin) {
          router.push(`/dashboard/${user.role}`);
        }
        return;
      }

      // Role-based route protection for student/lecturer paths - unchanged.
      let expectedRole: string | null = null;
      if (pathname.includes('/student')) {
        expectedRole = 'student';
      } else if (pathname.includes('/lecturer')) {
        expectedRole = 'lecturer';
      }
      
      if (expectedRole && user.role !== expectedRole) {
        const correctPath = `/dashboard/${user.role}`;
        router.push(correctPath);
      }
    }
  }, [isAuthenticated, isLoading, router, pathname, user, adminAuthority, isInstitutionAdmin]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}