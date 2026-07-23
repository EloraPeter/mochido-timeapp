'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { completeProfile } from '@/lib/auth/pinAuth';
import { useAuth } from '@/contexts/AuthContext';

export default function CompleteProfileClient() {
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await completeProfile(name, role, joinCode.trim());
      login(user);
      router.push(role === 'student' ? '/dashboard/student' : '/dashboard/lecturer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete your profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐹</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Almost there</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your account exists, but a few details are missing - let's finish setting it up.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-3 rounded-xl border-2 font-medium transition ${
                role === 'student' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              📚 Student
            </button>
            <button
              type="button"
              onClick={() => setRole('lecturer')}
              className={`p-3 rounded-xl border-2 font-medium transition ${
                role === 'lecturer' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              👨‍🏫 Lecturer
            </button>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
            autoFocus
          />
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Institution join code"
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
            autoCapitalize="characters"
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isLoading ? 'Finishing up...' : 'Complete Setup'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
