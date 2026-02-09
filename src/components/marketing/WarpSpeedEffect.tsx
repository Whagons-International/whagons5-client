import { useEffect, useRef, useState } from "react";

interface WarpSpeedEffectProps {
  onClose?: () => void;
}

interface Star {
  x: number; // position relative to center (-1 to 1)
  y: number;
  z: number; // depth (0 = far away, 1 = camera)
  prevX: number;
  prevY: number;
  speed: number;
  size: number;
  hue: number;
}

export default function WarpSpeedEffect({ onClose: _onClose }: WarpSpeedEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);
  const warpRef = useRef(0); // 0 = normal, builds up to 1 = full warp
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

    const NUM_STARS = 600;

    const resetStar = (star: Star, full?: boolean) => {
      // Random position in a circle around center
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8 + 0.1;
      star.x = Math.cos(angle) * radius;
      star.y = Math.sin(angle) * radius;
      star.z = full ? Math.random() : 0.001; // new stars start far away
      star.prevX = star.x;
      star.prevY = star.y;
      star.speed = Math.random() * 0.005 + 0.002;
      star.size = Math.random() * 1.5 + 0.5;
      star.hue = Math.random() * 60 + 200; // blue-purple range
    };

    const createStars = () => {
      starsRef.current = [];
      for (let i = 0; i < NUM_STARS; i++) {
        const star: Star = {
          x: 0, y: 0, z: 0, prevX: 0, prevY: 0,
          speed: 0, size: 0, hue: 0,
        };
        resetStar(star, true);
        starsRef.current.push(star);
      }
    };
    createStars();

    // Warp phases: cruise -> accelerate -> warp -> decelerate -> cruise
    let warpPhase: "cruise" | "accelerate" | "warp" | "decelerate" = "cruise";
    let phaseTimer = 0;

    const animate = () => {
      timeRef.current += 0.016;
      phaseTimer++;

      // Phase management
      if (warpPhase === "cruise" && phaseTimer > 180) {
        warpPhase = "accelerate";
        phaseTimer = 0;
      } else if (warpPhase === "accelerate" && phaseTimer > 90) {
        warpPhase = "warp";
        phaseTimer = 0;
      } else if (warpPhase === "warp" && phaseTimer > 150) {
        warpPhase = "decelerate";
        phaseTimer = 0;
      } else if (warpPhase === "decelerate" && phaseTimer > 90) {
        warpPhase = "cruise";
        phaseTimer = 0;
      }

      // Update warp intensity
      if (warpPhase === "accelerate") {
        warpRef.current = Math.min(1, warpRef.current + 0.012);
      } else if (warpPhase === "warp") {
        warpRef.current = 1;
      } else if (warpPhase === "decelerate") {
        warpRef.current = Math.max(0, warpRef.current - 0.012);
      } else {
        warpRef.current = Math.max(0, warpRef.current - 0.005);
      }

      const warp = warpRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const fov = Math.min(canvas.width, canvas.height) * 0.5;

      // Clear with a fade for trail effect during warp
      if (warp > 0.3) {
        ctx.fillStyle = isDarkMode
          ? `rgba(0, 0, 8, ${0.15 + (1 - warp) * 0.3})`
          : `rgba(240, 240, 255, ${0.15 + (1 - warp) * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Speed factor based on warp
      const speedMultiplier = 1 + warp * 25;

      starsRef.current.forEach((star) => {
        star.prevX = star.x / star.z;
        star.prevY = star.y / star.z;

        // Move star toward camera
        star.z += star.speed * speedMultiplier * 0.016;

        // Reset if past camera
        if (star.z >= 1) {
          resetStar(star);
        }

        // Project to 2D
        const projX = (star.x / star.z) * fov + cx;
        const projY = (star.y / star.z) * fov + cy;
        const prevProjX = star.prevX * fov + cx;
        const prevProjY = star.prevY * fov + cy;

        // Skip if off screen
        if (projX < -50 || projX > canvas.width + 50 || projY < -50 || projY > canvas.height + 50) {
          return;
        }

        // Size increases as star gets closer
        const projSize = star.size * (star.z * 2 + 0.5);
        // Brightness increases as star gets closer
        const brightness = Math.min(1, star.z * 1.5 + 0.2);

        if (warp > 0.1) {
          // Draw stretched line (warp streak)
          const streakLength = warp;
          const sx = projX - (projX - prevProjX) * streakLength * 3;
          const sy = projY - (projY - prevProjY) * streakLength * 3;

          // Streak glow
          ctx.strokeStyle = isDarkMode
            ? `hsla(${star.hue + warp * 30}, 80%, ${60 + brightness * 30}%, ${brightness * warp * 0.6})`
            : `hsla(${star.hue + warp * 30}, 60%, ${30 + brightness * 20}%, ${brightness * warp * 0.5})`;
          ctx.lineWidth = projSize * 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(projX, projY);
          ctx.stroke();

          // Core streak (brighter, thinner)
          ctx.strokeStyle = isDarkMode
            ? `hsla(${star.hue}, 60%, ${80 + brightness * 20}%, ${brightness})`
            : `hsla(${star.hue}, 50%, ${40 + brightness * 30}%, ${brightness * 0.8})`;
          ctx.lineWidth = projSize;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(projX, projY);
          ctx.stroke();
        } else {
          // Normal star (dot)
          ctx.beginPath();
          ctx.arc(projX, projY, projSize, 0, Math.PI * 2);
          ctx.fillStyle = isDarkMode
            ? `hsla(${star.hue}, 50%, ${70 + brightness * 30}%, ${brightness})`
            : `hsla(${star.hue}, 40%, ${30 + brightness * 30}%, ${brightness * 0.7})`;
          ctx.fill();

          // Subtle glow on brighter stars
          if (brightness > 0.6) {
            ctx.beginPath();
            ctx.arc(projX, projY, projSize * 3, 0, Math.PI * 2);
            ctx.fillStyle = isDarkMode
              ? `hsla(${star.hue}, 60%, 70%, ${brightness * 0.1})`
              : `hsla(${star.hue}, 50%, 50%, ${brightness * 0.07})`;
            ctx.fill();
          }
        }
      });

      // Central tunnel glow during warp
      if (warp > 0.3) {
        const tunnelRadius = Math.min(canvas.width, canvas.height) * 0.1 * (1 - warp * 0.5);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, tunnelRadius);
        if (isDarkMode) {
          gradient.addColorStop(0, `rgba(150, 180, 255, ${warp * 0.15})`);
          gradient.addColorStop(0.5, `rgba(100, 140, 255, ${warp * 0.05})`);
          gradient.addColorStop(1, "rgba(0, 0, 40, 0)");
        } else {
          gradient.addColorStop(0, `rgba(80, 100, 200, ${warp * 0.1})`);
          gradient.addColorStop(0.5, `rgba(60, 80, 180, ${warp * 0.03})`);
          gradient.addColorStop(1, "rgba(240, 240, 255, 0)");
        }
        ctx.beginPath();
        ctx.arc(cx, cy, tunnelRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
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
