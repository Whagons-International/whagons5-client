import { useEffect, useRef, useCallback, useState } from 'react';
import { useLaserPointer } from '@/providers/LaserPointerProvider';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface Stroke {
  points: Point[];
  startTime: number;
}

const FADE_DURATION = 1000; // 1 second fade
const CLEAR_FADE_DURATION = 400; // 400ms fade when clearing all strokes
const STROKE_COLOR = '#FF3333'; // Vibrant red
const STROKE_WIDTH = 4;
const GLOW_BLUR = 8;
const DOUBLE_CLICK_THRESHOLD = 300; // ms for double-click detection

// Custom pen cursor as SVG data URL (red pen tip pointing to bottom-left)
const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23FF3333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, crosshair`;

export function LaserPointer() {
  const { mode, isActive } = useLaserPointer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const prevModeRef = useRef(mode);
  const lastRightClickTimeRef = useRef<number>(0);
  const [isDrawing, setIsDrawing] = useState(false); // Track drawing state for cursor
  const isClearingRef = useRef(false); // Track if we're in clearing fade-out animation
  const clearStartTimeRef = useRef<number>(0); // When the clear fade started

  // Resize canvas to match window
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Draw a single stroke with opacity based on age and mode
  // If isCurrentStroke is true or mode is 'persist', draw at full opacity
  // clearOpacity is an additional multiplier for the clearing fade-out animation
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, currentTime: number, isCurrentStroke: boolean = false, isPersistMode: boolean = false, clearOpacity: number = 1) => {
    if (stroke.points.length < 2) return;

    let opacity = 1;
    
    // Only apply fading for finalized strokes in fade mode
    if (!isCurrentStroke && !isPersistMode) {
      const age = currentTime - stroke.startTime;
      opacity = Math.max(0, 1 - age / FADE_DURATION);
      
      if (opacity <= 0) return;
    }

    // Apply clear fade-out multiplier
    opacity *= clearOpacity;
    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = STROKE_COLOR;
    ctx.shadowBlur = GLOW_BLUR * opacity;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const currentTime = Date.now();
    const isPersistMode = mode === 'persist';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate clear fade opacity if we're in clearing mode
    let clearOpacity = 1;
    if (isClearingRef.current) {
      const clearAge = currentTime - clearStartTimeRef.current;
      clearOpacity = Math.max(0, 1 - clearAge / CLEAR_FADE_DURATION);
      
      // If fade is complete, actually clear the strokes
      if (clearOpacity <= 0) {
        strokesRef.current = [];
        currentStrokeRef.current = null;
        isClearingRef.current = false;
        clearStartTimeRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
    }

    // Filter out fully faded strokes (only in fade mode and not during clearing)
    if (!isPersistMode && !isClearingRef.current) {
      strokesRef.current = strokesRef.current.filter(stroke => {
        const age = currentTime - stroke.startTime;
        return age < FADE_DURATION;
      });
    }

    // Draw all finalized strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, currentTime, false, isPersistMode, clearOpacity);
    }

    // Draw current stroke if drawing (at full opacity, no fading, but with clear opacity)
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
      drawStroke(ctx, currentStrokeRef.current, currentTime, true, isPersistMode, clearOpacity);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [drawStroke, mode]);

  // Handle mouse events - only right-click (button === 2) triggers drawing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isActive) return;
    
    // Only trigger on right-click (button 2)
    if (e.button !== 2) return;
    
    // Prevent context menu and stop propagation to other components (like AG Grid)
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const now = Date.now();
    
    // Check for double right-click to clear all strokes with fade
    if (now - lastRightClickTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
      // Double right-click detected - start clearing fade animation
      if (strokesRef.current.length > 0 || currentStrokeRef.current) {
        isClearingRef.current = true;
        clearStartTimeRef.current = now;
      }
      isDrawingRef.current = false;
      lastRightClickTimeRef.current = 0; // Reset to prevent triple-click issues
      return;
    }
    
    lastRightClickTimeRef.current = now;
    
    isDrawingRef.current = true;
    setIsDrawing(true); // Update state for cursor
    currentStrokeRef.current = {
      points: [{ x: e.clientX, y: e.clientY, timestamp: now }],
      startTime: now,
    };
  }, [isActive]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    
    currentStrokeRef.current.points.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    });
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Only handle right-click release
    if (e.button !== 2) return;
    
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
      // Finalize stroke with current time as start for fade
      currentStrokeRef.current.startTime = Date.now();
      strokesRef.current.push(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    setIsDrawing(false); // Update state for cursor
  }, []);

  // Prevent context menu when laser pointer is active
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, [isActive]);

  // Clear strokes when mode changes to 'off'
  useEffect(() => {
    if (prevModeRef.current !== 'off' && mode === 'off') {
      // Mode changed to off, clear all strokes
      strokesRef.current = [];
      currentStrokeRef.current = null;
      isDrawingRef.current = false;
      isClearingRef.current = false;
      clearStartTimeRef.current = 0;
    }
    prevModeRef.current = mode;
  }, [mode]);

  // Manage cursor style globally - only show pen cursor while drawing (right-click held)
  // Use a style tag with !important to override all other cursor styles
  useEffect(() => {
    const styleId = 'laser-pointer-cursor-style';
    
    if (!isActive || !isDrawing) {
      // Remove cursor style when not active or not drawing
      const el = document.getElementById(styleId);
      if (el) {
        el.remove();
      }
      return;
    }

    // Create a style element to force the cursor globally with !important
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    // Apply cursor to everything with !important to override any other styles
    styleEl.textContent = `
      *, *::before, *::after {
        cursor: ${PEN_CURSOR} !important;
      }
    `;

    return () => {
      const el = document.getElementById(styleId);
      if (el) {
        el.remove();
      }
    };
  }, [isActive, isDrawing]);

  // Setup and cleanup
  useEffect(() => {
    if (!isActive) {
      // Clear strokes when deactivated
      strokesRef.current = [];
      currentStrokeRef.current = null;
      isDrawingRef.current = false;
      isClearingRef.current = false;
      clearStartTimeRef.current = 0;
      return;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Add mouse event listeners at window level
    // Use capture phase to intercept events before they reach other elements
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, resizeCanvas, animate, handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        touchAction: 'none',
      }}
    />
  );
}
