import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWorkspaceTabFromUrl, type Location } from '../utils/routing';
import { WORKSPACE_TAB_PATHS, type WorkspaceTabKey } from '../constants';

import { Logger } from '@/utils/logger';
export function useWorkspaceTabState(params: {
  location: Location;
  workspaceBasePath: string;
  invalidWorkspaceRoute: boolean;
  invalidWorkspaceId: boolean;
  resolvedOrder: WorkspaceTabKey[];
}) {
  const { location, workspaceBasePath, invalidWorkspaceRoute, invalidWorkspaceId, resolvedOrder } = params;
  const navigate = useNavigate();
  
  const getCurrentTabFromUrl = (): WorkspaceTabKey => {
    return getCurrentWorkspaceTabFromUrl({ location, workspaceBasePath });
  };

  const initialTab = getCurrentTabFromUrl();
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialTab);
  const [prevActiveTab, setPrevActiveTab] = useState<WorkspaceTabKey>(initialTab);
  const isInitialMountRef = useRef(true);

  // Save active tab to localStorage when it changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    if (invalidWorkspaceRoute || invalidWorkspaceId) return;
    
    try {
      const id = location.pathname.match(/\/workspace\/([^/?]+)/)?.[1] || 'all';
      const key = `wh_workspace_last_tab_${id}`;
      localStorage.setItem(key, activeTab);
    } catch (error) {
      Logger.error('workspaces', '[Workspace] Error saving last tab:', error);
    }
  }, [activeTab, location.pathname, invalidWorkspaceRoute, invalidWorkspaceId]);

  // Sync tab state when URL changes
  useEffect(() => {
    const currentTabFromUrl = getCurrentTabFromUrl();
    if (currentTabFromUrl !== activeTab) {
      setPrevActiveTab(currentTabFromUrl);
      setActiveTab(currentTabFromUrl);
    }
  }, [location.pathname, workspaceBasePath]);

  // Ensure active tab is in resolved order
  useEffect(() => {
    if (invalidWorkspaceRoute || invalidWorkspaceId) return;
    const allowedSet = new Set(resolvedOrder);
    if (!allowedSet.has(activeTab)) {
      const fallbackTab = resolvedOrder[0] || 'grid';
      const targetPath = `${workspaceBasePath}${WORKSPACE_TAB_PATHS[fallbackTab]}`;
      const normalizedTarget = targetPath.replace(/\/+$/, '');
      const normalizedCurrent = location.pathname.replace(/\/+$/, '');
      if (normalizedCurrent !== normalizedTarget) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [resolvedOrder, activeTab, navigate, location.pathname, workspaceBasePath, invalidWorkspaceRoute, invalidWorkspaceId]);

  return {
    activeTab,
    setActiveTab,
    prevActiveTab,
    setPrevActiveTab,
  };
}
