'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateUserName, getCurrentUser, logout } from '@/lib/auth/pinAuth';
import { updateItem, getItems, deleteItem, getDB } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import MobileSidebar from '@/components/MobileSidebar';
import GoogleDriveBackup from '@/components/settings/GoogleDriveBackup';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Lock,
    Database,
    Download,
    Upload,
    Trash2,
    Moon,
    Sun,
    Info,
    ChevronRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    Bell,
    BellOff
} from 'lucide-react';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import type { Task, CourseCatalog, Routine, Enrollment } from '@/lib/db/schema';

export default function SettingsClient() {
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const [showChangePin, setShowChangePin] = useState(false);
  const { success, error, confirm, toast } = useCustomAlert();

    const [showExportData, setShowExportData] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [stats, setStats] = useState({ tasks: 0, courses: 0, routines: 0, enrollments: 0 });
    const [selectedTitle, setSelectedTitle] = useState<'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'Prof.'>('Mr.');
    const [showTitleSelector, setShowTitleSelector] = useState(false);

    useEffect(() => {
        if (user?.role === 'lecturer' && user?.title) {
            setSelectedTitle(user.title as any);
        }
    }, [user]);

    const handleTitleUpdate = async (title: 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'Prof.') => {
        const { updateLecturerTitle } = await import('@/lib/auth/pinAuth');
        await updateLecturerTitle(user!.id, title);
        setSelectedTitle(title);
        await refreshUser();
        setShowTitleSelector(false);
        success(`Title updated to ${title}`);
    };

    // Helper function for PIN hashing
    const hashPin = (pin: string): string => {
        let hash = 0;
        for (let i = 0; i < pin.length; i++) {
            hash = ((hash << 5) - hash) + pin.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    };

    // Load stats - FIXED: Use correct store names
    useEffect(() => {
        const loadStats = async () => {
            if (!user?.id) return;
            try {
                // Use courseCatalog instead of courses
                const courses = await getItems<CourseCatalog>(STORES.courseCatalog);
                const tasks = await getItems<Task>(STORES.tasks);
                const routines = await getItems<Routine>(STORES.routines);
                const enrollments = await getItems<Enrollment>(STORES.enrollments);

                setStats({
                    tasks: tasks.filter(t => t.userId === user.id).length,
                    courses: courses.length,
                    routines: routines.filter(r => r.userId === user.id).length,
                    enrollments: enrollments.filter(e => e.studentId === user.id).length
                });
            } catch (error) {
                console.warn('Error loading stats:', error);
            }
        };
        if (user?.id) loadStats();
    }, [user]);

   // Check theme preference
useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    // Default = light mode
    const isDark =
        savedTheme === 'dark' ||
        (savedTheme === 'system' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

    setIsDarkMode(isDark);

    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}, []);

// Toggle between light and dark
const toggleDarkMode = () => {
    const newMode = !isDarkMode;

    setIsDarkMode(newMode);

    if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
};


    const handleNameUpdate = async () => {
        if (!newName.trim()) return;
        await updateUserName(user!.id, newName);
        await refreshUser();
        setNewName('');
        success('Name updated successfully!');
    };

    const handlePinChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess('');

        if (!/^\d{4}$/.test(newPin)) {
            setPinError('PIN must be 4 digits');
            return;
        }

        if (newPin !== confirmPin) {
            setPinError('PINs do not match');
            return;
        }

        // Verify current PIN
        const users = await getItems<any>(STORES.users);
        const hashedCurrent = hashPin(currentPin);
        const currentUserRecord = users.find(u => u.id === user?.id);

        if (currentUserRecord?.pin !== hashedCurrent) {
            setPinError('Current PIN is incorrect');
            return;
        }

        // Update PIN
        const hashedNew = hashPin(newPin);
        await updateItem(STORES.users, user!.id, { pin: hashedNew });

        setPinSuccess('PIN changed successfully!');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');

        setTimeout(() => {
            setShowChangePin(false);
            setPinSuccess('');
        }, 1500);
    };

    const handleExportData = async () => {
        if (!user?.id) return;

        const courses = await getItems<CourseCatalog>(STORES.courseCatalog);
        const tasks = await getItems<Task>(STORES.tasks);
        const routines = await getItems<Routine>(STORES.routines);
        const enrollments = await getItems<Enrollment>(STORES.enrollments);

        const exportDataObj = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            },
            data: {
                courses: courses.filter(c => c.createdBy === user.id),
                tasks: tasks.filter(t => t.userId === user.id),
                routines: routines.filter(r => r.userId === user.id),
                enrollments: enrollments.filter(e => e.studentId === user.id)
            }
        };

        const blob = new Blob([JSON.stringify(exportDataObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mochido-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setShowExportData(false);
    };

    const handleImportData = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🔵 Import function called');

        if (!importFile) {
            console.log('❌ No file selected');
            setImportStatus({ type: 'error', message: 'Please select a file first' });
            return;
        }

        console.log('📁 File selected:', importFile.name, importFile.size);
        setImportStatus({ type: 'success', message: 'Reading file...' });

        const reader = new FileReader();

        reader.onload = async (event) => {
            console.log('📖 File loaded, processing...');
            try {
                const content = event.target?.result as string;
                console.log('📄 File content length:', content.length);

                const imported = JSON.parse(content);
                console.log('✅ JSON parsed successfully', imported);

                if (!imported.data) {
                    throw new Error('Invalid backup file format - missing "data" property');
                }

                const currentUserId = user?.id;
                if (!currentUserId) {
                    throw new Error('No user logged in');
                }

                console.log('👤 Current user ID:', currentUserId);
                console.log('📊 Import stats:', {
                    courses: imported.data.courses?.length || 0,
                    tasks: imported.data.tasks?.length || 0,
                    routines: imported.data.routines?.length || 0,
                    enrollments: imported.data.enrollments?.length || 0
                });

                // Open database
                const db = await getDB();
                console.log('🗄️ Database opened');

                // Create transaction with all stores
                const tx = db.transaction(
                    [STORES.courseCatalog, STORES.tasks, STORES.routines, STORES.enrollments],
                    'readwrite'
                );

                let importedCount = 0;

                // Import courses
                if (imported.data.courses && imported.data.courses.length > 0) {
                    const courseStore = tx.objectStore(STORES.courseCatalog);
                    for (const course of imported.data.courses) {
                        const newCourse = {
                            id: crypto.randomUUID(),
                            courseCode: course.courseCode,
                            title: course.title,
                            description: course.description || '',
                            createdBy: currentUserId,
                            isVerified: false,
                            createdAt: new Date().toISOString()
                        };
                        await courseStore.put(newCourse);
                        importedCount++;
                        console.log(`  ✅ Imported course: ${newCourse.title}`);
                    }
                }

                // Import tasks
                if (imported.data.tasks && imported.data.tasks.length > 0) {
                    const taskStore = tx.objectStore(STORES.tasks);
                    for (const task of imported.data.tasks) {
                        const newTask = {
                            id: crypto.randomUUID(),
                            title: task.title,
                            dueDate: task.dueDate,
                            catalogId: task.catalogId,
                            userId: currentUserId,
                            isDone: false,
                            notes: task.notes || '',
                            priority: task.priority || 'medium',
                            createdAt: new Date().toISOString(),
                            status: 'pending',
                            urgencyScore: 50,
                            reminderMinutes: [1440, 60, 10, 0]
                        };
                        await taskStore.put(newTask);
                        importedCount++;
                        console.log(`  ✅ Imported task: ${newTask.title}`);
                    }
                }

                // Import routines
                if (imported.data.routines && imported.data.routines.length > 0) {
                    const routineStore = tx.objectStore(STORES.routines);
                    for (const routine of imported.data.routines) {
                        const newRoutine = {
                            id: crypto.randomUUID(),
                            title: routine.title,
                            durationMinutes: routine.durationMinutes,
                            scheduleType: routine.scheduleType,
                            days: routine.days || null,
                            onceDate: routine.onceDate || null,
                            affectsWakeUp: routine.affectsWakeUp || false,
                            userId: currentUserId,
                            createdAt: new Date().toISOString()
                        };
                        await routineStore.put(newRoutine);
                        importedCount++;
                        console.log(`  ✅ Imported routine: ${newRoutine.title}`);
                    }
                }

                // Note: Enrollments are handled separately when you enroll in courses
                // We don't import enrollments directly to avoid conflicts

                // Commit transaction
                await tx.done;
                console.log(`✅ Transaction committed! Imported ${importedCount} items`);

                setImportStatus({
                    type: 'success',
                    message: `Successfully imported ${importedCount} items! Refreshing...`
                });

                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error) {
                console.error('❌ Import error:', error);
                setImportStatus({
                    type: 'error',
                    message: `Import failed: ${(error as Error).message}`
                });
            }
        };

        reader.onerror = (error) => {
            console.error('❌ FileReader error:', error);
            setImportStatus({ type: 'error', message: 'Failed to read the file' });
        };

        reader.readAsText(importFile);
    };

    const handleDeleteAllData = async () => {
        if (!user?.id) return;

        const userTasks = await getItems<Task>(STORES.tasks, 'userId', user.id);
        const userCourses = await getItems<CourseCatalog>(STORES.courseCatalog, 'createdBy', user.id);
        const userRoutines = await getItems<Routine>(STORES.routines, 'userId', user.id);
        const userEnrollments = await getItems<Enrollment>(STORES.enrollments, 'studentId', user.id);

        for (const task of userTasks) await deleteItem(STORES.tasks, task.id);
        for (const course of userCourses) await deleteItem(STORES.courseCatalog, course.id);
        for (const routine of userRoutines) await deleteItem(STORES.routines, routine.id);
        for (const enrollment of userEnrollments) await deleteItem(STORES.enrollments, enrollment.id);

        setShowDeleteConfirm(false);
        success('All data deleted successfully!');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Mobile Sidebar */}
            <MobileSidebar />
            <div className="max-w-4xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 ml-10">Settings</h1>
                <p className="text-sm text-gray-500 mb-6">Manage your account and preferences</p>

                {/* Profile Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <User size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white">Profile</h2>
                                <p className="text-xs text-gray-500">Manage your personal information</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">

                        {user?.role === 'lecturer' && (
                            <div>
                                <label className="text-sm text-gray-600 dark:text-gray-400">Title</label>
                                <div className="flex gap-2 mt-1">
                                    <div className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                                        {user?.title || 'No title set'}
                                    </div>
                                    <button
                                        onClick={() => setShowTitleSelector(true)}
                                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-400">Name</label>
                            <div className="flex gap-2 mt-1">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={user?.name || 'Enter name'}
                                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                                />
                                <button
                                    onClick={handleNameUpdate}
                                    disabled={!newName.trim()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
                                >
                                    Update
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Current: {user?.name}</p>
                        </div>

                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-400">Role</label>
                            <p className="text-base font-medium text-gray-900 dark:text-white mt-1 capitalize">
                                {user?.role}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <Lock size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white">Security</h2>
                                <p className="text-xs text-gray-500">Change your PIN or manage security</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <button
                            onClick={() => setShowChangePin(true)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <span>Change PIN</span>
                            <ChevronRight size={18} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                {isDarkMode ? <Moon size={20} className="text-purple-500" /> : <Sun size={20} className="text-purple-500" />}
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
                                <p className="text-xs text-gray-500">Customize how MochiDo looks</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <button
                            onClick={toggleDarkMode}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="flex items-center gap-3">
                                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                                <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                            </div>
                            <span className="text-sm text-gray-500">Click to toggle</span>
                        </button>
                    </div>
                </div>

                {/* Notification Settings Section */}
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <Bell size={20} className="text-yellow-500" />
            </div>
            <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Notifications</h2>
                <p className="text-xs text-gray-500">Manage deadline reminders and alerts</p>
            </div>
        </div>
    </div>

    <div className="p-4 space-y-4">
        {/* Notification Permission Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {typeof window !== 'undefined' && Notification.permission === 'granted' 
                        ? '✅ Notifications are enabled' 
                        : Notification.permission === 'denied'
                        ? '❌ Notifications are blocked'
                        : '🔔 Notifications not requested yet'}
                </p>
            </div>
            <button
                onClick={async () => {
                    if (typeof window !== 'undefined' && Notification.permission === 'denied') {
                        error('Please go to your browser settings and allow notifications for this site, then refresh the page.');
                    } else if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
                        const result = await Notification.requestPermission();
                        if (result === 'granted') {
                            success('✅ Notifications enabled! You will now receive deadline reminders.');
                            window.location.reload();
                        } else {
                            error('Notifications were blocked. You can change this in browser settings.');
                        }
                    } else {
                        success('Notifications are already enabled! 🎉');
                    }
                }}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                    typeof window !== 'undefined' && Notification.permission === 'granted'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
                {typeof window !== 'undefined' && Notification.permission === 'granted' 
                    ? '✅ Enabled' 
                    : 'Enable Notifications'}
            </button>
        </div>
        
        {/* Info about notifications */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
                <Bell size={14} className="text-blue-500 mt-0.5" />
                <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>What you'll receive:</strong>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        • Deadline reminders (1 day, 6 hours, 1 hour, 30 minutes before)<br />
                        • Overdue task alerts<br />
                        • Mochi's motivational messages<br />
                        • Streak reminders
                    </p>
                </div>
            </div>
        </div>
        
        {/* Show blocked instructions if needed */}
        {typeof window !== 'undefined' && Notification.permission === 'denied' && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-500 mt-0.5" />
                    <div>
                        <p className="text-xs text-red-700 dark:text-red-300 font-semibold">Notifications are blocked</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            To enable notifications:<br />
                            <strong>Chrome:</strong> Click the lock icon in address bar → Notifications → Allow<br />
                            <strong>Safari:</strong> Settings → Websites → Notifications → Allow<br />
                            Then refresh this page.
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
</div>

                {/* Data Management Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <Database size={20} className="text-green-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white">Data Management</h2>
                                <p className="text-xs text-gray-500">Backup, restore, or delete your data</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Data Statistics</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.tasks} tasks • {stats.courses} courses • {stats.routines} routines • {stats.enrollments} enrollments
                                </p>
                            </div>
                        </div>

                        {/* Google Drive Backup Section */}
                        <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 mb-3">Cloud Backup (Google Drive)</p>
                            <GoogleDriveBackup />
                        </div>

                        <button
                            onClick={() => setShowExportData(true)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="flex items-center gap-3">
                                <Download size={18} />
                                <span>Export Data (Backup)</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-400" />
                        </button>

                        <button
                            onClick={() => document.getElementById('import-file')?.click()}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="flex items-center gap-3">
                                <Upload size={18} />
                                <span>Import Data (Restore)</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-400" />
                        </button>
                        <input
                            id="import-file"
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={async (e) => {
                                if (e.target.files?.[0]) {
                                    const file = e.target.files[0];
                                    console.log('📁 File selected:', file.name);

                                    // Set the file in state AND directly process it
                                    setImportFile(file);

                                    // Process the file directly without waiting for state
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        try {
                                            const content = event.target?.result as string;
                                            const imported = JSON.parse(content);
                                            console.log('✅ File parsed successfully', imported);

                                            if (!imported.data) {
                                                throw new Error('Invalid backup file format - missing "data" property');
                                            }

                                            const currentUserId = user?.id;
                                            if (!currentUserId) {
                                                throw new Error('No user logged in');
                                            }

                                            console.log('👤 Current user ID:', currentUserId);
                                            console.log('📊 Import stats:', {
                                                courses: imported.data.courses?.length || 0,
                                                tasks: imported.data.tasks?.length || 0,
                                                routines: imported.data.routines?.length || 0
                                            });

                                            const db = await getDB();
                                            console.log('🗄️ Database opened');

                                            const tx = db.transaction(
                                                [STORES.courseCatalog, STORES.tasks, STORES.routines],
                                                'readwrite'
                                            );

                                            let importedCount = 0;

                                            // Import courses
                                            if (imported.data.courses && imported.data.courses.length > 0) {
                                                const courseStore = tx.objectStore(STORES.courseCatalog);
                                                for (const course of imported.data.courses) {
                                                    const newCourse = {
                                                        id: crypto.randomUUID(),
                                                        courseCode: course.courseCode,
                                                        title: course.title,
                                                        description: course.description || '',
                                                        createdBy: currentUserId,
                                                        isVerified: false,
                                                        createdAt: new Date().toISOString()
                                                    };
                                                    await courseStore.put(newCourse);
                                                    importedCount++;
                                                    console.log(`  ✅ Imported course: ${newCourse.title}`);
                                                }
                                            }

                                            // Import tasks
                                            if (imported.data.tasks && imported.data.tasks.length > 0) {
                                                const taskStore = tx.objectStore(STORES.tasks);
                                                for (const task of imported.data.tasks) {
                                                    const newTask = {
                                                        id: crypto.randomUUID(),
                                                        title: task.title,
                                                        dueDate: task.dueDate,
                                                        catalogId: task.catalogId,
                                                        userId: currentUserId,
                                                        isDone: false,
                                                        notes: task.notes || '',
                                                        priority: task.priority || 'medium',
                                                        createdAt: new Date().toISOString(),
                                                        status: 'pending',
                                                        urgencyScore: 50,
                                                        reminderMinutes: [1440, 60, 10, 0]
                                                    };
                                                    await taskStore.put(newTask);
                                                    importedCount++;
                                                    console.log(`  ✅ Imported task: ${newTask.title}`);
                                                }
                                            }

                                            // Import routines
                                            if (imported.data.routines && imported.data.routines.length > 0) {
                                                const routineStore = tx.objectStore(STORES.routines);
                                                for (const routine of imported.data.routines) {
                                                    const newRoutine = {
                                                        id: crypto.randomUUID(),
                                                        title: routine.title,
                                                        durationMinutes: routine.durationMinutes,
                                                        scheduleType: routine.scheduleType,
                                                        days: routine.days || null,
                                                        onceDate: routine.onceDate || null,
                                                        affectsWakeUp: routine.affectsWakeUp || false,
                                                        userId: currentUserId,
                                                        createdAt: new Date().toISOString()
                                                    };
                                                    await routineStore.put(newRoutine);
                                                    importedCount++;
                                                    console.log(`  ✅ Imported routine: ${newRoutine.title}`);
                                                }
                                            }

                                            await tx.done;
                                            console.log(`✅ Transaction committed! Imported ${importedCount} items`);

                                            setImportStatus({
                                                type: 'success',
                                                message: `Successfully imported ${importedCount} items! Refreshing...`
                                            });

                                            setTimeout(() => {
                                                window.location.reload();
                                            }, 2000);

                                        } catch (error) {
                                            console.error('❌ Import error:', error);
                                            setImportStatus({
                                                type: 'error',
                                                message: `Import failed: ${(error as Error).message}`
                                            });
                                        }
                                    };

                                    reader.onerror = (error) => {
                                        console.error('❌ FileReader error:', error);
                                        setImportStatus({ type: 'error', message: 'Failed to read the file' });
                                    };

                                    reader.readAsText(file);
                                }
                            }}
                        />

                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 size={18} className="text-red-500" />
                                <span className="text-red-600 dark:text-red-400">Delete All Data</span>
                            </div>
                            <ChevronRight size={18} className="text-red-400" />
                        </button>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                <Info size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white">About</h2>
                                <p className="text-xs text-gray-500">App information and version</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Built with</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Next.js + IndexedDB</span>
                        </div>
                        <div className="pt-4 text-center">
                            <div className="text-4xl mb-2">🐹</div>
                            <p className="text-xs text-gray-500">MochiDo - Academic Time Management System</p>
                            <p className="text-xs text-gray-400 mt-1">© 2024 All rights reserved</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change PIN Modal */}
            <AnimatePresence>
                {showChangePin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowChangePin(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Change PIN</h2>
                            <form onSubmit={handlePinChange}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Current PIN</label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={currentPin}
                                            onChange={(e) => setCurrentPin(e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-center text-xl tracking-widest"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">New PIN (4 digits)</label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-center text-xl tracking-widest"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Confirm New PIN</label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={confirmPin}
                                            onChange={(e) => setConfirmPin(e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-center text-xl tracking-widest"
                                            required
                                        />
                                    </div>

                                    {pinError && (
                                        <div className="flex items-center gap-2 text-red-500 text-sm">
                                            <XCircle size={16} />
                                            {pinError}
                                        </div>
                                    )}

                                    {pinSuccess && (
                                        <div className="flex items-center gap-2 text-green-500 text-sm">
                                            <CheckCircle size={16} />
                                            {pinSuccess}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePin(false)}
                                        className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                                    >
                                        Change PIN
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export Data Modal */}
            <AnimatePresence>
                {showExportData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowExportData(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Export Data</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                This will export all your tasks, courses, and routines as a JSON backup file.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExportData(false)}
                                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExportData}
                                    className="flex-1 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
                                >
                                    Export
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4 text-red-500">
                                <AlertCircle size={28} />
                                <h2 className="text-xl font-bold">Delete All Data?</h2>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                This action cannot be undone. All your tasks, courses, and routines will be permanently deleted.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAllData}
                                    className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import Status Toast */}
            <AnimatePresence>
                {importStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-4 left-4 right-4 max-w-md mx-auto p-4 rounded-xl shadow-lg ${importStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            } text-white`}
                    >
                        <div className="flex items-center gap-2">
                            {importStatus.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            {importStatus.message}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Title Selector Modal */}
            <AnimatePresence>
                {showTitleSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowTitleSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select Title</h2>
                            <div className="space-y-2">
                                {['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'].map(title => (
                                    <button
                                        key={title}
                                        onClick={() => handleTitleUpdate(title as any)}
                                        className={`w-full p-3 rounded-xl text-left transition ${selectedTitle === title
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {title}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowTitleSelector(false)}
                                className="w-full mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}