'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PinPad from '@/components/PinPad';
import { createUser, isValidPin } from '@/lib/auth/pinAuth';
import { resolveInstitutionByJoinCode } from '@/lib/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

type Step = 'role' | 'institution' | 'credentials' | 'pin';

export default function RegisterClient() {
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [joinCode, setJoinCode] = useState('');
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleRoleSelect = (selectedRole: 'student' | 'lecturer') => {
    setRole(selectedRole);
    setStep('institution');
  };

  const handleJoinCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Join code is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const institution = await resolveInstitutionByJoinCode(joinCode.trim());
      if (!institution) {
        setError('That join code was not recognized. Check with your school.');
        setIsLoading(false);
        return;
      }
      setInstitutionName(institution.name);
      setStep('credentials');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify that join code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinComplete = async (enteredPin: string) => {
    setIsLoading(true);
    setError('');

    if (!isValidPin(enteredPin)) {
      setError('PIN must be 4 digits');
      setIsLoading(false);
      return;
    }

    try {
      const user = await createUser(name, enteredPin, role, email.trim(), password, joinCode.trim());
      login(user);

      if (role === 'student') {
        router.push('/dashboard/student');
      } else {
        router.push('/dashboard/lecturer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'institution') setStep('role');
    if (step === 'credentials') setStep('institution');
    if (step === 'pin') setStep('credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        {step === 'role' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🐹</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              I am a...
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Select your role to get started
            </p>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('student')}
                className="w-full p-6 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <div className="text-3xl mb-2">📚</div>
                <div className="font-semibold text-lg">Student</div>
                <div className="text-sm opacity-90">Manage classes, tasks, and routines</div>
              </button>

              <button
                onClick={() => handleRoleSelect('lecturer')}
                className="w-full p-6 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-2xl hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                <div className="text-3xl mb-2">👨‍🏫</div>
                <div className="font-semibold text-lg">Lecturer</div>
                <div className="text-sm opacity-90">Manage courses and assignments</div>
              </button>
            </div>
          </div>
        )}

        {step === 'institution' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🏫</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                What's your institution's join code?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Get this from your school's admin
              </p>
            </div>

            <form onSubmit={handleJoinCodeSubmit}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g., UNIDEL-2026"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg mb-6"
                autoFocus
                autoCapitalize="characters"
              />

              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50"
              >
                {isLoading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 'credentials' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🐹</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tell us about you
              </h2>
              {institutionName && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Joining {institutionName}
                </p>
              )}
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
                autoFocus
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg"
              />

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'pin' && (
          <PinPad
            onComplete={handlePinComplete}
            title="Create a device PIN"
            subtitle="A quick 4-digit unlock for this device - you'll still use your email/password to sign in elsewhere"
            error={error}
            length={4}
          />
        )}

        {step !== 'role' && (
          <div className="text-center mt-6">
            <button
              onClick={goBack}
              className="text-gray-500 text-sm hover:underline"
            >
              ← Back
            </button>
          </div>
        )}

        <div className="text-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link href="/login" className="text-gray-500 text-sm hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </motion.div>

      {isLoading && step === 'pin' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce" />
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce delay-100" />
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce delay-200" />
          </div>
        </div>
      )}
    </div>
  );
}
