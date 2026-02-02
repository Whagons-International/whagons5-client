import { useEffect, useState } from 'react';

export function useWorkspaceRightPanel() {
  const [rightPanel, setRightPanelState] = useState<'chat' | 'resources' | null>(() => {
    try {
      const saved = localStorage.getItem('wh_workspace_right_panel');
      if (saved === 'chat' || saved === 'resources') return saved;
    } catch {}
    return null;
  });

  const setRightPanel = (panel: 'chat' | 'resources' | null) => {
    setRightPanelState(panel);
    try {
      if (panel) {
        localStorage.setItem('wh_workspace_right_panel', panel);
      } else {
        localStorage.removeItem('wh_workspace_right_panel');
      }
    } catch {}
  };
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wh_workspace_right_panel_w');
      return saved ? Math.max(280, Math.min(640, parseInt(saved, 10))) : 384;
    } catch {
      return 384;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState<number | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState<number | null>(null);

  const toggleRightPanel = (panel: 'chat' | 'resources') => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  useEffect(() => {
    try {
      localStorage.setItem('wh_workspace_right_panel_w', String(rightPanelWidth));
    } catch {}
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (resizeStartX == null || resizeStartWidth == null) return;
      const dx = resizeStartX - e.clientX;
      const next = Math.max(280, Math.min(640, resizeStartWidth + dx));
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
  }, [isResizing, resizeStartX, resizeStartWidth]);

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
  };
}
