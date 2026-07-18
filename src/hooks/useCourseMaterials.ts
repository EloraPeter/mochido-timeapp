'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import type { CourseMaterial, MaterialType } from '@/lib/db/schema';
import { uploadMaterialFile, deleteMaterialFile, getSignedUrl } from '@/lib/supabase/storage';
import { getCurrentUserId } from '@/lib/auth/pinAuth';

export interface MaterialWithUrl extends CourseMaterial {
  // Resolved at render time via getSignedUrl(). Null means offline or not yet loaded.
  resolvedUrl: string | null;
}

export type CreateMaterialInput = {
  catalogId: string;
  lecturerCourseId?: string;
  type: MaterialType;
  title: string;
  description?: string;
  module?: string;
  isPinned?: boolean;
  // Mutually exclusive: either a file or an external URL
  file?: File;
  url?: string;
};

export function useCourseMaterials(catalogId: string | null) {
  const [materials, setMaterials] = useState<MaterialWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const userId = getCurrentUserId();

  const loadMaterials = useCallback(async () => {
    if (!catalogId) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    try {
      const raw = await getItems<CourseMaterial>(STORES.materials, 'catalogId', catalogId);

      // Sort: pinned first, then by createdAt descending
      const sorted = [...raw].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Attach resolvedUrl: null for now — components call resolveUrl() lazily
      // so we don't make N Supabase requests just to list materials
      const withUrls: MaterialWithUrl[] = sorted.map(m => ({ ...m, resolvedUrl: null }));
      setMaterials(withUrls);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  /**
   * Resolve a signed URL for a specific material.
   * Called lazily when a student taps "Download" or "View".
   * Updates just that one entry in state so the rest aren't re-rendered.
   */
  const resolveUrl = useCallback(async (materialId: string): Promise<string | null> => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return null;

    // Link types already have their URL stored directly
    if (material.type === 'link' && material.url) {
      return material.url;
    }

    if (!material.storagePath) return null;

    // If already resolved in this session, return the cached value
    if (material.resolvedUrl) return material.resolvedUrl;

    const url = await getSignedUrl(material.storagePath);
    if (url) {
      setMaterials(prev =>
        prev.map(m => m.id === materialId ? { ...m, resolvedUrl: url } : m)
      );
    }
    return url;
  }, [materials]);

  /**
   * Add a new material. Handles both file uploads and link-type materials.
   * Always writes to IndexedDB first, then uploads to Supabase if there's a file.
   * If the upload fails, the IndexedDB record is removed to keep data consistent.
   */
  const addMaterial = useCallback(async (input: CreateMaterialInput): Promise<void> => {
    if (!userId) throw new Error('Not logged in');

    setUploading(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      let storagePath: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let mimeType: string | undefined;

      // Write the IndexedDB record first (offline-first).
      // storagePath is set before or after upload depending on type.
      if (input.file) {
        // Reserve the storage path now so it's consistent with the materialId
        const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `${input.catalogId}/${id}/${safeName}`;
        fileName = input.file.name;
        fileSize = input.file.size;
        mimeType = input.file.type;
      }

      const newMaterial: CourseMaterial = {
        id,
        catalogId: input.catalogId,
        lecturerCourseId: input.lecturerCourseId,
        type: input.type,
        title: input.title,
        description: input.description,
        url: input.url,
        storagePath,
        fileName,
        fileSize,
        mimeType,
        isPinned: input.isPinned ?? false,
        module: input.module,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await addItem(STORES.materials, newMaterial);

      // Now upload the actual file bytes. If this fails, clean up the DB record.
      if (input.file) {
        try {
          await uploadMaterialFile(input.file, input.catalogId, id);
        } catch (uploadErr) {
          // Upload failed — remove the DB record so it's not left in a broken state
          await deleteItem(STORES.materials, id);
          throw uploadErr;
        }
      }

      await loadMaterials();
    } finally {
      setUploading(false);
    }
  }, [userId, loadMaterials]);

  /**
   * Update a material's metadata (title, description, module, isPinned).
   * Does not re-upload files — file replacement requires delete + re-add.
   */
  const updateMaterial = useCallback(async (
    id: string,
    updates: Partial<Pick<CourseMaterial, 'title' | 'description' | 'module' | 'isPinned' | 'url'>>
  ): Promise<void> => {
    await updateItem<CourseMaterial>(STORES.materials, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await loadMaterials();
  }, [loadMaterials]);

  /**
   * Delete a material and its associated file from Supabase Storage.
   * Storage deletion is best-effort (see deleteMaterialFile).
   */
  const deleteMaterial = useCallback(async (id: string): Promise<void> => {
    const material = materials.find(m => m.id === id);
    if (!material) return;

    // Delete from IndexedDB first so the UI responds immediately
    await deleteItem(STORES.materials, id);

    // Then attempt to clean up storage (non-blocking, fails silently)
    if (material.storagePath) {
      deleteMaterialFile(material.storagePath).catch(console.warn);
    }

    await loadMaterials();
  }, [materials, loadMaterials]);

  /**
   * Toggle pinned status — pinned materials (usually announcements) sort first.
   */
  const togglePin = useCallback(async (id: string): Promise<void> => {
    const material = materials.find(m => m.id === id);
    if (!material) return;
    await updateMaterial(id, { isPinned: !material.isPinned });
  }, [materials, updateMaterial]);

  // Convenience computed views
  const announcements = materials.filter(m => m.type === 'announcement');
  const pinnedAnnouncements = announcements.filter(m => m.isPinned);
  const syllabus = materials.find(m => m.type === 'syllabus');
  const filesMaterials = materials.filter(m =>
    m.type === 'pdf' || m.type === 'slides' || m.type === 'document'
  );
  const links = materials.filter(m => m.type === 'link');

  // Unique module names in insertion order
  const modules = [...new Set(
    materials.filter(m => m.module).map(m => m.module!)
  )];

  return {
    materials,
    announcements,
    pinnedAnnouncements,
    syllabus,
    filesMaterials,
    links,
    modules,
    loading,
    uploading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    togglePin,
    resolveUrl,
    refresh: loadMaterials,
  };
}
