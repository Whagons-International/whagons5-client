import { useEffect, useRef, useState } from "react";

interface CloudEffectProps {
  onClose?: () => void;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  baseY: number;
  puffs: { dx: number; dy: number; r: number }[]; // relative puff positions
}

export default function CloudEffect({ onClose: _onClose }: CloudEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudsRef = useRef<Cloud[]>([]);
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

    // Generate realistic multi-puff clouds
    const generatePuffs = (size: number): { dx: number; dy: number; r: number }[] => {
      const puffs: { dx: number; dy: number; r: number }[] = [];
      const count = Math.floor(size / 20) + 4;
      for (let i = 0; i < count; i++) {
        const spread = size * 0.7;
        puffs.push({
          dx: (Math.random() - 0.5) * spread,
          dy: (Math.random() - 0.6) * size * 0.3, // cluster upward
          r: size * (0.25 + Math.random() * 0.25),
        });
      }
      // Ensure a wide base
      puffs.push({ dx: -size * 0.3, dy: size * 0.05, r: size * 0.3 });
      puffs.push({ dx: size * 0.3, dy: size * 0.05, r: size * 0.3 });
      // Big center top
      puffs.push({ dx: 0, dy: -size * 0.15, r: size * 0.35 });
      return puffs;
    };

    const createClouds = () => {
      const count = 18;
      cloudsRef.current = [];
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 100 + 70;
        const baseY = Math.random() * canvas.height * 0.55 + canvas.height * 0.08;
        cloudsRef.current.push({
          x: Math.random() * (canvas.width + 400) - 200,
          y: baseY,
          size,
          speed: Math.random() * 0.25 + 0.08,
          opacity: Math.random() * 0.3 + 0.15,
          baseY,
          puffs: generatePuffs(size),
        });
      }
      // Sort by size so smaller (further) clouds draw first
      cloudsRef.current.sort((a, b) => a.size - b.size);
    };
    createClouds();

    const drawCloud = (cloud: Cloud) => {
      ctx.save();
      ctx.globalAlpha = cloud.opacity;

      // Shadow under cloud
      cloud.puffs.forEach((p) => {
        const grad = ctx.createRadialGradient(
          cloud.x + p.dx, cloud.y + p.dy + p.r * 0.3, 0,
          cloud.x + p.dx, cloud.y + p.dy + p.r * 0.3, p.r * 0.8
        );
        grad.addColorStop(0, isDarkMode ? "rgba(80, 90, 110, 0.15)" : "rgba(140, 150, 170, 0.1)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cloud.x + p.dx, cloud.y + p.dy + p.r * 0.3, p.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Main cloud puffs with radial gradient for 3D look
      cloud.puffs.forEach((p) => {
        const cx = cloud.x + p.dx;
        const cy = cloud.y + p.dy;
        const grad = ctx.createRadialGradient(
          cx - p.r * 0.15, cy - p.r * 0.2, p.r * 0.1,
          cx, cy, p.r
        );
        if (isDarkMode) {
          grad.addColorStop(0, "rgba(210, 220, 240, 0.9)");
          grad.addColorStop(0.6, "rgba(180, 195, 220, 0.7)");
          grad.addColorStop(1, "rgba(160, 175, 200, 0)");
        } else {
          grad.addColorStop(0, "rgba(240, 245, 255, 0.85)");
          grad.addColorStop(0.6, "rgba(215, 225, 240, 0.6)");
          grad.addColorStop(1, "rgba(200, 210, 230, 0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      cloudsRef.current.forEach((cloud) => {
        cloud.x += cloud.speed;
        cloud.y = cloud.baseY + Math.sin(cloud.x * 0.0008) * 8;

        if (cloud.x > canvas.width + cloud.size * 1.5) {
          cloud.x = -cloud.size * 1.5;
          cloud.baseY = Math.random() * canvas.height * 0.55 + canvas.height * 0.08;
          cloud.y = cloud.baseY;
        }

        drawCloud(cloud);
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
