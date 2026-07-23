'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PinPad from '@/components/PinPad';
import { verifyLocalPin, hasLocalUnlockPin, loginWithEmail } from '@/lib/auth/pinAuth';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function LoginClient() {
  const [mode, setMode] = useState<'checking' | 'pin' | 'credentials'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    hasLocalUnlockPin().then((available) => setMode(available ? 'pin' : 'credentials'));
  }, []);

  const goToDashboard = (role: string) => {
    router.push(role === 'student' ? '/dashboard/student' : '/dashboard/lecturer');
  };

  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setError('');

    try {
      const user = await verifyLocalPin(pin);
      if (user) {
        login(user);
        goToDashboard(user.role);
      } else {
        setError('Incorrect PIN, or your session expired - try signing in with email instead.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await loginWithEmail(email.trim(), password);
      login(user);
      goToDashboard(user.role);
    } catch (err) {
      if (err instanceof Error && err.message === 'PROFILE_MISSING') {
        router.push('/complete-profile');
        return;
      }
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
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
        {mode === 'pin' && (
          <>
            <PinPad
              onComplete={handlePinComplete}
              title="Welcome Back"
              subtitle="Enter your device PIN to continue"
              error={error}
              length={4}
            />
            <div className="text-center mt-4">
              <button
                onClick={() => { setMode('credentials'); setError(''); }}
                className="text-gray-500 text-sm hover:underline"
              >
                Use email &amp; password instead
              </button>
            </div>
          </>
        )}

        {mode === 'credentials' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🐹</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in with your email and password</p>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
                autoFocus
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
              />

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-blue-500 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        {isLoading && mode === 'pin' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce delay-100" />
              <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
