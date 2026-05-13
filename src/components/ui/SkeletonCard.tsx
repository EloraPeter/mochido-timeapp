// components/ui/SkeletonCard.tsx
'use client';

import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  variant?: 'default' | 'stats' | 'course' | 'task';
}

export function SkeletonCard({ className, variant = 'default' }: SkeletonCardProps) {
  if (variant === 'stats') {
    return (
      <div className={cn('bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm animate-pulse', className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
      </div>
    );
  }

  if (variant === 'course') {
    return (
      <div className={cn('bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm animate-pulse', className)}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="w-1/3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="w-2/3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'task') {
    return (
      <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700 animate-pulse', className)}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse', className)}>
      <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="space-y-3">
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-4/6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}