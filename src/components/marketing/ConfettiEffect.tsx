import { useEffect, useRef } from "react";

interface ConfettiEffectProps {
  onClose?: () => void;
}

interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  drift: number;
  wobblePhase: number;
  wobbleSpeed: number;
  shape: "rect" | "circle" | "ribbon";
  ribbonWave: number;
}

export default function ConfettiEffect({ onClose: _onClose }: ConfettiEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
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

    const colors = [
      "#FF3366", "#FF6633", "#FFCC00", "#33CC66",
      "#3399FF", "#9933FF", "#FF33CC", "#00CCCC",
      "#FF5555", "#55FF55", "#5555FF", "#FFAA00",
    ];

    const shapes: ("rect" | "circle" | "ribbon")[] = ["rect", "rect", "circle", "ribbon", "ribbon"];

    const createConfetti = () => {
      const count = 200;
      confettiRef.current = [];
      for (let i = 0; i < count; i++) {
        confettiRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          size: Math.random() * 8 + 4,
          speed: Math.random() * 1.5 + 0.8,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          color: colors[Math.floor(Math.random() * colors.length)],
          drift: (Math.random() - 0.5) * 0.8,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.04 + 0.02,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          ribbonWave: Math.random() * Math.PI * 2,
        });
      }
    };
    createConfetti();

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confettiRef.current.forEach((p) => {
        p.wobblePhase += p.wobbleSpeed;
        p.ribbonWave += 0.08;
        const wobbleX = Math.sin(p.wobblePhase) * 1.5;

        p.y += p.speed;
        p.x += p.drift + wobbleX;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // 3D-like perspective: scale based on rotation for "flipping" effect
        const scaleX = Math.cos(p.wobblePhase * 2);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ribbon — wavy strip
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, 0);
          for (let rx = -p.size / 2; rx <= p.size / 2; rx += 2) {
            const ry = Math.sin(p.ribbonWave + rx * 0.5) * p.size * 0.15;
            ctx.lineTo(rx, ry);
          }
          ctx.lineTo(p.size / 2, p.size * 0.15);
          for (let rx = p.size / 2; rx >= -p.size / 2; rx -= 2) {
            const ry = Math.sin(p.ribbonWave + rx * 0.5) * p.size * 0.15 + p.size * 0.15;
            ctx.lineTo(rx, ry);
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
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
