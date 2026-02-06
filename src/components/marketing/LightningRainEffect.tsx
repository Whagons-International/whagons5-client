import { useEffect, useRef, useState } from "react";

interface LightningRainEffectProps {
  onClose?: () => void;
}

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  thickness: number;
}

interface BoltSegment {
  x1: number; y1: number; x2: number; y2: number;
}

export default function LightningRainEffect({ onClose: _onClose }: LightningRainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raindropsRef = useRef<Raindrop[]>([]);
  const animationFrameRef = useRef<number>();
  const [flash, setFlash] = useState(false);
  const boltsRef = useRef<{ segments: BoltSegment[]; life: number; maxLife: number }[]>([]);
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

    const windAngle = 0.12; // stronger wind for storm

    // Heavy rain
    const createRain = () => {
      const count = 400;
      raindropsRef.current = [];
      for (let i = 0; i < count; i++) {
        const speed = Math.random() * 8 + 14;
        raindropsRef.current.push({
          x: Math.random() * (canvas.width + 300) - 150,
          y: Math.random() * canvas.height,
          length: speed * 1.3 + Math.random() * 10,
          speed,
          opacity: Math.random() * 0.35 + 0.25,
          thickness: Math.random() * 1 + 0.8,
        });
      }
    };
    createRain();

    // Generate bolt with branching
    const generateBolt = (sx: number, sy: number, ey: number, spread: number, depth: number): BoltSegment[] => {
      const segs: BoltSegment[] = [];
      const steps = Math.floor((ey - sy) / 30) + 4;
      let x = sx, y = sy;
      for (let i = 0; i < steps; i++) {
        const segLen = (ey - sy) / steps;
        const jitter = (Math.random() - 0.5) * spread;
        const nx = x + jitter;
        const ny = y + segLen;
        segs.push({ x1: x, y1: y, x2: nx, y2: ny });
        if (depth > 0 && Math.random() > 0.6) {
          const ba = (Math.random() - 0.5) * 1.4;
          const bl = Math.random() * 100 + 50;
          segs.push({ x1: nx, y1: ny, x2: nx + Math.sin(ba) * bl, y2: ny + bl * 0.4 });
          if (depth > 1) {
            const sub = generateBolt(nx, ny, ny + bl * 0.5, spread * 0.4, depth - 1);
            segs.push(...sub);
          }
        }
        x = nx; y = ny;
        if (y >= ey) break;
      }
      return segs;
    };

    // Schedule lightning
    let timeout: ReturnType<typeof setTimeout>;
    const strike = () => {
      if (Math.random() > 0.3) {
        const sx = Math.random() * canvas.width;
        const segs = generateBolt(sx, 0, canvas.height * (0.6 + Math.random() * 0.4), 60, 2);
        const ml = 14 + Math.random() * 8;
        boltsRef.current.push({ segments: segs, life: ml, maxLife: ml });

        if (Math.random() > 0.55) {
          const s2 = generateBolt(sx + (Math.random() - 0.5) * 100, 0, canvas.height * 0.7, 50, 1);
          boltsRef.current.push({ segments: s2, life: ml * 0.6, maxLife: ml * 0.6 });
        }

        setFlash(true);
        setTimeout(() => setFlash(false), 70 + Math.random() * 60);
      }
      timeout = setTimeout(strike, 1200 + Math.random() * 3000);
    };
    timeout = setTimeout(strike, 600);

    const windDx = Math.sin(windAngle);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle dark atmosphere
      ctx.fillStyle = isDarkMode ? "rgba(8, 12, 25, 0.04)" : "rgba(40, 50, 70, 0.02)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rain
      raindropsRef.current.forEach((d) => {
        d.y += d.speed;
        d.x += windDx * d.speed * 0.5;
        if (d.y > canvas.height) {
          d.y = -d.length - Math.random() * 80;
          d.x = Math.random() * (canvas.width + 300) - 150;
        }
        const ex = d.x - windDx * d.length * 0.3;
        const ey = d.y - d.length;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = isDarkMode
          ? `rgba(170, 195, 230, ${d.opacity})`
          : `rgba(50, 80, 125, ${d.opacity})`;
        ctx.lineWidth = d.thickness;
        ctx.stroke();
      });

      // Lightning bolts
      boltsRef.current = boltsRef.current.filter((bolt) => {
        bolt.life -= 1;
        if (bolt.life <= 0) return false;
        const alpha = bolt.life / bolt.maxLife;

        // Outer glow
        ctx.save();
        ctx.shadowBlur = isDarkMode ? 30 : 50;
        ctx.shadowColor = isDarkMode ? `rgba(200, 220, 255, ${alpha * 0.6})` : `rgba(150, 200, 255, ${alpha * 0.7})`;
        ctx.strokeStyle = isDarkMode
          ? `rgba(180, 200, 255, ${alpha * 0.4})`
          : `rgba(160, 190, 255, ${alpha * 0.5})`;
        ctx.lineWidth = isDarkMode ? 7 : 10;
        ctx.beginPath();
        bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
        ctx.stroke();
        ctx.restore();

        // Bright core
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = isDarkMode ? 2.5 : 3.5;
        ctx.beginPath();
        bolt.segments.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
        ctx.stroke();
        ctx.restore();

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
          isDarkMode ? "bg-white" : "bg-blue-100"
        } ${flash ? (isDarkMode ? "opacity-25" : "opacity-20") : "opacity-0"}`}
      />
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
