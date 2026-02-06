import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '@/providers/AuthProvider';
import type { RootState } from '@/store/store';
import type { Spot, Task } from '@/store/types';

/**
 * Hook for spot-based task visibility filtering.
 *
 * Returns a function `isTaskVisible(task)` that checks whether a given task
 * is visible to the current authenticated user based on their assigned spots.
 *
 * Rules:
 * - Users with no spots assigned (null/empty) see all tasks.
 * - Users with spots see tasks whose spot_id is in their expanded spot set
 *   (including all descendant spots) OR tasks with spot_id = null.
 */
export function useSpotVisibility() {
  const { user } = useAuth();
  const { value: allSpots } = useSelector((state: RootState) => state.spots) as { value: Spot[]; loading: boolean };

  const allowedSpotIds = useMemo(() => {
    // Users with no spots assigned see everything
    if (!user?.spots || user.spots.length === 0) return null;

    // Resolve hierarchy: for each assigned spot, include all descendants
    const expandedIds = new Set<number>();

    const addDescendants = (parentId: number) => {
      expandedIds.add(parentId);
      for (const spot of allSpots) {
        if (spot.parent_id === parentId && !expandedIds.has(spot.id)) {
          addDescendants(spot.id);
        }
      }
    };

    for (const spotId of user.spots) {
      addDescendants(Number(spotId));
    }

    return expandedIds;
  }, [user?.spots, user?.is_admin, allSpots]);

  const isTaskVisible = useCallback((task: Task) => {
    // No restrictions — see everything
    if (allowedSpotIds === null) return true;

    // Tasks with no spot are visible to everyone
    if (task.spot_id === null || task.spot_id === undefined) return true;

    // Check if the task's spot is in the allowed set
    return allowedSpotIds.has(task.spot_id);
  }, [allowedSpotIds]);

  return { isTaskVisible, allowedSpotIds };
}

/**
 * Standalone utility to check task visibility without React hooks.
 * Useful for CacheRegistry and other non-component contexts.
 *
 * @param task - The task to check visibility for
 * @param userSpots - The user's assigned spot IDs (from auth user)
 * @param isAdmin - Whether the user is an admin
 * @param allSpots - All spots from the store
 * @returns Whether the task is visible to the user
 */
export function isTaskVisibleForUser(
  task: { spot_id: number | null | undefined },
  userSpots: (string | number)[] | null | undefined,
  isAdmin: boolean | undefined,
  allSpots: Spot[]
): boolean {
  // Users with no spots assigned see everything
  if (!userSpots || userSpots.length === 0) return true;

  // Tasks with no spot are visible to everyone
  if (task.spot_id === null || task.spot_id === undefined) return true;

  // Resolve hierarchy: expand assigned spots to include descendants
  const expandedIds = new Set<number>();
  const addDescendants = (parentId: number) => {
    expandedIds.add(parentId);
    for (const spot of allSpots) {
      if (spot.parent_id === parentId && !expandedIds.has(spot.id)) {
        addDescendants(spot.id);
      }
    }
  };
  for (const spotId of userSpots) {
    addDescendants(Number(spotId));
  }

  return expandedIds.has(task.spot_id);
}
