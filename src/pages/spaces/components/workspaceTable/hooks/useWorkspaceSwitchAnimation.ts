/**
 * Hook for handling staggered fade-in animation when switching workspaces
 * Returns a class name to add to the grid container for CSS-based animation
 */

import { useEffect, useState } from 'react';

const ANIMATION_DURATION_MS = 600; // Total animation time
const STORAGE_KEY = 'wh_prev_workspace_id';

export interface UseWorkspaceSwitchAnimationParams {
  workspaceId: string;
}

export function useWorkspaceSwitchAnimation(params: UseWorkspaceSwitchAnimationParams) {
  const { workspaceId } = params;
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Check for workspace change on mount
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    try {
      const prevWorkspaceId = sessionStorage.getItem(STORAGE_KEY);
      
      if (prevWorkspaceId !== null && prevWorkspaceId !== workspaceId) {
        // Workspace changed - trigger animation
        setIsAnimating(true);
        
        // Clear animation state after it completes
        timeout = setTimeout(() => {
          setIsAnimating(false);
        }, ANIMATION_DURATION_MS);
      }
      
      sessionStorage.setItem(STORAGE_KEY, workspaceId);
    } catch {
      // sessionStorage not available
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [workspaceId]);
  
  return {
    animationClass: isAnimating ? 'wh-rows-fade-in' : '',
  };
}
