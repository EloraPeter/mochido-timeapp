import { Metadata, Viewport } from 'next';
import StudentAssignmentsClient from './StudentAssignmentsClient';

export const metadata: Metadata = {
  title: 'My Assignments - MochiDo',
  description: 'View and track your assignments',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function StudentAssignmentsPage() {
  return <StudentAssignmentsClient />;
}