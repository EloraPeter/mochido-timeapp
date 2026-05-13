'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PinPad from '@/components/PinPad';
import { createUser, isValidPin } from '@/lib/auth/pinAuth';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function RegisterClient() {
  const [step, setStep] = useState<'role' | 'name' | 'pin'>('role');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  
  const handleRoleSelect = (selectedRole: 'student' | 'lecturer') => {
    setRole(selectedRole);
    setStep('name');
  };
  
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
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
      const user = await createUser(name, enteredPin, role);
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
        
        {step === 'name' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🐹</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                What's your name?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                This is how Mochi will address you
              </p>
            </div>
            
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg mb-6"
                autoFocus
              />
              
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
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
            title="Create your PIN"
            subtitle="Choose a 4-digit PIN you'll remember"
            error={error}
            length={4}
          />
        )}
        
        {step !== 'role' && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                if (step === 'name') setStep('role');
                if (step === 'pin') setStep('name');
              }}
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
      
      {isLoading && (
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