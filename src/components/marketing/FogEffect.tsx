import { useEffect, useRef, useState } from "react";

interface FogEffectProps {
  onClose?: () => void;
}

interface FogPatch {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  opacity: number;
  baseY: number;
  wavePhase: number;
  waveAmp: number;
}

export default function FogEffect({ onClose: _onClose }: FogEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogRef = useRef<FogPatch[]>([]);
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

    // Create elongated, overlapping fog patches
    const createFog = () => {
      const count = 50;
      fogRef.current = [];
      for (let i = 0; i < count; i++) {
        const baseY = Math.random() * canvas.height;
        fogRef.current.push({
          x: Math.random() * (canvas.width + 400) - 200,
          y: baseY,
          radiusX: Math.random() * 300 + 150, // wide ellipses
          radiusY: Math.random() * 80 + 40,   // shorter vertically
          speed: Math.random() * 0.25 + 0.08,
          opacity: Math.random() * 0.12 + 0.04,
          baseY,
          wavePhase: Math.random() * Math.PI * 2,
          waveAmp: Math.random() * 20 + 5,
        });
      }
    };
    createFog();

    const animate = () => {
      timeRef.current += 0.004;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Global mist overlay — very subtle blanket
      ctx.fillStyle = isDarkMode ? "rgba(180, 190, 210, 0.015)" : "rgba(140, 155, 175, 0.015)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      fogRef.current.forEach((fog) => {
        fog.x += fog.speed;
        fog.y = fog.baseY + Math.sin(t * 0.5 + fog.wavePhase) * fog.waveAmp;

        // Wrap around
        if (fog.x - fog.radiusX > canvas.width) {
          fog.x = -fog.radiusX;
          fog.baseY = Math.random() * canvas.height;
        }

        // Draw fog as an elongated radial gradient (ellipse)
        ctx.save();
        ctx.translate(fog.x, fog.y);
        ctx.scale(fog.radiusX / fog.radiusY, 1); // stretch horizontally

        const r = fog.radiusY;
        const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
        const c = isDarkMode ? "190, 200, 220" : "130, 145, 165";
        grad.addColorStop(0, `rgba(${c}, ${fog.opacity})`);
        grad.addColorStop(0.5, `rgba(${c}, ${fog.opacity * 0.6})`);
        grad.addColorStop(1, `rgba(${c}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Thicker ground-level fog band
      const groundGrad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
      const gc = isDarkMode ? "180, 190, 210" : "140, 155, 175";
      groundGrad.addColorStop(0, `rgba(${gc}, 0)`);
      groundGrad.addColorStop(0.5, `rgba(${gc}, 0.04)`);
      groundGrad.addColorStop(1, `rgba(${gc}, 0.08)`);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

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
