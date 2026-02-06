import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from '@/store/dexie';

export interface WorkspaceStats {
  total: number;
  inProgress: number;
  completedToday: number;
  trend: number[];
  loading: boolean;
}

export function useWorkspaceStats(params: {
  workspaceId: string | undefined;
  isAllWorkspaces: boolean;
  doneStatusId: number | undefined;
  workingStatusIds: number[];
}) {
  const { workspaceId, isAllWorkspaces, doneStatusId, workingStatusIds } = params;
  
  // Use useLiveQuery to automatically react to task changes
  const stats = useLiveQuery(async () => {
    const { db } = await import('@/store/dexie');
    
    let query = db.table('tasks');
    
    // Apply workspace filter if not all workspaces
    if (!isAllWorkspaces && workspaceId) {
      query = query.where('workspace_id').equals(workspaceId);
    }
    
    const allTasks = await query.toArray();
    
    // Total count
    const total = allTasks.length;
    
    // In progress count (tasks with working status IDs)
    const inProgress = workingStatusIds.length > 0
      ? allTasks.filter(t => workingStatusIds.includes(t.status_id)).length
      : 0;
    
    // Completed today count
    let completedToday = 0;
    let trend: number[] = [];
    
    if (doneStatusId != null) {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      
      completedToday = allTasks.filter(t => 
        Number(t.status_id) === Number(doneStatusId) && 
        new Date(t.updated_at) >= midnight
      ).length;
      
      // Calculate 7-day trend
      const sevenDaysAgo = new Date(midnight);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      
      const recentTasks = allTasks.filter(t => 
        Number(t.status_id) === Number(doneStatusId) &&
        new Date(t.updated_at) >= sevenDaysAgo
      );
      
      trend = Array.from({ length: 7 }, (_, idx) => {
        const dayStart = new Date(sevenDaysAgo);
        dayStart.setDate(dayStart.getDate() + idx);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return recentTasks.filter(t => {
          const updatedAt = new Date(t.updated_at);
          return updatedAt >= dayStart && updatedAt < dayEnd;
        }).length;
      });
    }
    
    return { total, inProgress, completedToday, trend, loading: false };
  }, [workspaceId, isAllWorkspaces, doneStatusId, workingStatusIds.join(',')]);

  return stats || { total: 0, inProgress: 0, completedToday: 0, trend: [], loading: true };
}
