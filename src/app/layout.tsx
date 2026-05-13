import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext'; // ADD THIS
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'; // ADD THIS

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MochiDo - Academic Time Management',
  description: 'Smart academic time management system with Mochi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MochiDo',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <AlertProvider>
            {children}
            <ServiceWorkerRegister /> 
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}