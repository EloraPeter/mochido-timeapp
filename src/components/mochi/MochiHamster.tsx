// components/mochi/MochiHamster.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  HAMSTER_EXPRESSIONS, 
  expressionAnimations, 
  MochiExpression 
} from './hamsterExpressions';
import { cn } from '@/lib/utils';

interface MochiHamsterProps {
  mood: MochiExpression;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showSparkles?: boolean;
}

const sizeClasses = {
  sm: 'w-20 h-20 p-2',
  md: 'w-28 h-28 p-3',
  lg: 'w-36 h-36 p-4'
};

const imageSizes = {
  sm: 64,
  md: 96,
  lg: 128
};

export default function MochiHamster({ 
  mood, 
  onClick, 
  size = 'md',
  showSparkles = false 
}: MochiHamsterProps) {
  const [imgError, setImgError] = useState(false);
  const expression = HAMSTER_EXPRESSIONS[mood];
  const animation = expressionAnimations[mood as keyof typeof expressionAnimations] || expressionAnimations.HAPPY;
  
  // expression.backgroundColor is already a complete, valid pair of Tailwind
  // gradient classes (e.g. "from-yellow-400 to-amber-500"). Prefixing each
  // word with "bg-" produced invalid classes like "bg-from-yellow-400" that
  // don't exist, so Mochi's gradient background never actually rendered.
  const bgClasses = expression.backgroundColor;
  
  // Draw ASCII hamster face as fallback
  const renderAsciiFace = () => {
    const eyes = expression.eyeShape;
    const mouth = expression.mouthShape;
    
    const eyeDisplay = eyes === '^ ^' ? '^ ^' :
                       eyes === '● ●' ? '● ●' :
                       eyes === '• •' ? '• •' :
                       eyes === '> <' ? '> <' :
                       eyes === '; ;' ? '; ;' :
                       eyes === '¬ ¬' ? '¬ ¬' :
                       eyes === '★ ★' ? '★ ★' : '• •';
    
    const mouthDisplay = mouth === 'w' ? 'w' :
                         mouth === 'D' ? 'D' :
                         mouth === '_' ? '_' :
                         mouth === 'o' ? 'o' :
                         mouth === '⊂' ? '⊂' :
                         mouth === '¬' ? '¬' : '_';
    
    return (
      <div className="text-center font-mono whitespace-pre leading-none">
        <div className={`text-${size === 'sm' ? '2xl' : size === 'md' ? '3xl' : '4xl'}`}>
          {expression.emoji}
        </div>
        <div className="text-xs sm:text-sm">
          {eyeDisplay}
          <br />
          {mouthDisplay}
        </div>
      </div>
    );
  };
  
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl cursor-pointer transition-all flex items-center justify-center",
        `bg-linear-to-br ${bgClasses}`,
        sizeClasses[size],
        "shadow-lg hover:shadow-xl"
      )}
      onClick={onClick}
      animate={animation.animate}
      transition={animation.transition}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Sparkles for proud/celebrating */}
      <AnimatePresence>
        {(expression.sparkles || showSparkles) && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-2 -right-2 text-yellow-300 text-xl"
          >
            ✨⭐✨
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sweat drop for concerned/disappointed/desperate */}
      {expression.sweatDrop && (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 text-blue-400 text-xl"
        >
          💧
        </motion.div>
      )}
      
      {/* Image or ASCII fallback */}
      {!imgError ? (
        <div className="relative w-full h-full">
          <Image
            src={expression.imagePath}
            alt={`Mochi is ${mood.toLowerCase()}`}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="object-contain w-full h-full"
            onError={() => setImgError(true)}
            priority
          />
        </div>
      ) : (
        renderAsciiFace()
      )}
      
      {/* Blush for happy/celebrating */}
      {expression.blush && !imgError && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
          <span className="text-pink-300/70 text-sm">⚬</span>
          <span className="text-pink-300/70 text-sm">⚬</span>
        </div>
      )}
    </motion.div>
  );
}