import { useEffect, useRef, useState } from "react";

interface ButterfliesEffectProps {
  onClose?: () => void;
}

interface Butterfly {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  speed: number;
  angle: number; // direction of travel
  wingPhase: number;
  wingSpeed: number;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  pattern: "monarch" | "morpho" | "swallowtail" | "painted" | "copper";
  driftPhase: number;
  pauseTime: number;
  flapAmplitude: number;
}

export default function ButterfliesEffect({ onClose: _onClose }: ButterfliesEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const butterfliesRef = useRef<Butterfly[]>([]);
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

    const patterns: {
      primary: string;
      secondary: string;
      accent: string;
      pattern: Butterfly["pattern"];
    }[] = isDarkMode
      ? [
          { primary: "#FF8C00", secondary: "#1A1A1A", accent: "#FFD700", pattern: "monarch" },
          { primary: "#1E90FF", secondary: "#4169E1", accent: "#87CEEB", pattern: "morpho" },
          { primary: "#FFD700", secondary: "#1A1A1A", accent: "#FFFACD", pattern: "swallowtail" },
          { primary: "#FF6B6B", secondary: "#FFA07A", accent: "#FFE4E1", pattern: "painted" },
          { primary: "#CD7F32", secondary: "#8B4513", accent: "#FFD700", pattern: "copper" },
        ]
      : [
          { primary: "#D2691E", secondary: "#2F1A0A", accent: "#CC8800", pattern: "monarch" },
          { primary: "#0055AA", secondary: "#003380", accent: "#4488CC", pattern: "morpho" },
          { primary: "#B8860B", secondary: "#2F1A0A", accent: "#DAA520", pattern: "swallowtail" },
          { primary: "#CC4444", secondary: "#AA5533", accent: "#DDAAAA", pattern: "painted" },
          { primary: "#8B5A2B", secondary: "#5C3317", accent: "#B8860B", pattern: "copper" },
        ];

    const createButterflies = () => {
      const count = 14;
      butterfliesRef.current = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const p = patterns[Math.floor(Math.random() * patterns.length)];
        butterfliesRef.current.push({
          x,
          y,
          targetX: Math.random() * canvas.width,
          targetY: Math.random() * canvas.height,
          size: Math.random() * 10 + 12,
          speed: Math.random() * 1.2 + 0.5,
          angle: Math.random() * Math.PI * 2,
          wingPhase: Math.random() * Math.PI * 2,
          wingSpeed: Math.random() * 0.12 + 0.08,
          colorPrimary: p.primary,
          colorSecondary: p.secondary,
          colorAccent: p.accent,
          pattern: p.pattern,
          driftPhase: Math.random() * Math.PI * 2,
          pauseTime: 0,
          flapAmplitude: Math.random() * 0.3 + 0.7,
        });
      }
    };
    createButterflies();

    const drawButterfly = (b: Butterfly) => {
      const s = b.size;
      // Wing flap: 0 = wings fully open, 1 = wings closed (edge-on)
      const wingFlap = (Math.sin(b.wingPhase) + 1) / 2; // 0 to 1
      const wingScale = 0.2 + (1 - wingFlap) * 0.8; // 0.2 to 1.0

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle + Math.PI / 2);

      // Body
      ctx.fillStyle = b.colorSecondary;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.08, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, -s * 0.5, s * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // Antennae
      ctx.strokeStyle = b.colorSecondary;
      ctx.lineWidth = 0.8;
      const antWobble = Math.sin(timeRef.current * 3 + b.wingPhase) * 0.1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.55);
      ctx.quadraticCurveTo(-s * 0.25, -s * 0.8 + antWobble * s, -s * 0.2, -s * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.04, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.25, -s * 0.8 - antWobble * s, s * 0.2, -s * 0.9);
      ctx.stroke();

      // Antenna tips
      ctx.fillStyle = b.colorSecondary;
      ctx.beginPath();
      ctx.arc(-s * 0.2, -s * 0.9, s * 0.03, 0, Math.PI * 2);
      ctx.arc(s * 0.2, -s * 0.9, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Draw wings (both sides)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);

        // Upper wing
        ctx.save();
        ctx.scale(wingScale, 1);
        ctx.fillStyle = b.colorPrimary;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.8, -s * 0.6, s * 0.65, -s * 0.15);
        ctx.bezierCurveTo(s * 0.55, s * 0.05, s * 0.2, s * 0.1, 0, s * 0.05);
        ctx.closePath();
        ctx.fill();

        // Wing border/vein
        ctx.strokeStyle = b.colorSecondary;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Accent spots on upper wing
        ctx.fillStyle = b.colorAccent;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(s * 0.35, -s * 0.3, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.5, -s * 0.2, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Wing veins
        ctx.strokeStyle = b.colorSecondary;
        ctx.lineWidth = 0.4;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.05);
        ctx.lineTo(s * 0.5, -s * 0.35);
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.55, -s * 0.15);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Lower wing
        ctx.save();
        ctx.scale(wingScale, 1);
        ctx.fillStyle = b.colorPrimary;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.05);
        ctx.bezierCurveTo(s * 0.4, s * 0.05, s * 0.55, s * 0.2, s * 0.45, s * 0.4);
        ctx.bezierCurveTo(s * 0.3, s * 0.5, s * 0.1, s * 0.4, 0, s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Lower wing border
        ctx.strokeStyle = b.colorSecondary;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Lower wing spots
        ctx.fillStyle = b.colorAccent;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(s * 0.25, s * 0.25, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
        ctx.restore();
      }

      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      butterfliesRef.current.forEach((b) => {
        // Wing flapping
        b.wingPhase += b.wingSpeed;

        // Erratic flight path with drift
        b.driftPhase += 0.01;

        if (b.pauseTime > 0) {
          b.pauseTime--;
          // Wings slow down when resting
          b.wingSpeed = 0.02;
        } else {
          b.wingSpeed = Math.random() * 0.04 + 0.08;

          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 15) {
            b.targetX = Math.random() * canvas.width;
            b.targetY = Math.random() * canvas.height;
            if (Math.random() > 0.6) {
              b.pauseTime = Math.random() * 120 + 40;
            }
          } else {
            // Erratic sinusoidal path (butterflies don't fly straight)
            const erraticX = Math.sin(b.driftPhase * 3) * 1.5;
            const erraticY = Math.cos(b.driftPhase * 2.3) * 1.0;

            const moveX = (dx / dist) * b.speed + erraticX;
            const moveY = (dy / dist) * b.speed + erraticY;

            b.x += moveX;
            b.y += moveY;

            // Angle follows movement direction
            b.angle = Math.atan2(moveY, moveX);
          }
        }

        // Wrap around
        if (b.x < -40) b.x = canvas.width + 40;
        if (b.x > canvas.width + 40) b.x = -40;
        if (b.y < -40) b.y = canvas.height + 40;
        if (b.y > canvas.height + 40) b.y = -40;

        drawButterfly(b);
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
