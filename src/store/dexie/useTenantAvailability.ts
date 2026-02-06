/**
 * Hook for checking tenant name availability
 * 
 * This hook manages the state for tenant availability checks during onboarding.
 * It uses Dexie for caching results (with TTL) and local React state for loading/error.
 * 
 * Usage:
 *   const { loading, error, value, checkAvailability, clearAvailability } = useTenantAvailability();
 *   
 *   // Check if a tenant name is available
 *   const isTaken = await checkAvailability('my-org');
 *   
 *   // value is: true = taken, false = available, null = unchecked
 */

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { api } from '@/api/whagonsApi';

// TTL for cached availability results (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface TenantAvailabilityCache {
  tenantName: string;
  exists: boolean;
  checkedAt: number;
}

export interface TenantAvailabilityState {
  loading: boolean;
  error: string | null;
  value: boolean | null; // true = taken, false = available, null = unchecked
}

export interface UseTenantAvailabilityReturn extends TenantAvailabilityState {
  checkAvailability: (tenantName: string) => Promise<boolean>;
  clearAvailability: () => void;
}

/**
 * Hook for managing tenant availability state
 */
export function useTenantAvailability(): UseTenantAvailabilityReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTenantName, setCurrentTenantName] = useState<string | null>(null);

  // Query the cached result for the current tenant name
  const cachedResult = useLiveQuery(
    async () => {
      if (!currentTenantName) return null;
      
      const cached = await db.table<TenantAvailabilityCache>('tenant_availability')
        .get(currentTenantName);
      
      // Check if cache is still valid
      if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
        return cached;
      }
      
      return null;
    },
    [currentTenantName]
  );

  // Derive value from cached result
  const value = cachedResult?.exists ?? null;

  /**
   * Check if a tenant name is available
   * @param tenantName The tenant name to check (slug format)
   * @returns true if taken, false if available
   */
  const checkAvailability = useCallback(async (tenantName: string): Promise<boolean> => {
    if (!tenantName || tenantName.length < 2) {
      setCurrentTenantName(null);
      setError(null);
      return false;
    }

    setCurrentTenantName(tenantName);
    setError(null);

    // Check cache first
    try {
      const cached = await db.table<TenantAvailabilityCache>('tenant_availability')
        .get(tenantName);
      
      if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
        return cached.exists;
      }
    } catch {
      // Cache miss, continue to API
    }

    // Call API to check availability
    setLoading(true);
    try {
      // Use the tenants API to check if the tenant exists
      // A 404 means the tenant doesn't exist (available)
      // A 200 means the tenant exists (taken)
      const response = await api.get(`/tenants/${tenantName}`);
      
      // Tenant exists (taken)
      const exists = response.status === 200;
      
      // Cache the result
      await db.table<TenantAvailabilityCache>('tenant_availability').put({
        tenantName,
        exists,
        checkedAt: Date.now(),
      });
      
      setLoading(false);
      return exists;
    } catch (err: any) {
      // 404 means tenant doesn't exist (available)
      if (err?.response?.status === 404) {
        await db.table<TenantAvailabilityCache>('tenant_availability').put({
          tenantName,
          exists: false,
          checkedAt: Date.now(),
        });
        setLoading(false);
        return false;
      }
      
      // Other errors
      setError(err?.message || 'Failed to check availability');
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Clear the current availability state
   */
  const clearAvailability = useCallback(() => {
    setCurrentTenantName(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    value,
    checkAvailability,
    clearAvailability,
  };
}
