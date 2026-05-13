// components/BottomTabBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
    Home,
    BookOpen,
    CheckSquare,
    Clock,
    User,
    Calendar,
    FileText
} from 'lucide-react';

interface TabItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

export default function BottomTabBar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const getTabs = (): TabItem[] => {
        // Update the student tabs in BottomTabBar.tsx
        if (user?.role === 'student') {
            return [
                { href: '/dashboard/student', label: 'Home', icon: <Home size={20} /> },
                { href: '/dashboard/student/courses', label: 'Courses', icon: <BookOpen size={20} /> }, // Changed from 'classes'
                { href: '/dashboard/student/tasks', label: 'Tasks', icon: <CheckSquare size={20} /> },
                { href: '/dashboard/student/routines', label: 'Routines', icon: <Clock size={20} /> },
            ];
        }
        return [
            { href: '/dashboard/lecturer', label: 'Home', icon: <Home size={20} /> },
            { href: '/dashboard/lecturer/courses', label: 'Courses', icon: <BookOpen size={20} /> },
            { href: '/dashboard/lecturer/assignments', label: 'Assignments', icon: <FileText size={20} /> },
            { href: '/dashboard/settings', label: 'Profile', icon: <User size={20} /> },
        ];
    };

    const tabs = getTabs();
    const isActive = (href: string) => pathname === href || pathname?.startsWith(href);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex justify-around items-center px-2 py-2">
                    {tabs.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className="relative flex flex-col items-center justify-center min-w-16 py-1"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                                        }`}
                                >
                                    {tab.icon}
                                    <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
                                </motion.div>
                                {active && (
                                    <motion.div
                                        layoutId="bottom-tab"
                                        className="absolute -top-2 w-8 h-0.5 bg-blue-500 rounded-full"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}