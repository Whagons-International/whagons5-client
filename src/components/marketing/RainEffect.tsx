import { useEffect, useRef, useState } from "react";

interface RainEffectProps {
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

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  life: number;
}

export default function RainEffect({ onClose: _onClose }: RainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raindropsRef = useRef<Raindrop[]>([]);
  const splashesRef = useRef<Splash[]>([]);
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

    // Wind angle (slight diagonal rain)
    const windAngle = 0.08; // radians — subtle slant to the right

    const createRaindrops = () => {
      const count = 350;
      raindropsRef.current = [];
      for (let i = 0; i < count; i++) {
        const speed = Math.random() * 8 + 12;
        raindropsRef.current.push({
          x: Math.random() * (canvas.width + 200) - 100,
          y: Math.random() * canvas.height,
          length: speed * 1.2 + Math.random() * 8, // longer = faster
          speed,
          opacity: Math.random() * 0.25 + 0.25,
          thickness: Math.random() * 0.8 + 0.6,
        });
      }
    };
    createRaindrops();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle dark overlay for stormy atmosphere
      if (isDarkMode) {
        ctx.fillStyle = "rgba(10, 15, 30, 0.03)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const windDx = Math.sin(windAngle);

      // Update and draw raindrops
      raindropsRef.current.forEach((drop) => {
        drop.y += drop.speed;
        drop.x += windDx * drop.speed * 0.5;

        if (drop.y > canvas.height) {
          // Spawn splash
          if (Math.random() > 0.6) {
            splashesRef.current.push({
              x: drop.x,
              y: canvas.height - 2,
              radius: 0,
              maxRadius: Math.random() * 6 + 3,
              opacity: 0.35,
              life: 1,
            });
          }
          drop.y = -drop.length - Math.random() * 100;
          drop.x = Math.random() * (canvas.width + 200) - 100;
        }

        // Draw raindrop as a line with slight wind slant
        const endX = drop.x - windDx * drop.length * 0.3;
        const endY = drop.y - drop.length;

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = isDarkMode
          ? `rgba(170, 195, 230, ${drop.opacity})`
          : `rgba(50, 80, 125, ${drop.opacity})`;
        ctx.lineWidth = drop.thickness;
        ctx.stroke();
      });

      // Update and draw splashes
      splashesRef.current = splashesRef.current.filter((s) => {
        s.life -= 0.04;
        s.radius += (s.maxRadius - s.radius) * 0.15;
        s.opacity = s.life * 0.3;
        if (s.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, Math.PI, 0); // half-circle splash
        ctx.strokeStyle = isDarkMode
          ? `rgba(170, 195, 230, ${s.opacity})`
          : `rgba(50, 80, 125, ${s.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        return true;
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
