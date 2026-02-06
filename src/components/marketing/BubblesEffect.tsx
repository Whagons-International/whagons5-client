import { useEffect, useRef, useState } from "react";

interface BubblesEffectProps {
  onClose?: () => void;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  drift: number;
  hueShift: number;
  hueSpeed: number;
  shimmerPhase: number;
  shimmerSpeed: number;
  pop: boolean;
  popFrame: number;
}

export default function BubblesEffect({ onClose: _onClose }: BubblesEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
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

    const createBubble = (startY?: number): Bubble => {
      const size = Math.random() * 30 + 12;
      return {
        x: Math.random() * canvas.width,
        y: startY ?? canvas.height + size + Math.random() * 100,
        size,
        speed: Math.random() * 0.7 + 0.3 + (35 - size) * 0.015,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.008,
        drift: (Math.random() - 0.5) * 0.3,
        hueShift: Math.random() * 360,
        hueSpeed: Math.random() * 0.8 + 0.3,
        shimmerPhase: Math.random() * Math.PI * 2,
        shimmerSpeed: Math.random() * 0.04 + 0.02,
        pop: false,
        popFrame: 0,
      };
    };

    const createBubbles = () => {
      const count = 45;
      bubblesRef.current = [];
      for (let i = 0; i < count; i++) {
        bubblesRef.current.push(createBubble(Math.random() * (canvas.height + 100)));
      }
    };
    createBubbles();

    const drawBubble = (b: Bubble) => {
      const s = b.size;
      ctx.save();
      ctx.translate(b.x, b.y);

      const hue1 = (b.hueShift) % 360;
      const hue2 = (b.hueShift + 120) % 360;
      const hue3 = (b.hueShift + 240) % 360;

      // Outer ring — the most visible part of a real soap bubble
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.strokeStyle = isDarkMode
        ? `hsla(${hue1}, 80%, 80%, 0.55)`
        : `hsla(${hue1}, 70%, 55%, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Thin iridescent fill — radial gradient from center to edge
      const bodyGrad = ctx.createRadialGradient(
        -s * 0.2, -s * 0.2, s * 0.05,
        0, 0, s
      );
      if (isDarkMode) {
        bodyGrad.addColorStop(0, `hsla(${hue1}, 60%, 85%, 0.03)`);
        bodyGrad.addColorStop(0.5, `hsla(${hue2}, 50%, 75%, 0.06)`);
        bodyGrad.addColorStop(0.8, `hsla(${hue3}, 70%, 70%, 0.15)`);
        bodyGrad.addColorStop(0.95, `hsla(${hue1}, 80%, 80%, 0.3)`);
        bodyGrad.addColorStop(1, `hsla(${hue2}, 80%, 85%, 0.05)`);
      } else {
        bodyGrad.addColorStop(0, `hsla(${hue1}, 50%, 75%, 0.02)`);
        bodyGrad.addColorStop(0.5, `hsla(${hue2}, 40%, 65%, 0.05)`);
        bodyGrad.addColorStop(0.8, `hsla(${hue3}, 60%, 55%, 0.12)`);
        bodyGrad.addColorStop(0.95, `hsla(${hue1}, 70%, 60%, 0.25)`);
        bodyGrad.addColorStop(1, `hsla(${hue2}, 70%, 70%, 0.04)`);
      }
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Iridescent shimmer band that moves across the surface
      const shimmerY = Math.sin(b.shimmerPhase) * s * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2);
      ctx.clip();
      const shimmerGrad = ctx.createLinearGradient(-s, shimmerY - s * 0.12, s, shimmerY + s * 0.12);
      shimmerGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      shimmerGrad.addColorStop(0.25, isDarkMode
        ? `hsla(${hue3}, 100%, 85%, 0.18)`
        : `hsla(${hue3}, 80%, 70%, 0.14)`);
      shimmerGrad.addColorStop(0.5, isDarkMode
        ? `hsla(${hue2}, 90%, 90%, 0.22)`
        : `hsla(${hue2}, 70%, 80%, 0.18)`);
      shimmerGrad.addColorStop(0.75, isDarkMode
        ? `hsla(${hue1}, 100%, 85%, 0.18)`
        : `hsla(${hue1}, 80%, 70%, 0.14)`);
      shimmerGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();

      // Primary specular highlight — bright white spot (top-left)
      const hlGrad = ctx.createRadialGradient(
        -s * 0.3, -s * 0.3, 0,
        -s * 0.3, -s * 0.3, s * 0.3
      );
      hlGrad.addColorStop(0, isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.55)");
      hlGrad.addColorStop(0.4, isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.1)");
      hlGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.beginPath();
      ctx.arc(-s * 0.3, -s * 0.3, s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = hlGrad;
      ctx.fill();

      // Small secondary highlight (bottom-right)
      const hl2Grad = ctx.createRadialGradient(
        s * 0.2, s * 0.25, 0,
        s * 0.2, s * 0.25, s * 0.12
      );
      hl2Grad.addColorStop(0, isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.2)");
      hl2Grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.beginPath();
      ctx.arc(s * 0.2, s * 0.25, s * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = hl2Grad;
      ctx.fill();

      ctx.restore();
    };

    const drawPop = (b: Bubble) => {
      const progress = b.popFrame / 10;
      const alpha = 1 - progress;
      ctx.save();
      ctx.translate(b.x, b.y);
      const numDroplets = 8;
      for (let i = 0; i < numDroplets; i++) {
        const angle = (Math.PI * 2 * i) / numDroplets;
        const dist = b.size * 0.6 * progress + b.size * 0.3;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const dropSize = Math.max(0.8, b.size * 0.07 * (1 - progress));
        ctx.beginPath();
        ctx.arc(dx, dy, dropSize, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode
          ? `rgba(180, 210, 255, ${alpha * 0.6})`
          : `rgba(80, 130, 200, ${alpha * 0.5})`;
        ctx.fill();
      }
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bubblesRef.current = bubblesRef.current.filter((b) => {
        if (b.pop) {
          b.popFrame++;
          if (b.popFrame <= 10) {
            drawPop(b);
            return true;
          }
          return false;
        }

        b.wobblePhase += b.wobbleSpeed;
        b.shimmerPhase += b.shimmerSpeed;
        b.hueShift += b.hueSpeed;

        const wobbleX = Math.sin(b.wobblePhase) * 1.2;

        b.y -= b.speed;
        b.x += b.drift + wobbleX;

        // Wrap horizontally
        if (b.x > canvas.width + b.size * 2) b.x = -b.size * 2;
        if (b.x < -b.size * 2) b.x = canvas.width + b.size * 2;

        // Pop when reaching top
        if (b.y < -b.size * 2) {
          b.pop = true;
          b.y = 5;
          return true;
        }
        // Rare random pop
        if (Math.random() < 0.0003) {
          b.pop = true;
          return true;
        }

        drawBubble(b);
        return true;
      });

      // Replenish
      while (bubblesRef.current.length < 45) {
        bubblesRef.current.push(createBubble());
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
