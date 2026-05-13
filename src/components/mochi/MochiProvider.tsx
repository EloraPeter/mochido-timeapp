// components/mochi/MochiProvider.tsx

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useMochiMood } from '@/hooks/useMochiMood';

interface MochiContextType {
  mood: any;
  refreshMood: () => void;
}

const MochiContext = createContext<MochiContextType | undefined>(undefined);

export function MochiProvider({ children }: { children: ReactNode }) {
  const { mood, refreshMood } = useMochiMood();
  
  return (
    <MochiContext.Provider value={{ mood, refreshMood }}>
      {children}
    </MochiContext.Provider>
  );
}

export function useMochi() {
  const context = useContext(MochiContext);
  if (!context) throw new Error('useMochi must be used within MochiProvider');
  return context;
}