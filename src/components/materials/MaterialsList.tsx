'use client';

import { AnimatePresence } from 'framer-motion';
import MaterialCard from './MaterialCard';
import type { MaterialWithUrl } from '@/hooks/useCourseMaterials';

interface MaterialsListProps {
  materials: MaterialWithUrl[];
  isLecturer: boolean;
  onResolveUrl: (id: string) => Promise<string | null>;
  onTogglePin?: (id: string) => Promise<void>;
  onEdit?: (material: MaterialWithUrl) => void;
  onDelete?: (id: string) => Promise<void>;
  emptyMessage?: string;
}

export default function MaterialsList({
  materials,
  isLecturer,
  onResolveUrl,
  onTogglePin,
  onEdit,
  onDelete,
  emptyMessage = 'No materials posted yet.',
}: MaterialsListProps) {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  // Group by module, with ungrouped items at the end under "General"
  const grouped: Record<string, MaterialWithUrl[]> = {};
  const ungrouped: MaterialWithUrl[] = [];

  for (const m of materials) {
    if (m.module) {
      if (!grouped[m.module]) grouped[m.module] = [];
      grouped[m.module].push(m);
    } else {
      ungrouped.push(m);
    }
  }

  const hasModules = Object.keys(grouped).length > 0;

  return (
    <div className="space-y-4">
      {/* Grouped sections */}
      {Object.entries(grouped).map(([module, items]) => (
        <section key={module}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
            {module}
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {items.map(m => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  isLecturer={isLecturer}
                  onResolveUrl={onResolveUrl}
                  onTogglePin={onTogglePin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}

      {/* Ungrouped items */}
      {ungrouped.length > 0 && (
        <section>
          {hasModules && (
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
              General
            </h3>
          )}
          <div className="space-y-2">
            <AnimatePresence>
              {ungrouped.map(m => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  isLecturer={isLecturer}
                  onResolveUrl={onResolveUrl}
                  onTogglePin={onTogglePin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}
