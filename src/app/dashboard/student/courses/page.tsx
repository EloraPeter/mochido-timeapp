// app/dashboard/student/courses/page.tsx
import { Metadata, Viewport } from 'next';
import CoursesClient from './CoursesClient';

export const metadata: Metadata = {
  title: 'Courses - MochiDo',
  description: 'Manage your enrolled courses and discover new ones',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function CoursesPage() {
  return <CoursesClient />;
}