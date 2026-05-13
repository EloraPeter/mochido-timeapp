// app/dashboard/student/layout.tsx

'use client';

import { ReactNode } from 'react';
import EnableNotifications from '@/components/EnableNotifications';
import InstallPWA from '@/components/InstallPWA';
import { MochiProvider } from '@/components/mochi/MochiProvider';

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <MochiProvider>
      <div className="relative">
        {/* Fixed bottom bar for notifications/install */}
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 pointer-events-none">
          <div className="max-w-4xl mx-auto flex justify-between gap-2 pointer-events-auto">
            <EnableNotifications />
            <InstallPWA />
          </div>
        </div>
        {children}
      </div>
    </MochiProvider>
  );
}