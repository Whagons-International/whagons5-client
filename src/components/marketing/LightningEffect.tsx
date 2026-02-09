import { useEffect, useRef, useState } from "react";

interface LightningEffectProps {
  onClose?: () => void;
}

interface BoltSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export default function LightningEffect({ onClose: _onClose }: LightningEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [flash, setFlash] = useState(false);
  const boltsRef = useRef<{ segments: BoltSegment[]; life: number; maxLife: number; brightness: number }[]>([]);
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

    // Generate a realistic branching bolt
    const generateBolt = (
      startX: number, startY: number, endY: number, spread: number, depth: number
    ): BoltSegment[] => {
      const segments: BoltSegment[] = [];
      const steps = Math.floor((endY - startY) / 25) + 5;
      let x = startX;
      let y = startY;

      for (let i = 0; i < steps; i++) {
        const segLen = (endY - startY) / steps;
        const jitter = (Math.random() - 0.5) * spread;
        const nx = x + jitter;
        const ny = y + segLen;
        segments.push({ x1: x, y1: y, x2: nx, y2: ny });

        // Branches
        if (depth > 0 && Math.random() > 0.65) {
          const branchAngle = (Math.random() - 0.5) * 1.2;
          const branchLen = Math.random() * 80 + 40;
          const bx = nx + Math.sin(branchAngle) * branchLen;
          const by = ny + Math.cos(branchAngle) * branchLen * 0.5;
          const sub = generateBolt(nx, ny, by, spread * 0.5, depth - 1);
          segments.push(...sub);
          segments.push({ x1: nx, y1: ny, x2: bx, y2: by });
        }
        x = nx;
        y = ny;
        if (y >= endY) break;
      }
      return segments;
    };

    // Schedule lightning strikes
    let timeout: ReturnType<typeof setTimeout>;

    const strike = () => {
      if (Math.random() > 0.25) {
        const startX = Math.random() * canvas.width;
        const segments = generateBolt(startX, 0, canvas.height * (0.6 + Math.random() * 0.4), 55, 2);
        const maxLife = 12 + Math.random() * 8;
        boltsRef.current.push({ segments, life: maxLife, maxLife, brightness: 0.8 + Math.random() * 0.2 });

        if (Math.random() > 0.6) {
          const s2 = generateBolt(startX + (Math.random() - 0.5) * 80, 0, canvas.height * 0.7, 45, 1);
          boltsRef.current.push({ segments: s2, life: maxLife * 0.7, maxLife: maxLife * 0.7, brightness: 0.6 });
        }

        setFlash(true);
        setTimeout(() => setFlash(false), 80 + Math.random() * 50);
      }
      timeout = setTimeout(strike, 1800 + Math.random() * 3500);
    };
    timeout = setTimeout(strike, 500);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boltsRef.current = boltsRef.current.filter((bolt) => {
        bolt.life -= 1;
        if (bolt.life <= 0) return false;
        const alpha = (bolt.life / bolt.maxLife) * bolt.brightness;

        if (isDarkMode) {
          // Dark mode: bright white/blue bolts
          // Outer glow
          ctx.save();
          ctx.shadowBlur = 25;
          ctx.shadowColor = `rgba(200, 220, 255, ${alpha * 0.6})`;
          ctx.strokeStyle = `rgba(180, 200, 255, ${alpha * 0.5})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
          ctx.stroke();
          ctx.restore();

          // Bright core
          ctx.save();
          ctx.shadowBlur = 12;
          ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
          ctx.stroke();
          ctx.restore();
        } else {
          // Light mode: dark purple-blue bolts with colored glow
          // Outer glow
          ctx.save();
          ctx.shadowBlur = 35;
          ctx.shadowColor = `rgba(80, 60, 180, ${alpha * 0.5})`;
          ctx.strokeStyle = `rgba(100, 80, 200, ${alpha * 0.4})`;
          ctx.lineWidth = 8;
          ctx.beginPath();
          bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
          ctx.stroke();
          ctx.restore();

          // Mid layer
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(60, 40, 160, ${alpha * 0.6})`;
          ctx.strokeStyle = `rgba(70, 50, 170, ${alpha * 0.7})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
          ctx.stroke();
          ctx.restore();

          // Bright core — dark blue
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(40, 20, 120, ${alpha * 0.8})`;
          ctx.strokeStyle = `rgba(50, 30, 140, ${alpha * 0.9})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
          ctx.stroke();
          ctx.restore();
        }

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(timeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isDarkMode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div
        className={`absolute inset-0 transition-opacity duration-75 ${
          isDarkMode ? "bg-white" : "bg-indigo-200"
        } ${flash ? (isDarkMode ? "opacity-20" : "opacity-15") : "opacity-0"}`}
      />
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
