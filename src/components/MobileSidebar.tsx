// components/MobileSidebar.tsx (Enhanced)
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
  Search,
  Compass,
  GraduationCap,
  Sun,
  Moon,
  Bell,
  User,
  Sparkles
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
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

  // Navigation items based on role
  const getNavItems = (): NavItem[] => {
    if (user?.role === 'student') {
      return [
        { href: '/dashboard/student', label: 'Dashboard', icon: <Home size={20} /> },
        { href: '/dashboard/student/courses', label: 'My Courses', icon: <GraduationCap size={20} /> },
        { href: '/dashboard/student/assignments', label: 'Assignments', icon: <CheckSquare size={20} /> },
        { href: '/dashboard/student/tasks', label: 'Tasks', icon: <Calendar size={20} /> },
        { href: '/dashboard/student/routines', label: 'Routines', icon: <Clock size={20} /> },
        { href: '/dashboard/student/courses?tab=browse', label: 'Discover', icon: <Compass size={20} /> },
        { href: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} /> },
      ];
    }
    return [
      { href: '/dashboard/lecturer', label: 'Dashboard', icon: <Home size={20} /> },
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
      {/* Hamburger Button - Improved */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg md:hidden active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-700 dark:text-gray-300" />
      </button>

      {/* Overlay with blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Enhanced */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden flex flex-col"
          >
            {/* Header with Mochi */}
            <div className="relative overflow-hidden bg-linear-to-r from-blue-500 to-purple-600 p-6">
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
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              
              <div className="relative mt-4 pt-2 border-t border-white/20">
                <p className="text-xs text-white/70">Welcome back,</p>
                <p className="font-semibold text-white text-lg">{user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90 capitalize">
                    {user?.role}
                  </div>
                  {user?.title && (
                    <div className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90">
                      {user.title}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
              <div className="px-4 mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Main Menu
                </p>
              </div>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 mx-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                      {item.icon}
                    </div>
                    <span className="font-medium flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      />
                    )}
                  </Link>
                );
              })}

              <div className="px-4 mt-6 mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Preferences
                </p>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 mx-3 px-4 py-3 rounded-xl w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {isDarkMode ? (
                  <>
                    <Sun size={20} className="text-yellow-500" />
                    <span className="font-medium">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon size={20} className="text-indigo-500" />
                    <span className="font-medium">Dark Mode</span>
                  </>
                )}
              </button>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
              >
                <LogOut size={20} className="group-hover:scale-110 transition" />
                <span className="font-medium">Logout</span>
              </button>
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-gray-400">Version 1.0.0</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs">🐹</span>
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