// components/student/TodaySchedule.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Course {
    id: string;
    title: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    location?: string;
    days?: string[];
}

interface TodayScheduleProps {
    courses: Course[];
}

export default function TodaySchedule({ courses }: TodayScheduleProps) {
    const [expanded, setExpanded] = useState(false);
    const displayCourses = expanded ? courses : courses.slice(0, 2);

    if (courses.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-gray-500 text-sm">No classes today!</p>
                <p className="text-xs text-gray-400 mt-1">Time to catch up on tasks 📚</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                        <Calendar size={16} className="text-blue-500" />
                    </div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Today's Classes</h2>
                </div>
                <span className="text-xs text-gray-400">{courses.length} class{courses.length !== 1 ? 'es' : ''}</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {displayCourses.map((course, idx) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-gray-900 dark:text-white">{course.title}</h3>
                                    <span className="text-xs text-gray-400 font-mono">{course.courseCode}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {course.startTime} - {course.endTime}
                                    </span>
                                    {course.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} />
                                            {course.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link href="/dashboard/student/classes">
                                <ChevronRight size={18} className="text-gray-400" />
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>

            {courses.length > 2 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full p-3 text-center text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition font-medium"
                >
                    {expanded ? 'Show less' : `View all ${courses.length} classes`}
                </button>
            )}
        </div>
    );
}