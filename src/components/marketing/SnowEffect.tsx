import { useEffect, useRef, useState } from "react";

interface SnowEffectProps {
  onClose?: () => void;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  driftSpeed: number;
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
  type: "circle" | "crystal"; // small = circle, large = crystal shape
}

export default function SnowEffect({ onClose: _onClose }: SnowEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
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

    // More snowflakes, varied sizes, some crystal-shaped
    const createSnowflakes = () => {
      const count = 250;
      snowflakesRef.current = [];
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 4 + 1.5;
        snowflakesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size,
          speed: size * 0.25 + Math.random() * 0.4, // heavier flakes fall faster
          drift: (Math.random() - 0.5) * 0.3,
          driftSpeed: Math.random() * 0.02 + 0.005,
          opacity: Math.random() * 0.5 + 0.3,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.03 + 0.01,
          type: size > 3.5 ? "crystal" : "circle",
        });
      }
    };
    createSnowflakes();

    // Draw a 6-pointed crystal snowflake
    const drawCrystal = (x: number, y: number, r: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(timeRef.current * 0.2); // slow rotation
      ctx.strokeStyle = isDarkMode
        ? `rgba(220, 235, 255, ${alpha})`
        : `rgba(80, 110, 150, ${alpha})`;
      ctx.lineWidth = 0.8;
      for (let a = 0; a < 6; a++) {
        const angle = (a * Math.PI) / 3;
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        // Small branches
        const branchLen = r * 0.35;
        const bx = dx * 0.6;
        const by = dy * 0.6;
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(angle + 0.6) * branchLen,
          by + Math.sin(angle + 0.6) * branchLen
        );
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(angle - 0.6) * branchLen,
          by + Math.sin(angle - 0.6) * branchLen
        );
        ctx.stroke();
      }
      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakesRef.current.forEach((flake) => {
        // Gentle wobble side-to-side
        flake.wobblePhase += flake.wobbleSpeed;
        const wobbleX = Math.sin(flake.wobblePhase) * 0.8;

        flake.y += flake.speed;
        flake.x += flake.drift + wobbleX;

        if (flake.y > canvas.height + 10) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width + 10) flake.x = -10;
        if (flake.x < -10) flake.x = canvas.width + 10;

        if (flake.type === "crystal") {
          drawCrystal(flake.x, flake.y, flake.size * 2, flake.opacity);
        } else {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
          ctx.fillStyle = isDarkMode
            ? `rgba(230, 240, 255, ${flake.opacity})`
            : `rgba(80, 110, 150, ${flake.opacity})`;
          ctx.fill();
        }
      });

      // Subtle ground accumulation glow (very faint white at bottom)
      if (isDarkMode) {
        const groundGrad = ctx.createLinearGradient(0, canvas.height - 30, 0, canvas.height);
        groundGrad.addColorStop(0, "rgba(200, 215, 240, 0)");
        groundGrad.addColorStop(1, "rgba(200, 215, 240, 0.04)");
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      }

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
