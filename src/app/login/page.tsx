import { Metadata, Viewport } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login - MochiDo',
  description: 'Login to your MochiDo account',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function LoginPage() {
  return <LoginClient />;
}