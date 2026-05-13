import { Metadata, Viewport } from 'next';
import RoutineManager from '@/components/RoutineManager';

export const metadata: Metadata = {
  title: 'My Routines - MochiDo',
  description: 'Manage your daily routines and habits',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function RoutinesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <RoutineManager />
      </div>
    </div>
  );
}