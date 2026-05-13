'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PinPadProps {
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  error?: string;
  length?: 4 | 5 | 6;
}

export default function PinPad({ 
  onComplete, 
  onCancel, 
  title = "Enter PIN", 
  subtitle = "Enter your 4-6 digit PIN",
  error: externalError,
  length = 4 
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const maxLength = length;
  
  const handleNumberClick = (num: string) => {
    if (pin.length < maxLength) {
      setPin(prev => prev + num);
      setError('');
    }
  };
  
  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };
  
  const handleClear = () => {
    setPin('');
    setError('');
  };
  
  useEffect(() => {
    if (pin.length === maxLength) {
      onComplete(pin);
      setPin('');
    }
  }, [pin, maxLength, onComplete]);
  
  useEffect(() => {
    if (externalError) {
      setError(externalError);
      setPin('');
    }
  }, [externalError]);
  
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫']
  ];
  
  return (
    <div className="flex flex-col items-center justify-center min-h-100 p-6">
      {/* Title */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl mb-4"
        >
          🐹
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      
      {/* PIN Dots */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: maxLength }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8 }}
            animate={{ scale: pin.length > i ? 1.2 : 1 }}
            className={`w-5 h-5 rounded-full transition-all ${
              pin.length > i 
                ? 'bg-blue-500 shadow-lg' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
      
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-500 text-sm mb-4"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      
      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 max-w-70 w-full">
        {numbers.map((row, i) => (
          row.map((num) => (
            <button
              key={`${i}-${num}`}
              onClick={() => {
                if (num === '⌫') handleDelete();
                else if (num && num !== '') handleNumberClick(num);
              }}
              disabled={num === ''}
              className={`
                h-16 rounded-2xl text-2xl font-semibold transition-all
                ${num === '⌫' 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                  : num === ''
                  ? 'invisible'
                  : 'bg-white dark:bg-gray-800 shadow-md hover:shadow-lg active:scale-95 text-gray-900 dark:text-white'
                }
              `}
            >
              {num === '⌫' ? '⌫' : num}
            </button>
          ))
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleClear}
          className="px-6 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}