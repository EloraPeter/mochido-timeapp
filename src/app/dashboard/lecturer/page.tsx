import { Metadata, Viewport } from 'next';
import LecturerDashboardClient from './LecturerDashboardClient';

export const metadata: Metadata = {
  title: 'Lecturer Dashboard - MochiDo',
  description: 'Manage your courses and assignments',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function LecturerDashboardPage() {
  return <LecturerDashboardClient />;
}