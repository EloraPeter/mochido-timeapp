import { Metadata, Viewport } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Register - MochiDo',
  description: 'Create your MochiDo account',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function RegisterPage() {
  return <RegisterClient />;
}