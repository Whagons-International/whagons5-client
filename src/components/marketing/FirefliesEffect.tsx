import { useEffect, useRef, useState } from "react";

interface FirefliesEffectProps {
  onClose?: () => void;
}

interface Firefly {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  speed: number;
  glowPhase: number;
  glowSpeed: number;
  glowMin: number;
  glowMax: number;
  hue: number; // warm yellow-green range
  trail: { x: number; y: number; alpha: number }[];
  pauseTime: number;
  driftAngle: number;
  driftSpeed: number;
}

export default function FirefliesEffect({ onClose: _onClose }: FirefliesEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firefliesRef = useRef<Firefly[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const updateThemeState = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", updateThemeState);
    return () => {
      observer.disconnect();
      mql.removeEventListener("change", updateThemeState);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const createFireflies = () => {
      const count = 45;
      firefliesRef.current = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        firefliesRef.current.push({
          x,
          y,
          targetX: x + (Math.random() - 0.5) * 200,
          targetY: y + (Math.random() - 0.5) * 200,
          size: Math.random() * 2.5 + 1.5,
          speed: Math.random() * 0.6 + 0.2,
          glowPhase: Math.random() * Math.PI * 2,
          glowSpeed: Math.random() * 0.03 + 0.015,
          glowMin: 0.05,
          glowMax: Math.random() * 0.5 + 0.5,
          hue: Math.random() * 30 + 50, // 50-80: yellow to yellow-green
          trail: [],
          pauseTime: 0,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: Math.random() * 0.01 + 0.005,
        });
      }
    };
    createFireflies();

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle dark ambient overlay for atmosphere in dark mode
      if (isDarkMode) {
        ctx.fillStyle = "rgba(0, 10, 5, 0.01)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      firefliesRef.current.forEach((ff) => {
        // Bioluminescent pulsing
        ff.glowPhase += ff.glowSpeed;
        // Smooth pulsing with occasional bright flashes
        const basePulse = (Math.sin(ff.glowPhase) + 1) / 2;
        const flashChance = Math.sin(ff.glowPhase * 3.7) > 0.95 ? 0.3 : 0;
        const glow = ff.glowMin + (ff.glowMax - ff.glowMin) * basePulse + flashChance;

        // Lazy drifting movement
        ff.driftAngle += ff.driftSpeed + (Math.random() - 0.5) * 0.02;

        if (ff.pauseTime > 0) {
          ff.pauseTime--;
          // Even when paused, tiny micro-drift
          ff.x += Math.sin(timeRef.current * 2 + ff.glowPhase) * 0.1;
          ff.y += Math.cos(timeRef.current * 1.5 + ff.glowPhase) * 0.08;
        } else {
          const dx = ff.targetX - ff.x;
          const dy = ff.targetY - ff.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 10) {
            // Pick a new nearby target
            ff.targetX = ff.x + (Math.random() - 0.5) * 300;
            ff.targetY = ff.y + (Math.random() - 0.5) * 300;
            // Clamp to canvas
            ff.targetX = Math.max(20, Math.min(canvas.width - 20, ff.targetX));
            ff.targetY = Math.max(20, Math.min(canvas.height - 20, ff.targetY));
            // Occasionally pause
            if (Math.random() > 0.5) {
              ff.pauseTime = Math.random() * 100 + 40;
            }
          } else {
            // Smooth curved movement toward target
            const moveX = (dx / dist) * ff.speed + Math.sin(ff.driftAngle) * 0.3;
            const moveY = (dy / dist) * ff.speed + Math.cos(ff.driftAngle) * 0.3;
            ff.x += moveX;
            ff.y += moveY;
          }
        }

        // Wrap around screen edges gently
        if (ff.x < -20) ff.x = canvas.width + 20;
        if (ff.x > canvas.width + 20) ff.x = -20;
        if (ff.y < -20) ff.y = canvas.height + 20;
        if (ff.y > canvas.height + 20) ff.y = -20;

        // Update trail
        ff.trail.push({ x: ff.x, y: ff.y, alpha: glow });
        if (ff.trail.length > 8) ff.trail.shift();

        // Draw trail (fading path)
        ff.trail.forEach((t, i) => {
          const trailAlpha = (i / ff.trail.length) * glow * 0.3;
          const trailSize = ff.size * (i / ff.trail.length) * 0.5;
          if (trailAlpha > 0.01) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
            ctx.fillStyle = isDarkMode
              ? `hsla(${ff.hue}, 100%, 70%, ${trailAlpha})`
              : `hsla(${ff.hue}, 80%, 45%, ${trailAlpha})`;
            ctx.fill();
          }
        });

        // Draw outer glow (large, soft)
        if (glow > 0.1) {
          const glowRadius = ff.size * 8 * glow;
          const gradient = ctx.createRadialGradient(
            ff.x, ff.y, 0,
            ff.x, ff.y, glowRadius
          );
          if (isDarkMode) {
            gradient.addColorStop(0, `hsla(${ff.hue}, 100%, 75%, ${glow * 0.4})`);
            gradient.addColorStop(0.3, `hsla(${ff.hue}, 100%, 60%, ${glow * 0.15})`);
            gradient.addColorStop(1, `hsla(${ff.hue}, 100%, 50%, 0)`);
          } else {
            gradient.addColorStop(0, `hsla(${ff.hue}, 90%, 50%, ${glow * 0.3})`);
            gradient.addColorStop(0.3, `hsla(${ff.hue}, 90%, 40%, ${glow * 0.1})`);
            gradient.addColorStop(1, `hsla(${ff.hue}, 90%, 30%, 0)`);
          }
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Draw core (bright center)
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, ff.size * glow, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode
          ? `hsla(${ff.hue}, 100%, 85%, ${glow})`
          : `hsla(${ff.hue}, 90%, 55%, ${glow})`;
        ctx.fill();

        // Bright white center dot
        if (glow > 0.3) {
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, ff.size * 0.4 * glow, 0, Math.PI * 2);
          ctx.fillStyle = isDarkMode
            ? `rgba(255, 255, 240, ${glow * 0.8})`
            : `rgba(200, 200, 100, ${glow * 0.6})`;
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isDarkMode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
