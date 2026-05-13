'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PinPad from '@/components/PinPad';
import { verifyPin } from '@/lib/auth/pinAuth';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function LoginClient() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  
  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const user = await verifyPin(pin);
      
      if (user) {
        login(user);
        // Navigate based on role
        if (user.role === 'student') {
          router.push('/dashboard/student');
        } else {
          router.push('/dashboard/lecturer');
        }
      } else {
        setError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
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
        <PinPad
          onComplete={handlePinComplete}
          title="Welcome Back"
          subtitle="Enter your PIN to continue"
          error={error}
          length={4}
        />
        
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
        
        {isLoading && (
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