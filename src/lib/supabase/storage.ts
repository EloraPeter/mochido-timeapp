import { supabase } from './client';

const BUCKET = 'course-materials';

// Signed URL expires after 1 hour. Students always fetch a fresh one when
// they open the materials page rather than caching stale URLs.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export interface UploadResult {
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload a file to Supabase Storage.
 * Path format: {catalogId}/{materialId}/{originalFileName}
 * This keeps each material's file isolated so deleting one never affects others.
 */
export async function uploadMaterialFile(
  file: File,
  catalogId: string,
  materialId: string
): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${catalogId}/${materialId}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return {
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Generate a temporary signed URL for a stored file.
 * Call this each time a student opens the materials page.
 * Returns null if the file doesn't exist or Supabase is unreachable.
 */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn(`Could not generate signed URL for ${storagePath}:`, error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage when a lecturer removes a material.
 * Fails silently if the file is already gone (idempotent).
 */
export async function deleteMaterialFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    // Log but don't throw — the IndexedDB record deletion still proceeds.
    // A dangling storage file is less harmful than leaving a broken DB record.
    console.warn(`Storage delete failed for ${storagePath}:`, error.message);
  }
}
