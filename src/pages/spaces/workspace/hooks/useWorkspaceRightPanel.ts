import { useEffect, useState, useCallback } from 'react';

export type RightPanelType = 'chat' | 'resources' | 'whiteboard' | null;

// Width constraints
const MIN_WIDTH = 280;
const MAX_WIDTH_DEFAULT = 640;
const DEFAULT_WIDTH = 384;
const DEFAULT_WIDTH_WHITEBOARD = 800;

// Get max width for whiteboard (80% of viewport, but at least 640px)
const getMaxWidthWhiteboard = () => Math.max(MAX_WIDTH_DEFAULT, Math.floor(window.innerWidth * 0.8));

// Storage keys
const STORAGE_KEY_PANEL = 'wh_workspace_right_panel';
const STORAGE_KEY_WIDTH = 'wh_workspace_right_panel_w';
const STORAGE_KEY_WIDTH_WHITEBOARD = 'wh_workspace_right_panel_w_whiteboard';

export function useWorkspaceRightPanel() {
  const [rightPanel, setRightPanelState] = useState<RightPanelType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PANEL);
      if (saved === 'chat' || saved === 'resources' || saved === 'whiteboard') return saved;
    } catch {}
    return null;
  });

  // Load width based on initial panel type
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      const initialPanel = localStorage.getItem(STORAGE_KEY_PANEL);
      if (initialPanel === 'whiteboard') {
        const saved = localStorage.getItem(STORAGE_KEY_WIDTH_WHITEBOARD);
        const maxW = getMaxWidthWhiteboard();
        return saved ? Math.max(MIN_WIDTH, Math.min(maxW, parseInt(saved, 10))) : DEFAULT_WIDTH_WHITEBOARD;
      } else {
        const saved = localStorage.getItem(STORAGE_KEY_WIDTH);
        return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_DEFAULT, parseInt(saved, 10))) : DEFAULT_WIDTH;
      }
    } catch {
      return DEFAULT_WIDTH;
    }
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState<number | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState<number | null>(null);

  // Get current max width based on panel type
  const getMaxWidth = useCallback(() => {
    return rightPanel === 'whiteboard' ? getMaxWidthWhiteboard() : MAX_WIDTH_DEFAULT;
  }, [rightPanel]);

  const setRightPanel = useCallback((panel: RightPanelType) => {
    setRightPanelState((prev) => {
      // Save width for the previous panel type before switching
      if (prev && prev !== panel) {
        try {
          const key = prev === 'whiteboard' ? STORAGE_KEY_WIDTH_WHITEBOARD : STORAGE_KEY_WIDTH;
          // We need the current width, but we're in a state setter - use a ref pattern or just save outside
        } catch {}
      }
      return panel;
    });

    // Save panel selection
    try {
      if (panel) {
        localStorage.setItem(STORAGE_KEY_PANEL, panel);
      } else {
        localStorage.removeItem(STORAGE_KEY_PANEL);
      }
    } catch {}

    // Load the appropriate width for the new panel
    if (panel) {
      try {
        if (panel === 'whiteboard') {
          const saved = localStorage.getItem(STORAGE_KEY_WIDTH_WHITEBOARD);
          const maxW = getMaxWidthWhiteboard();
          const newWidth = saved ? Math.max(MIN_WIDTH, Math.min(maxW, parseInt(saved, 10))) : DEFAULT_WIDTH_WHITEBOARD;
          setRightPanelWidth(newWidth);
        } else {
          const saved = localStorage.getItem(STORAGE_KEY_WIDTH);
          const newWidth = saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_DEFAULT, parseInt(saved, 10))) : DEFAULT_WIDTH;
          setRightPanelWidth(newWidth);
        }
      } catch {}
    }
  }, []);

  const toggleRightPanel = useCallback((panel: RightPanelType) => {
    setRightPanelState((prev) => {
      const newPanel = prev === panel ? null : panel;
      
      // Save panel selection
      try {
        if (newPanel) {
          localStorage.setItem(STORAGE_KEY_PANEL, newPanel);
        } else {
          localStorage.removeItem(STORAGE_KEY_PANEL);
        }
      } catch {}

      // Load the appropriate width for the new panel
      if (newPanel) {
        try {
          if (newPanel === 'whiteboard') {
            const saved = localStorage.getItem(STORAGE_KEY_WIDTH_WHITEBOARD);
            const maxW = getMaxWidthWhiteboard();
            const newWidth = saved ? Math.max(MIN_WIDTH, Math.min(maxW, parseInt(saved, 10))) : DEFAULT_WIDTH_WHITEBOARD;
            setRightPanelWidth(newWidth);
          } else {
            const saved = localStorage.getItem(STORAGE_KEY_WIDTH);
            const newWidth = saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_DEFAULT, parseInt(saved, 10))) : DEFAULT_WIDTH;
            setRightPanelWidth(newWidth);
          }
        } catch {}
      }

      return newPanel;
    });
  }, []);

  // Save width to localStorage when it changes (save to appropriate key based on panel type)
  useEffect(() => {
    if (!rightPanel) return;
    try {
      const key = rightPanel === 'whiteboard' ? STORAGE_KEY_WIDTH_WHITEBOARD : STORAGE_KEY_WIDTH;
      localStorage.setItem(key, String(rightPanelWidth));
    } catch {}
  }, [rightPanelWidth, rightPanel]);

  // Handle resize with dynamic max width
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (resizeStartX == null || resizeStartWidth == null) return;
      const dx = resizeStartX - e.clientX;
      const maxWidth = rightPanel === 'whiteboard' ? getMaxWidthWhiteboard() : MAX_WIDTH_DEFAULT;
      const next = Math.max(MIN_WIDTH, Math.min(maxWidth, resizeStartWidth + dx));
      setRightPanelWidth(next);
      e.preventDefault();
    };
    const handleUp = () => {
      setIsResizing(false);
      setResizeStartX(null);
      setResizeStartWidth(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth, rightPanel]);

  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(rightPanelWidth);
  };

  return {
    rightPanel,
    setRightPanel,
    rightPanelWidth,
    isResizing,
    toggleRightPanel,
    startResize,
    getMaxWidth,
  };
}
