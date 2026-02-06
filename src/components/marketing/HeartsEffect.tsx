import { useEffect, useRef } from "react";

interface HeartsEffectProps {
  onClose?: () => void;
}

interface Heart {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

export default function HeartsEffect({ onClose: _onClose }: HeartsEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<Heart[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

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

    const heartColors = [
      "#FF69B4", "#FF1493", "#FF6B9D", "#E91E63",
      "#FF4081", "#F06292", "#EC407A", "#D81B60",
      "#FFB6C1", "#FF8FA3", "#C2185B",
    ];

    const createHearts = () => {
      const count = 60;
      heartsRef.current = [];
      for (let i = 0; i < count; i++) {
        heartsRef.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 200,
          size: Math.random() * 18 + 12,
          speed: Math.random() * 0.8 + 0.4,
          opacity: Math.random() * 0.4 + 0.3,
          drift: (Math.random() - 0.5) * 0.4,
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          color: heartColors[Math.floor(Math.random() * heartColors.length)],
          pulse: 0,
          pulseSpeed: Math.random() * 0.05 + 0.02,
        });
      }
    };
    createHearts();

    const drawHeart = (x: number, y: number, size: number, opacity: number, rotation: number, color: string, pulseScale: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(pulseScale, pulseScale);

      const s = size;

      // Glow
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;

      // Heart path using bezier curves
      ctx.beginPath();
      ctx.moveTo(0, s * 0.3);

      // Left lobe
      ctx.bezierCurveTo(
        -s * 0.05, s * 0.1,
        -s * 0.55, s * 0.05,
        -s * 0.5, -s * 0.2
      );
      ctx.bezierCurveTo(
        -s * 0.45, -s * 0.5,
        -s * 0.1, -s * 0.5,
        0, -s * 0.25
      );

      // Right lobe
      ctx.bezierCurveTo(
        s * 0.1, -s * 0.5,
        s * 0.45, -s * 0.5,
        s * 0.5, -s * 0.2
      );
      ctx.bezierCurveTo(
        s * 0.55, s * 0.05,
        s * 0.05, s * 0.1,
        0, s * 0.3
      );

      ctx.closePath();

      // Gradient fill
      const grad = ctx.createRadialGradient(-s * 0.15, -s * 0.15, 0, 0, 0, s * 0.6);
      grad.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`);
      grad.addColorStop(1, `${color}${Math.round(opacity * 180).toString(16).padStart(2, "0")}`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Shine highlight
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(-s * 0.18, -s * 0.25, s * 0.12, s * 0.08, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      heartsRef.current.forEach((heart) => {
        heart.pulse += heart.pulseSpeed;
        const pulseScale = 1 + Math.sin(heart.pulse) * 0.08;

        heart.y -= heart.speed;
        heart.x += heart.drift + Math.sin(timeRef.current + heart.pulse) * 0.2;
        heart.rotation += heart.rotationSpeed;

        if (heart.y < -50) {
          heart.y = canvas.height + 30;
          heart.x = Math.random() * canvas.width;
          heart.color = heartColors[Math.floor(Math.random() * heartColors.length)];
        }

        drawHeart(heart.x, heart.y, heart.size, heart.opacity, heart.rotation, heart.color, pulseScale);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
