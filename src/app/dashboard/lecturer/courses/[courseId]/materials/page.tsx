'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, BookOpen } from 'lucide-react';
import { useCourseMaterials } from '@/hooks/useCourseMaterials';
import { useCourseService } from '@/hooks/useCourseService';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import AnnouncementBanner from '@/components/materials/AnnouncementBanner';
import MaterialsList from '@/components/materials/MaterialsList';
import UploadMaterialModal from '@/components/materials/UploadMaterialModal';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import type { MaterialWithUrl } from '@/hooks/useCourseMaterials';

export default function LecturerMaterialsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { confirm, error: showError } = useCustomAlert();

  const { getCourseWithSchedule } = useCourseService();
  const course = getCourseWithSchedule(courseId);

  const {
    materials,
    pinnedAnnouncements,
    loading,
    uploading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    togglePin,
    resolveUrl,
  } = useCourseMaterials(course?.id ?? null);

  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialWithUrl | null>(null);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('Delete this material? This cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteMaterial(id);
    } catch {
      showError('Failed to delete material.');
    }
  };

  const handleEdit = (material: MaterialWithUrl) => {
    setEditingMaterial(material);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Course not found.</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-blue-500 text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <MobileSidebar />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-500 flex-shrink-0" />
            <h1 className="font-bold text-gray-900 dark:text-white truncate">
              {course.courseCode} — Materials
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{course.title}</p>
        </div>
        <button
          onClick={() => { setEditingMaterial(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Pinned announcements */}
        {pinnedAnnouncements.length > 0 && (
          <AnnouncementBanner announcements={pinnedAnnouncements} />
        )}

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {materials.length} {materials.length === 1 ? 'item' : 'items'} posted
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Full materials list */}
        {!loading && (
          <MaterialsList
            materials={materials}
            isLecturer={true}
            onResolveUrl={resolveUrl}
            onTogglePin={togglePin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No materials yet. Tap Add to post your first item."
          />
        )}
      </div>

      {/* Upload modal */}
      {showModal && (
        <UploadMaterialModal
          catalogId={course.id}
          lecturerCourseId={courseId}
          onSave={addMaterial}
          onClose={handleCloseModal}
          editingMaterial={editingMaterial}
          onUpdate={updateMaterial}
          uploading={uploading}
        />
      )}

      <BottomTabBar />
    </div>
  );
}
