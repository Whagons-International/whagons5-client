import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useTheme } from '@/providers/ThemeProvider';
import { db, useLiveQuery } from '@/store/dexie';
import { api } from '@/store/api/internalApi';

interface WhiteboardData {
  workspaceId: string;
  elements: any[];
  appState: any;
}

export default function WhiteboardViewTab({ workspaceId }: { workspaceId: string | undefined }) {
  const [loading, setLoading] = useState(false);
  
  // Reactive query for whiteboard data from Dexie
  const whiteboardData = useLiveQuery(
    () => workspaceId ? db.table<WhiteboardData>('whiteboards').get(workspaceId) : undefined,
    [workspaceId]
  );
  
  const { theme } = useTheme();

  const excalidrawTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    // "starwars" and "dark" both map to dark
    return theme === 'light' ? 'light' : 'dark';
  }, [theme]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const hasInitialized = useRef(false);

  // Load whiteboard on mount
  useEffect(() => {
    if (!workspaceId) return;
    
    hasInitialized.current = false;
    setLoading(true);
    
    // Load from API and save to Dexie
    api.get(`/workspaces/${workspaceId}/whiteboard`)
      .then(async (response) => {
        const data = response.data?.data || response.data;
        if (data) {
          await db.table<WhiteboardData>('whiteboards').put({
            workspaceId,
            elements: data.elements || [],
            appState: data.appState || {},
          });
        }
      })
      .catch(() => {
        // Whiteboard may not exist yet - that's okay
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  // Update excalidraw scene when data loads
  useEffect(() => {
    if (whiteboardData && excalidrawAPIRef.current && !hasInitialized.current) {
      hasInitialized.current = true;
      excalidrawAPIRef.current.updateScene({
        elements: whiteboardData.elements as ExcalidrawElement[],
      });
    }
  }, [whiteboardData]);

  const debouncedSave = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!workspaceId) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        // Only persist view-related appState, not UI state
        const { viewBackgroundColor, zoom, scrollX, scrollY } = appState;
        const saveData = {
          elements: [...elements],
          appState: { viewBackgroundColor, zoom, scrollX, scrollY },
        };
        
        // Save to Dexie
        await db.table<WhiteboardData>('whiteboards').put({
          workspaceId,
          ...saveData,
        });
        
        // Save to API
        try {
          await api.put(`/workspaces/${workspaceId}/whiteboard`, saveData);
        } catch (err) {
          console.error('Failed to save whiteboard to server:', err);
        }
      }, 1000);
    },
    [workspaceId]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (hasInitialized.current) {
        debouncedSave(elements, appState);
      }
    },
    [debouncedSave]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0 }} className="excalidraw-wrapper">
      <Excalidraw
        theme={excalidrawTheme}
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        initialData={{
          elements: (whiteboardData?.elements as ExcalidrawElement[]) ?? [],
          appState: whiteboardData?.appState ?? {},
        }}
        onChange={handleChange}
      />
    </div>
  );
}
