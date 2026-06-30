// components/MobileSidebar.tsx
// Mobile-First Redesign: Fixed active states, better touch targets, smooth animations

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  Calendar,
  CheckSquare,
  Clock,
  Settings,
  LogOut,
  BookOpen,
  Compass,
  GraduationCap,
  Sun,
  Moon,
  User,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  exactMatch?: boolean;
}

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Check dark mode on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDarkMode(!isDarkMode);
  };

  // Improved active state detection
  const isActive = (item: NavItem) => {
    if (item.exactMatch) {
      return pathname === item.href;
    }
    // Handle query params (like ?tab=browse)
    const pathWithoutQuery = pathname?.split('?')[0];
    const itemPathWithoutQuery = item.href.split('?')[0];
    return pathWithoutQuery === itemPathWithoutQuery || pathWithoutQuery?.startsWith(itemPathWithoutQuery + '/');
  };

  // Navigation items based on role with fixed active states
  const getNavItems = (): NavItem[] => {
    if (user?.role === 'student') {
      return [
        { href: '/dashboard/student', label: 'Dashboard', icon: <Home size={20} />, exactMatch: true },
        { href: '/dashboard/student/courses', label: 'My Courses', icon: <GraduationCap size={20} /> },
        { href: '/dashboard/student/assignments', label: 'Assignments', icon: <CheckSquare size={20} /> },
        { href: '/dashboard/student/tasks', label: 'Tasks', icon: <Calendar size={20} /> },
        { href: '/dashboard/student/routines', label: 'Routines', icon: <Clock size={20} /> },
        { href: '/dashboard/student/courses?tab=browse', label: 'Discover', icon: <Compass size={20} /> },
        { href: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} /> },
      ];
    }
    return [
      { href: '/dashboard/lecturer', label: 'Dashboard', icon: <Home size={20} />, exactMatch: true },
      { href: '/dashboard/lecturer/courses', label: 'My Courses', icon: <BookOpen size={20} /> },
      { href: '/dashboard/lecturer/assignments', label: 'Assignments', icon: <CheckSquare size={20} /> },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} /> },
    ];
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Larger tap target */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-1 z-50 p-2.5 bg-white-50 dark:bg-gray-800 rounded-xl shadow-md active:scale-95 transition-transform md:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} className="text-gray-700 dark:text-gray-300" />
      </button>

      {/* Overlay with blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Enhanced with fixed active states */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden flex flex-col"
          >
            {/* Header with Gradient */}
            <div className="relative overflow-hidden bg-linear-to-br from-blue-500 via-blue-600 to-purple-600 p-5 shrink-0">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white" />
              </div>
              
              <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="text-3xl animate-bounce">🐹</div>
                  <div>
                    <span className="font-bold text-xl text-white">MochiDo</span>
                    <p className="text-xs text-white/80">Academic Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-2 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              
              <div className="relative mt-4 pt-3 border-t border-white/20">
                <p className="text-xs text-white/70">Welcome back,</p>
                <p className="font-semibold text-white text-lg truncate">{user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90 capitalize">
                    {user?.role}
                  </div>
                  {user?.title && (
                    <div className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90 truncate max-w-30">
                      {user.title}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation - Fixed active states */}
            <nav className="flex-1 py-3 overflow-y-auto">
              <div className="px-5 mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Main Menu
                </p>
              </div>
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 mx-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`${active ? 'text-blue-500' : 'text-gray-400'} transition-colors`}>
                      {item.icon}
                    </div>
                    <span className="font-medium flex-1 text-sm">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <motion.div
                        layoutId="active-sidebar-indicator"
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              <div className="px-5 mt-6 mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Preferences
                </p>
              </div>

              {/* Dark Mode Toggle - Fixed active state */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 mx-3 px-4 py-3 rounded-xl w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]"
              >
                {isDarkMode ? (
                  <>
                    <div className="p-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Sun size={18} className="text-yellow-500" />
                    </div>
                    <span className="font-medium text-sm">Light Mode</span>
                  </>
                ) : (
                  <>
                    <div className="p-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <Moon size={18} className="text-indigo-500" />
                    </div>
                    <span className="font-medium text-sm">Dark Mode</span>
                  </>
                )}
              </button>

              {/* Help link */}
              <Link
                href="/help"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 mx-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]"
              >
                <HelpCircle size={20} className="text-gray-400" />
                <span className="font-medium text-sm">Help & Support</span>
              </Link>
            </nav>

            {/* Footer - Fixed */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3 shrink-0">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98] group"
              >
                <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Logout</span>
              </button>
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] text-gray-400">Version 2.0.0</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs animate-pulse">🐹</span>
                  <span className="text-[10px] text-gray-400">MochiDo</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}