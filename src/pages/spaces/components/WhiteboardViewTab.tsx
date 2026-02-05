import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { AppDispatch, RootState } from '@/store/store';
import { loadWhiteboard, saveWhiteboard } from '@/store/reducers/whiteboardSlice';
import { useTheme } from '@/providers/ThemeProvider';

export default function WhiteboardViewTab({ workspaceId }: { workspaceId: string | undefined }) {
  const dispatch = useDispatch<AppDispatch>();
  const whiteboardState = useSelector((state: RootState) => state.whiteboard);
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
    if (workspaceId) {
      hasInitialized.current = false;
      dispatch(loadWhiteboard(workspaceId));
    }
  }, [workspaceId, dispatch]);

  // Update excalidraw scene when data loads
  useEffect(() => {
    if (whiteboardState.data && excalidrawAPIRef.current && !hasInitialized.current) {
      hasInitialized.current = true;
      excalidrawAPIRef.current.updateScene({
        elements: whiteboardState.data.elements as ExcalidrawElement[],
      });
    }
  }, [whiteboardState.data]);

  const debouncedSave = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!workspaceId) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Only persist view-related appState, not UI state
        const { viewBackgroundColor, zoom, scrollX, scrollY } = appState;
        dispatch(
          saveWhiteboard({
            workspaceId,
            elements,
            appState: { viewBackgroundColor, zoom, scrollX, scrollY },
          })
        );
      }, 1000);
    },
    [workspaceId, dispatch]
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

  if (whiteboardState.loading) {
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
          elements: (whiteboardState.data?.elements as ExcalidrawElement[]) ?? [],
          appState: whiteboardState.data?.appState ?? {},
        }}
        onChange={handleChange}
      />
    </div>
  );
}
