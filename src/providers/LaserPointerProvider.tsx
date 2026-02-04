import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type LaserMode = 'off' | 'fade' | 'persist';

interface LaserPointerContextType {
  mode: LaserMode;
  setMode: (mode: LaserMode) => void;
  cycleMode: () => void;
  isActive: boolean; // convenience: mode !== 'off'
}

const LaserPointerContext = createContext<LaserPointerContextType | undefined>(undefined);

interface LaserPointerProviderProps {
  children: React.ReactNode;
}

const MODE_CYCLE: LaserMode[] = ['off', 'fade', 'persist'];

export function LaserPointerProvider({ children }: LaserPointerProviderProps) {
  const [mode, setMode] = useState<LaserMode>('off');

  const isActive = mode !== 'off';

  const cycleMode = useCallback(() => {
    setMode(prev => {
      const currentIndex = MODE_CYCLE.indexOf(prev);
      const nextIndex = (currentIndex + 1) % MODE_CYCLE.length;
      return MODE_CYCLE[nextIndex];
    });
  }, []);

  // Keyboard shortcut: L to cycle laser pointer modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Cycle on 'L' key press (case insensitive)
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        cycleMode();
      }

      // Also allow Escape to turn off
      if (e.key === 'Escape' && isActive) {
        e.preventDefault();
        setMode('off');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleMode, isActive]);

  return (
    <LaserPointerContext.Provider value={{ mode, setMode, cycleMode, isActive }}>
      {children}
    </LaserPointerContext.Provider>
  );
}

export function useLaserPointer() {
  const context = useContext(LaserPointerContext);
  if (context === undefined) {
    throw new Error('useLaserPointer must be used within a LaserPointerProvider');
  }
  return context;
}
