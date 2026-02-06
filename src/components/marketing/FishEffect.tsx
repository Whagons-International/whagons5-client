import { useEffect, useRef } from "react";

interface FishEffectProps {
  onClose?: () => void;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  wobblePhase: number;
}

interface Fish {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  speed: number;
  angle: number;
  tailPhase: number;
  color: string;
  accentColor: string;
  finPhase: number;
  stripes: number; // 0 = none, 1+ = stripe count
}

export default function FishEffect({ onClose: _onClose }: FishEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<Fish[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
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

    const fishDefs = [
      { color: "#FF6B35", accent: "#FF8855", stripes: 3 },  // Clownfish
      { color: "#2E6BE6", accent: "#5090FF", stripes: 0 },  // Blue tang
      { color: "#FFD700", accent: "#FFE850", stripes: 0 },  // Goldfish
      { color: "#00CED1", accent: "#40E8E0", stripes: 2 },  // Tropical
      { color: "#FF1493", accent: "#FF60B0", stripes: 0 },  // Pink
      { color: "#32CD32", accent: "#60E060", stripes: 1 },  // Green
      { color: "#FF4500", accent: "#FF7040", stripes: 2 },  // Red-orange
      { color: "#9370DB", accent: "#B090EE", stripes: 0 },  // Purple
    ];

    const createFish = () => {
      const count = 14;
      fishRef.current = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const def = fishDefs[Math.floor(Math.random() * fishDefs.length)];
        fishRef.current.push({
          x, y, targetX: x, targetY: y,
          size: Math.random() * 14 + 16,
          speed: Math.random() * 1.5 + 0.8,
          angle: Math.random() * Math.PI * 2,
          tailPhase: Math.random() * Math.PI * 2,
          finPhase: Math.random() * Math.PI * 2,
          color: def.color,
          accentColor: def.accent,
          stripes: def.stripes,
        });
      }
    };
    createFish();

    // Persistent bubbles
    for (let i = 0; i < 25; i++) {
      bubblesRef.current.push({
        x: Math.random() * (canvas?.width || 1),
        y: Math.random() * (canvas?.height || 1),
        r: Math.random() * 3 + 1.5,
        speed: Math.random() * 0.5 + 0.3,
        wobble: Math.random() * 0.5 + 0.2,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    const drawFish = (fish: Fish) => {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);

      const s = fish.size;
      const tailW = Math.sin(fish.tailPhase) * 0.35;

      // Shadow under fish
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.beginPath();
      ctx.ellipse(s * 0.05, s * 0.12, s * 0.8, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, 0);
      ctx.lineTo(-s * 1.45, tailW * s * 0.6 - s * 0.38);
      ctx.quadraticCurveTo(-s * 1.2, 0, -s * 1.45, tailW * s * 0.6 + s * 0.38);
      ctx.closePath();
      ctx.fill();

      // Body (smooth ellipse)
      const bodyGrad = ctx.createRadialGradient(-s * 0.1, -s * 0.1, 0, 0, 0, s);
      bodyGrad.addColorStop(0, fish.accentColor);
      bodyGrad.addColorStop(0.7, fish.color);
      bodyGrad.addColorStop(1, fish.color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stripes
      if (fish.stripes > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = s * 0.06;
        for (let i = 0; i < fish.stripes; i++) {
          const sx = -s * 0.3 + i * s * 0.35;
          ctx.beginPath();
          ctx.moveTo(sx, -s * 0.4);
          ctx.quadraticCurveTo(sx + s * 0.05, 0, sx, s * 0.4);
          ctx.stroke();
        }
      }

      // Dorsal fin
      const finW = Math.sin(fish.finPhase) * 0.12;
      ctx.fillStyle = fish.color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.44);
      ctx.quadraticCurveTo(0, -s * 0.85 + finW * s, -s * 0.25, -s * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Pectoral fins
      ctx.globalAlpha = 0.6;
      const pFinW = Math.sin(fish.finPhase + 0.5) * 0.1;
      for (let side = -1; side <= 1; side += 2) {
        if (side === 0) continue;
        ctx.beginPath();
        ctx.moveTo(s * 0.25, side * s * 0.15);
        ctx.quadraticCurveTo(s * 0.45, side * (s * 0.45 + pFinW * s), s * 0.05, side * s * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s * 0.6, -s * 0.12, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(s * 0.63, -s * 0.12, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s * 0.61, -s * 0.14, s * 0.025, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(s * 0.92, s * 0.02, s * 0.1, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Scales (subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.4;
      for (let row = -2; row <= 2; row++) {
        for (let col = -3; col <= 2; col++) {
          const cx = col * s * 0.22;
          const cy = row * s * 0.15;
          if (cx * cx / (s * s) + cy * cy / (s * 0.45 * s * 0.45) < 0.8) {
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.09, 0, Math.PI, true);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle water tint
      ctx.fillStyle = "rgba(0, 80, 180, 0.03)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Caustic light patterns (light filtering through water surface)
      ctx.save();
      ctx.globalAlpha = 0.025;
      for (let i = 0; i < 8; i++) {
        const cx = (canvas.width * 0.15) + i * canvas.width * 0.1 + Math.sin(timeRef.current * 0.3 + i) * 40;
        const cy = Math.sin(timeRef.current * 0.2 + i * 0.7) * 30 + 80;
        const r = 80 + Math.sin(timeRef.current * 0.4 + i) * 20;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, "rgba(120, 200, 255, 1)");
        grad.addColorStop(1, "rgba(120, 200, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.restore();

      // Bubbles
      bubblesRef.current.forEach((b) => {
        b.y -= b.speed;
        b.wobblePhase += 0.03;
        b.x += Math.sin(b.wobblePhase) * b.wobble;
        if (b.y < -10) {
          b.y = canvas.height + 10;
          b.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180, 220, 255, 0.3)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // Highlight
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fill();
      });

      fishRef.current.forEach((fish) => {
        fish.tailPhase += 0.15;
        fish.finPhase += 0.1;

        const dx = fish.targetX - fish.x;
        const dy = fish.targetY - fish.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
          fish.targetX = Math.random() * canvas.width;
          fish.targetY = Math.random() * canvas.height;
        } else {
          const mx = (dx / dist) * fish.speed;
          const my = (dy / dist) * fish.speed;
          const bob = Math.sin(fish.tailPhase) * 0.4;
          fish.x += mx - my * bob * 0.15;
          fish.y += my + mx * bob * 0.15;
          fish.angle = Math.atan2(my, mx);
        }

        if (fish.x < -60) fish.x = canvas.width + 60;
        if (fish.x > canvas.width + 60) fish.x = -60;
        if (fish.y < -60) fish.y = canvas.height + 60;
        if (fish.y > canvas.height + 60) fish.y = -60;

        drawFish(fish);
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
