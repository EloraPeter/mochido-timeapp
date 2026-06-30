// components/BottomTabBar.tsx
// Mobile-First Redesign: Larger tap targets, fixed active states, haptic feedback

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
    FileText,
    GraduationCap
} from 'lucide-react';

interface TabItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    exactMatch?: boolean;
}

export default function BottomTabBar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const getTabs = (): TabItem[] => {
        if (user?.role === 'student') {
            return [
                { href: '/dashboard/student', label: 'Home', icon: <Home size={22} />, exactMatch: true },
                { href: '/dashboard/student/courses', label: 'Courses', icon: <BookOpen size={22} /> },
                { href: '/dashboard/student/assignments', label: 'Assignments', icon: <CheckSquare size={22} /> },
                { href: '/dashboard/student/tasks', label: 'Tasks', icon: <Calendar size={22} /> },
                { href: '/dashboard/student/routines', label: 'Routines', icon: <Clock size={22} /> },
            ];
        }
        return [
            { href: '/dashboard/lecturer', label: 'Home', icon: <Home size={22} />, exactMatch: true },
            { href: '/dashboard/lecturer/courses', label: 'Courses', icon: <BookOpen size={22} /> },
            { href: '/dashboard/lecturer/assignments', label: 'Tasks', icon: <FileText size={22} /> },
            { href: '/dashboard/settings', label: 'Profile', icon: <User size={22} /> },
        ];
    };

    const tabs = getTabs();
    
    // Improved active state detection
    const isActive = (tab: TabItem) => {
        if (tab.exactMatch) {
            return pathname === tab.href;
        }
        return pathname === tab.href || pathname?.startsWith(tab.href + '/');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
            {/* Safe area spacer for notched phones */}
            <div className="pb-safe bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex justify-around items-center px-2 py-2">
                    {tabs.map((tab) => {
                        const active = isActive(tab);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className="relative flex-1 flex flex-col items-center justify-center py-1 active:scale-95 transition-transform"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.92 }}
                                    className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${
                                        active 
                                            ? 'text-blue-500 dark:text-blue-400' 
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    <div className="relative">
                                        {tab.icon}
                                    </div>
                                    <span className={`text-[11px] font-medium mt-1 ${
                                        active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                        {tab.label}
                                    </span>
                                </motion.div>
                                {active && (
                                    <motion.div
                                        layoutId="bottom-tab-active"
                                        className="absolute -top-2 w-10 h-0.5 bg-blue-500 rounded-full"
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 40 }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
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