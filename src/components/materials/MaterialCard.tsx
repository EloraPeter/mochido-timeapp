'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Presentation,
  Link as LinkIcon,
  BookOpen,
  Megaphone,
  File,
  Video,
  Download,
  ExternalLink,
  Pin,
  PinOff,
  Trash2,
  Edit,
  Loader2,
  Lock,
} from 'lucide-react';
import type { MaterialWithUrl } from '@/hooks/useCourseMaterials';
import type { MaterialType } from '@/lib/db/schema';

interface MaterialCardProps {
  material: MaterialWithUrl;
  isLecturer: boolean;
  onResolveUrl: (id: string) => Promise<string | null>;
  onTogglePin?: (id: string) => Promise<void>;
  onEdit?: (material: MaterialWithUrl) => void;
  onDelete?: (id: string) => Promise<void>;
}

const TYPE_META: Record<MaterialType, { icon: React.ElementType; label: string; color: string }> = {
  announcement: { icon: Megaphone, label: 'Announcement', color: 'text-amber-500' },
  syllabus:     { icon: BookOpen,  label: 'Syllabus',     color: 'text-teal-500'  },
  pdf:          { icon: FileText,  label: 'PDF',          color: 'text-red-500'   },
  slides:       { icon: Presentation, label: 'Slides',   color: 'text-blue-500'  },
  video:        { icon: Video,     label: 'Video',        color: 'text-pink-500'  },
  link:         { icon: LinkIcon,  label: 'Link',         color: 'text-purple-500'},
  document:     { icon: File,      label: 'Document',     color: 'text-gray-500'  },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialCard({
  material,
  isLecturer,
  onResolveUrl,
  onTogglePin,
  onEdit,
  onDelete,
}: MaterialCardProps) {
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = TYPE_META[material.type];
  const Icon = meta.icon;

  const handleOpen = async () => {
    if (material.type === 'link' && material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!material.storagePath) return;

    setResolving(true);
    try {
      const url = await onResolveUrl(material.id);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not load file — you may be offline. Try again when connected.');
      }
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(material.id);
    } finally {
      setDeleting(false);
    }
  };

  const isClickable = material.type === 'link' || !!material.storagePath;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`
        bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700
        shadow-sm overflow-hidden
        ${material.isPinned ? 'border-l-4 border-l-amber-400' : ''}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={`mt-0.5 flex-shrink-0 ${meta.color}`}>
            <Icon size={20} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                {material.title}
              </span>
              {material.isPinned && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  Pinned
                </span>
              )}
              {material.module && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                  {material.module}
                </span>
              )}
            </div>

            {material.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {material.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{meta.label}</span>
              {material.fileName && <span>{material.fileName}</span>}
              {material.fileSize && <span>{formatFileSize(material.fileSize)}</span>}
              {material.url && material.type === 'link' && (
                <span className="truncate max-w-[160px]">{material.url}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Open/Download */}
            {isClickable && (
              <button
                onClick={handleOpen}
                disabled={resolving}
                className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
                title={material.type === 'link' ? 'Open link' : 'Download'}
              >
                {resolving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : material.type === 'link' ? (
                  <ExternalLink size={16} />
                ) : (
                  <Download size={16} />
                )}
              </button>
            )}

            {/* Lecturer-only actions */}
            {isLecturer && (
              <>
                {onTogglePin && (
                  <button
                    onClick={() => onTogglePin(material.id)}
                    className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                    title={material.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {material.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(material)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </>
            )}

            {/* Offline indicator for file-based materials */}
            {!isClickable && material.type !== 'announcement' && (
              <div className="p-1.5 text-gray-300 dark:text-gray-600" title="No file attached">
                <Lock size={16} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}