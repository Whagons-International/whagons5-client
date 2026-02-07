/**
 * Hook to check if the current user is a super admin.
 * Super admins are whitelisted by email in the config file.
 * 
 * Also supports temporary activation via secret password (15 min duration).
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import superAdminsConfig from '@/config/superAdmins.yaml?raw';
import { parse as parseYaml } from 'yaml';

interface SuperAdminsConfig {
  emails?: string[];
}

// Parse the config once at module load
let parsedConfig: SuperAdminsConfig | null = null;
try {
  parsedConfig = parseYaml(superAdminsConfig) as SuperAdminsConfig;
} catch {
  parsedConfig = { emails: [] };
}

// Create a Set for O(1) lookup
const superAdminEmails = new Set(
  (parsedConfig?.emails || []).map(email => email.toLowerCase().trim())
);

// Temporary super admin state (stored in memory, not localStorage for security)
const TEMP_ADMIN_DURATION_MS = 15 * 60 * 1000; // 15 minutes
let tempAdminExpiry: number | null = null;
let tempAdminListeners: Set<() => void> = new Set();

// Tech support secret hash (SHA-256)
const TECH_SUPPORT_SECRET_HASH = '43d51e5573a85271143877ed7a1101661393075ed297c5157d1870adc19b72a1';

/**
 * Hash a string using SHA-256
 */
async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if an email is in the super admin whitelist
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminEmails.has(email.toLowerCase().trim());
}

/**
 * Get the list of super admin emails (for debugging)
 */
export function getSuperAdminEmails(): string[] {
  return Array.from(superAdminEmails);
}

/**
 * Check if temporary admin mode is active
 */
export function isTempAdminActive(): boolean {
  if (!tempAdminExpiry) return false;
  if (Date.now() > tempAdminExpiry) {
    tempAdminExpiry = null;
    return false;
  }
  return true;
}

/**
 * Get remaining time for temp admin mode in milliseconds
 */
export function getTempAdminRemainingMs(): number {
  if (!tempAdminExpiry) return 0;
  const remaining = tempAdminExpiry - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Activate temporary super admin mode (requires valid secret)
 * Returns true if activation successful
 */
export async function activateTempAdmin(secret: string): Promise<boolean> {
  const hash = await hashSecret(secret);
  if (hash !== TECH_SUPPORT_SECRET_HASH) {
    return false;
  }
  
  tempAdminExpiry = Date.now() + TEMP_ADMIN_DURATION_MS;
  
  // Notify all listeners
  tempAdminListeners.forEach(listener => listener());
  
  // Set up auto-expiry notification
  setTimeout(() => {
    if (tempAdminExpiry && Date.now() >= tempAdminExpiry) {
      tempAdminExpiry = null;
      tempAdminListeners.forEach(listener => listener());
    }
  }, TEMP_ADMIN_DURATION_MS + 100);
  
  return true;
}

/**
 * Deactivate temporary super admin mode
 */
export function deactivateTempAdmin(): void {
  tempAdminExpiry = null;
  tempAdminListeners.forEach(listener => listener());
}

/**
 * Subscribe to temp admin state changes
 */
function subscribeTempAdmin(listener: () => void): () => void {
  tempAdminListeners.add(listener);
  return () => tempAdminListeners.delete(listener);
}

/**
 * Hook to check if the current user is a super admin
 * (either via whitelist or temporary activation)
 */
export function useSuperAdmin(): { 
  isSuperAdmin: boolean; 
  isLoading: boolean;
  isTempAdmin: boolean;
  tempAdminRemainingMs: number;
} {
  const { user, userLoading } = useAuth();
  const [tempAdminState, setTempAdminState] = useState(isTempAdminActive());
  const [remainingMs, setRemainingMs] = useState(getTempAdminRemainingMs());

  // Subscribe to temp admin changes
  useEffect(() => {
    const unsubscribe = subscribeTempAdmin(() => {
      setTempAdminState(isTempAdminActive());
      setRemainingMs(getTempAdminRemainingMs());
    });
    return unsubscribe;
  }, []);

  // Update remaining time every second when temp admin is active
  useEffect(() => {
    if (!tempAdminState) return;
    
    const interval = setInterval(() => {
      const remaining = getTempAdminRemainingMs();
      setRemainingMs(remaining);
      if (remaining === 0) {
        setTempAdminState(false);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tempAdminState]);

  const isWhitelisted = useMemo(() => {
    if (!user) return false;
    return isSuperAdminEmail(user.email);
  }, [user]);

  return {
    isSuperAdmin: isWhitelisted || tempAdminState,
    isLoading: userLoading,
    isTempAdmin: tempAdminState && !isWhitelisted,
    tempAdminRemainingMs: remainingMs,
  };
}

export default useSuperAdmin;
