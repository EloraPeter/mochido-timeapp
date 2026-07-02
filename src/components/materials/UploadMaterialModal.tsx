'use client';

import { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Megaphone, BookOpen, Loader2 } from 'lucide-react';
import type { MaterialType } from '@/lib/db/schema';
import type { MaterialWithUrl } from '@/hooks/useCourseMaterials';

interface UploadMaterialModalProps {
  catalogId: string;
  lecturerCourseId?: string;
  onSave: (input: {
    catalogId: string;
    lecturerCourseId?: string;
    type: MaterialType;
    title: string;
    description?: string;
    module?: string;
    isPinned?: boolean;
    file?: File;
    url?: string;
  }) => Promise<void>;
  onClose: () => void;
  editingMaterial?: MaterialWithUrl | null;
  onUpdate?: (id: string, updates: Partial<{ title: string; description: string; module: string; isPinned: boolean; url: string }>) => Promise<void>;
  uploading: boolean;
}

type InputMode = 'file' | 'link' | 'announcement';

const FILE_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'pdf', label: 'PDF' },
  { value: 'slides', label: 'Slides' },
  { value: 'document', label: 'Document' },
];

export default function UploadMaterialModal({
  catalogId,
  lecturerCourseId,
  onSave,
  onClose,
  editingMaterial,
  onUpdate,
  uploading,
}: UploadMaterialModalProps) {
  const isEditing = !!editingMaterial;

  const [mode, setMode] = useState<InputMode>(() => {
    if (!editingMaterial) return 'file';
    if (editingMaterial.type === 'announcement') return 'announcement';
    if (editingMaterial.type === 'link') return 'link';
    return 'file';
  });

  const [fileType, setFileType] = useState<MaterialType>(
    editingMaterial?.type && editingMaterial.type !== 'announcement' && editingMaterial.type !== 'link'
      ? editingMaterial.type
      : 'pdf'
  );
  const [title, setTitle] = useState(editingMaterial?.title ?? '');
  const [description, setDescription] = useState(editingMaterial?.description ?? '');
  const [url, setUrl] = useState(editingMaterial?.url ?? '');
  const [module, setModule] = useState(editingMaterial?.module ?? '');
  const [isPinned, setIsPinned] = useState(editingMaterial?.isPinned ?? false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolvedType: MaterialType =
    mode === 'announcement' ? 'announcement'
    : mode === 'link' ? 'link'
    : fileType;

  const handleSubmit = async () => {
    if (!title.trim()) return;

    if (isEditing && onUpdate && editingMaterial) {
      await onUpdate(editingMaterial.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        module: module.trim() || undefined,
        isPinned,
        url: url.trim() || undefined,
      });
    } else {
      if (mode === 'file' && !selectedFile) return;
      if (mode === 'link' && !url.trim()) return;

      await onSave({
        catalogId,
        lecturerCourseId,
        type: resolvedType,
        title: title.trim(),
        description: description.trim() || undefined,
        module: module.trim() || undefined,
        isPinned,
        file: selectedFile ?? undefined,
        url: mode === 'link' ? url.trim() : undefined,
      });
    }
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const canSubmit =
    title.trim() &&
    (isEditing ||
      (mode === 'file' && !!selectedFile) ||
      (mode === 'link' && !!url.trim()) ||
      mode === 'announcement'
    );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Material' : 'Add Material'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode tabs — only shown when creating */}
          {!isEditing && (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {([
                { key: 'file', label: 'File', Icon: Upload },
                { key: 'link', label: 'Link', Icon: LinkIcon },
                { key: 'announcement', label: 'Announcement', Icon: Megaphone },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
                    mode === key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* File type selector */}
          {mode === 'file' && !isEditing && (
            <div className="flex gap-2 flex-wrap">
              {FILE_TYPES.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => setFileType(ft.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    fileType === ft.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          )}

          {/* File drop zone */}
          {mode === 'file' && !isEditing && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
              {selectedFile ? (
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Drop a file here or tap to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, PPTX, DOCX, images</p>
                </div>
              )}
            </div>
          )}

          {/* URL input */}
          {mode === 'link' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                mode === 'announcement' ? 'e.g. Mid-semester exam date changed'
                : mode === 'link' ? 'e.g. Lecture recording — Week 4'
                : 'e.g. Week 3 Lecture Slides'
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={mode === 'announcement' ? 'Full announcement text...' : 'Optional context for students...'}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Module */}
          {mode !== 'announcement' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Module / Section (optional)
              </label>
              <input
                type="text"
                value={module}
                onChange={e => setModule(e.target.value)}
                placeholder="e.g. Week 3, Module 2, Midterm"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Pin toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPinned(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isPinned ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isPinned ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Pin to top
              {mode === 'announcement' && ' (recommended for announcements)'}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || uploading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === 'file' ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              isEditing ? 'Save Changes' : (mode === 'file' ? 'Upload' : 'Post')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
