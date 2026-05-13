import { Metadata, Viewport } from 'next';
import StudentDashboardClient from './StudentDashboardClient';

export const metadata: Metadata = {
  title: 'Student Dashboard - MochiDo',
  description: 'Manage your classes, tasks, and routines',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function StudentDashboardPage() {
  return <StudentDashboardClient />;
}