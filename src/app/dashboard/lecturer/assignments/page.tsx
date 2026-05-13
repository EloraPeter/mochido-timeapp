import { Metadata, Viewport } from 'next';
import LecturerAssignmentsClient from './LecturerAssignmentsClient';

export const metadata: Metadata = {
  title: 'Manage Assignments - MochiDo',
  description: 'Create and manage course assignments',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function LecturerAssignmentsPage() {
  return <LecturerAssignmentsClient />;
}