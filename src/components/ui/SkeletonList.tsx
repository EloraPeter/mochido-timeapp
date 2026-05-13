// components/ui/SkeletonList.tsx
'use client';

import { SkeletonCard } from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  variant?: 'default' | 'course' | 'task';
}

export function SkeletonList({ count = 3, variant = 'default' }: SkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}