import { Metadata, Viewport } from 'next';
import TasksClient from './TasksClient';

export const metadata: Metadata = {
  title: 'My Tasks - MochiDo',
  description: 'Manage your tasks and assignments',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function TasksPage() {
  return <TasksClient />;
}