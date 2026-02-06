import { useEffect, useRef, useState } from "react";

interface MeteorEffectProps {
  onClose?: () => void;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
  size: number; // head size
  trail: { x: number; y: number; alpha: number }[];
  color: { r: number; g: number; b: number };
  sparkles: { dx: number; dy: number; life: number; maxLife: number }[];
}

export default function MeteorEffect({ onClose: _onClose }: MeteorEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meteorsRef = useRef<Meteor[]>([]);
  const animationFrameRef = useRef<number>();
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

    const meteorColors = isDarkMode
      ? [
          { r: 255, g: 255, b: 255 },
          { r: 200, g: 220, b: 255 },
          { r: 255, g: 200, b: 150 }, // warm orange tint
          { r: 180, g: 220, b: 255 },
        ]
      : [
          { r: 60, g: 80, b: 130 },
          { r: 80, g: 100, b: 160 },
          { r: 100, g: 70, b: 50 },
          { r: 70, g: 90, b: 140 },
        ];

    const initMeteors = () => {
      const count = 18;
      meteorsRef.current = [];
      for (let i = 0; i < count; i++) {
        meteorsRef.current.push({
          x: 0, y: 0,
          length: Math.random() * 100 + 50,
          speed: Math.random() * 10 + 14,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
          opacity: 0,
          active: false,
          size: Math.random() * 2 + 2,
          trail: [],
          color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
          sparkles: [],
        });
      }
    };
    initMeteors();

    const spawnInterval = setInterval(() => {
      const inactive = meteorsRef.current.find((m) => !m.active);
      if (inactive && Math.random() > 0.4) {
        inactive.x = Math.random() * canvas.width * 0.8;
        inactive.y = -50;
        inactive.active = true;
        inactive.opacity = Math.random() * 0.4 + 0.6;
        inactive.trail = [];
        inactive.sparkles = [];
        inactive.color = meteorColors[Math.floor(Math.random() * meteorColors.length)];
      }
    }, 400);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      meteorsRef.current.forEach((m) => {
        if (!m.active) return;

        // Store trail position
        m.trail.push({ x: m.x, y: m.y, alpha: m.opacity });
        if (m.trail.length > 20) m.trail.shift();

        // Spawn sparkles along trail
        if (Math.random() > 0.5) {
          m.sparkles.push({
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            life: 15 + Math.random() * 10,
            maxLife: 25,
          });
        }

        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;

        if (m.y > canvas.height + 100 || m.x > canvas.width + 100) {
          m.active = false;
          return;
        }

        const { r, g, b } = m.color;

        // Draw trail (fading segments)
        for (let i = 0; i < m.trail.length - 1; i++) {
          const t = m.trail[i];
          const frac = i / m.trail.length;
          const a = frac * m.opacity * 0.5;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(m.trail[i + 1].x, m.trail[i + 1].y);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.lineWidth = m.size * frac + 0.5;
          ctx.stroke();
        }

        // Draw head glow
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${m.opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${m.opacity})`;
        ctx.fill();
        ctx.restore();

        // Draw sparkles
        m.sparkles = m.sparkles.filter((sp) => {
          sp.life--;
          if (sp.life <= 0) return false;
          const sa = (sp.life / sp.maxLife) * m.opacity * 0.5;
          ctx.beginPath();
          ctx.arc(m.x + sp.dx * (1 - sp.life / sp.maxLife) * 3, m.y + sp.dy * (1 - sp.life / sp.maxLife) * 3, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sa})`;
          ctx.fill();
          return true;
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearInterval(spawnInterval);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isDarkMode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
