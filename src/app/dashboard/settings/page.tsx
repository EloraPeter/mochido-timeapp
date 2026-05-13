import { Metadata, Viewport } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings - MochiDo',
  description: 'Manage your account and app preferences',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function SettingsPage() {
  return <SettingsClient />;
}