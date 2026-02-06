import { useEffect, useRef, useState } from "react";

interface SakuraEffectProps {
  onClose?: () => void;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  opacity: number;
  tilt: number; // 3D tilt for perspective
  tiltSpeed: number;
  color: string;
}

interface WindGust {
  active: boolean;
  strength: number;
  duration: number;
  elapsed: number;
}

export default function SakuraEffect({ onClose: _onClose }: SakuraEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);
  const windRef = useRef<WindGust>({ active: false, strength: 0, duration: 0, elapsed: 0 });
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

    const pinkColors = isDarkMode
      ? [
          "rgba(255, 183, 197, ",  // soft pink
          "rgba(255, 160, 180, ",  // rose
          "rgba(255, 200, 210, ",  // pale blush
          "rgba(255, 140, 170, ",  // deeper pink
          "rgba(255, 220, 230, ",  // almost white-pink
        ]
      : [
          "rgba(219, 112, 147, ",  // palevioletred
          "rgba(255, 105, 140, ",  // warm pink
          "rgba(205, 92, 128, ",   // muted rose
          "rgba(240, 128, 160, ",  // lighter rose
          "rgba(180, 80, 120, ",   // deeper mauve
        ];

    const createPetals = () => {
      const count = 180;
      petalsRef.current = [];
      for (let i = 0; i < count; i++) {
        petalsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height * 0.1,
          size: Math.random() * 6 + 3,
          speed: Math.random() * 0.8 + 0.3,
          drift: (Math.random() - 0.3) * 0.4, // slight rightward bias
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.04,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.02 + 0.008,
          opacity: Math.random() * 0.4 + 0.4,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: Math.random() * 0.03 + 0.01,
          color: pinkColors[Math.floor(Math.random() * pinkColors.length)],
        });
      }
    };
    createPetals();

    const drawPetal = (petal: Petal) => {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);

      // 3D tilt effect - scale X based on tilt to simulate rotation in depth
      const scaleX = Math.cos(petal.tilt) * 0.8 + 0.2;
      ctx.scale(scaleX, 1);

      const s = petal.size;
      const alpha = petal.opacity * (0.7 + Math.abs(Math.cos(petal.tilt)) * 0.3);

      // Draw a petal shape using bezier curves
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.8, -s * 0.6, s * 0.8, s * 0.3, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.8, s * 0.3, -s * 0.8, -s * 0.6, 0, -s);
      ctx.closePath();

      ctx.fillStyle = petal.color + alpha + ")";
      ctx.fill();

      // Subtle vein down the center
      ctx.strokeStyle = petal.color + (alpha * 0.3) + ")";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7);
      ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.35);
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wind gust logic
      const wind = windRef.current;
      if (!wind.active && Math.random() < 0.003) {
        wind.active = true;
        wind.strength = Math.random() * 2 + 1;
        wind.duration = Math.random() * 120 + 60;
        wind.elapsed = 0;
      }
      let windForce = 0;
      if (wind.active) {
        wind.elapsed++;
        // Bell-curve wind strength
        const progress = wind.elapsed / wind.duration;
        windForce = wind.strength * Math.sin(progress * Math.PI);
        if (wind.elapsed >= wind.duration) {
          wind.active = false;
        }
      }

      petalsRef.current.forEach((petal) => {
        petal.wobblePhase += petal.wobbleSpeed;
        petal.rotation += petal.rotationSpeed;
        petal.tilt += petal.tiltSpeed;

        // Sinusoidal wobble for gentle floating
        const wobbleX = Math.sin(petal.wobblePhase) * 1.2;
        const wobbleY = Math.cos(petal.wobblePhase * 0.7) * 0.3;

        petal.y += petal.speed + wobbleY;
        petal.x += petal.drift + wobbleX + windForce * (petal.size / 8);

        // When wind hits, petals spin faster
        if (wind.active) {
          petal.rotationSpeed += windForce * 0.001;
        } else {
          // Slowly restore rotation speed
          petal.rotationSpeed *= 0.998;
        }

        // Wrap around
        if (petal.y > canvas.height + 15) {
          petal.y = -15;
          petal.x = Math.random() * canvas.width;
        }
        if (petal.x > canvas.width + 30) petal.x = -30;
        if (petal.x < -30) petal.x = canvas.width + 30;

        drawPetal(petal);
      });

      // Subtle pink ground accumulation glow
      const groundGrad = ctx.createLinearGradient(0, canvas.height - 25, 0, canvas.height);
      groundGrad.addColorStop(0, isDarkMode ? "rgba(255, 183, 197, 0)" : "rgba(219, 112, 147, 0)");
      groundGrad.addColorStop(1, isDarkMode ? "rgba(255, 183, 197, 0.03)" : "rgba(219, 112, 147, 0.03)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvas.height - 25, canvas.width, 25);

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
