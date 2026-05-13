'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/pinAuth';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    if (isAuthenticated()) {
      // Check role and redirect appropriately
      const role = localStorage.getItem('mochi_user_role');
      if (role === 'student') {
        router.push('/dashboard/student');
      } else if (role === 'lecturer') {
        router.push('/dashboard/lecturer');
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🐹</div>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}