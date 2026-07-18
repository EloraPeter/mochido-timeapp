'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useCourseMaterials } from '@/hooks/useCourseMaterials';
import { useCourseService } from '@/hooks/useCourseService';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import AnnouncementBanner from '@/components/materials/AnnouncementBanner';
import MaterialsList from '@/components/materials/MaterialsList';

export default function StudentMaterialsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const { getCourseWithSchedule } = useCourseService();
  // courseId here is the catalogId (passed from the courses list)
  const course = getCourseWithSchedule(courseId);

  const {
    materials,
    pinnedAnnouncements,
    loading,
    resolveUrl,
  } = useCourseMaterials(courseId ?? null);

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Course not found.</p>
          <button onClick={() => router.back()} className="mt-3 text-blue-500 text-sm">
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
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Pinned announcements always at top */}
        {pinnedAnnouncements.length > 0 && (
          <AnnouncementBanner announcements={pinnedAnnouncements} />
        )}

        {!loading && materials.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {materials.length} {materials.length === 1 ? 'item' : 'items'}
          </p>
        )}

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

        {!loading && (
          <MaterialsList
            materials={materials}
            isLecturer={false}
            onResolveUrl={resolveUrl}
            emptyMessage="No materials posted for this course yet."
          />
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
