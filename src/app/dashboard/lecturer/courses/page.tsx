import { Metadata, Viewport } from 'next';
import LecturerCoursesClient from './LecturerCoursesClient';

export const metadata: Metadata = {
  title: 'Manage Courses - MochiDo',
  description: 'Create and manage your courses',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function LecturerCoursesPage() {
  return <LecturerCoursesClient />;
}