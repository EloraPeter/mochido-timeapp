'use client';

import { Megaphone } from 'lucide-react';
import type { CourseMaterial } from '@/lib/db/schema';
import { format } from 'date-fns';

interface AnnouncementBannerProps {
  announcements: CourseMaterial[];
}

export default function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map(a => (
        <div
          key={a.id}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Megaphone size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                  {a.title}
                </p>
                <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
                  {format(new Date(a.createdAt), 'MMM d')}
                </span>
              </div>
              {a.description && (
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 whitespace-pre-line">
                  {a.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
