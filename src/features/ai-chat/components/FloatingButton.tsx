import React, { useState, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const FloatingButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('assistant:btn-pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 0, y: 0 };
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dragging = useRef(false);
  const start = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const pt = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      const dx = pt.clientX - start.current.x;
      const dy = pt.clientY - start.current.y;
      const x = origin.current.x + dx;
      const y = origin.current.y + dy;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = 48;
      const clampedX = clamp(x, -vw/2 + 16, vw/2 - size - 16);
      const clampedY = clamp(y, -vh/2 + 16, vh/2 - size - 16);
      setPosition({ x: clampedX, y: clampedY });
    };
    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      try { localStorage.setItem('assistant:btn-pos', JSON.stringify(position)); } catch {}
      document.removeEventListener('mousemove', handleMove as any);
      document.removeEventListener('mouseup', handleUp as any);
      document.removeEventListener('touchmove', handleMove as any);
      document.removeEventListener('touchend', handleUp as any);
    };
    if (dragging.current) {
      document.addEventListener('mousemove', handleMove as any);
      document.addEventListener('mouseup', handleUp as any);
      document.addEventListener('touchmove', handleMove as any, { passive: false } as any);
      document.addEventListener('touchend', handleUp as any);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove as any);
      document.removeEventListener('mouseup', handleUp as any);
      document.removeEventListener('touchmove', handleMove as any);
      document.removeEventListener('touchend', handleUp as any);
    };
  }, [position]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    dragging.current = true;
    start.current = { x: pt.clientX, y: pt.clientY };
    origin.current = { x: position.x, y: position.y };
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={btnRef}
            variant="default"
            size="icon"
            aria-label="Open Copilot"
            onClick={onClick}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="fixed bottom-5 right-5 z-[60] shadow-lg rounded-full size-12 p-0 bg-gradient-to-br from-[#0078D4] via-[#00B4D8] to-[#00D4AA] hover:from-[#006BB3] hover:via-[#0099B8] hover:to-[#00B899] transition-all"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          >
            <Sparkles className="size-5 text-white" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Copilot</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FloatingButton;
