import { useEffect, useRef } from "react";

interface StarryNightEffectProps {
  onClose?: () => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: { r: number; g: number; b: number };
}

interface ShootingStar {
  x: number;
  y: number;
  speed: number;
  angle: number;
  length: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export default function StarryNightEffect({ onClose: _onClose }: StarryNightEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Star color temperatures (blue-white hot to warm orange-red)
    const starColors = [
      { r: 200, g: 210, b: 255 }, // Blue-white (hot)
      { r: 220, g: 225, b: 255 }, // Cool white
      { r: 255, g: 255, b: 250 }, // Pure white
      { r: 255, g: 250, b: 230 }, // Warm white
      { r: 255, g: 240, b: 200 }, // Yellow-white
      { r: 255, g: 220, b: 180 }, // Warm yellow
      { r: 255, g: 200, b: 150 }, // Orange
      { r: 255, g: 180, b: 140 }, // Warm orange (cool star)
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateStars();
    };

    const generateStars = () => {
      const W = canvas.width;
      const H = canvas.height;

      // Dense star field — many small, fewer big
      const count = Math.floor((W * H) / 1200); // very dense
      starsRef.current = [];

      for (let i = 0; i < count; i++) {
        // Size distribution: many tiny, fewer medium, rare large
        const sizeRoll = Math.random();
        let size: number;
        if (sizeRoll < 0.7) size = Math.random() * 0.8 + 0.2;       // tiny (70%)
        else if (sizeRoll < 0.92) size = Math.random() * 1.2 + 0.8;  // small (22%)
        else if (sizeRoll < 0.98) size = Math.random() * 1.5 + 1.5;  // medium (6%)
        else size = Math.random() * 2 + 2.5;                          // bright (2%)

        // Brighter stars twinkle more noticeably
        const brightness = size > 1.5
          ? Math.random() * 0.4 + 0.6
          : Math.random() * 0.5 + 0.2;

        starsRef.current.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size,
          brightness,
          twinkleSpeed: Math.random() * 2.5 + 0.5,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }
    };

    // Pre-allocate shooting stars
    for (let i = 0; i < 5; i++) {
      shootingStarsRef.current.push({
        x: 0, y: 0, speed: 0, angle: 0, length: 0,
        life: 0, maxLife: 0, active: false,
      });
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Spawn shooting stars occasionally
    let shootingTimeout: ReturnType<typeof setTimeout>;
    const scheduleShootingStar = () => {
      const inactive = shootingStarsRef.current.find((s) => !s.active);
      if (inactive) {
        const fromLeft = Math.random() > 0.5;
        inactive.x = fromLeft ? Math.random() * canvas.width * 0.6 : canvas.width * 0.4 + Math.random() * canvas.width * 0.6;
        inactive.y = Math.random() * canvas.height * 0.4;
        inactive.speed = Math.random() * 8 + 10;
        inactive.angle = fromLeft ? Math.PI / 5 + Math.random() * 0.3 : Math.PI - Math.PI / 5 - Math.random() * 0.3;
        inactive.length = Math.random() * 80 + 60;
        inactive.maxLife = 25 + Math.random() * 15;
        inactive.life = inactive.maxLife;
        inactive.active = true;
      }
      shootingTimeout = setTimeout(scheduleShootingStar, 3000 + Math.random() * 6000);
    };
    shootingTimeout = setTimeout(scheduleShootingStar, 1500);

    const animate = () => {
      timeRef.current += 0.012;
      const t = timeRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // --- Milky Way band (subtle diagonal glow) ---
      ctx.save();
      ctx.globalAlpha = 0.04;
      // Diagonal gradient from top-left to bottom-right
      const mwGrad = ctx.createLinearGradient(0, 0, W, H);
      mwGrad.addColorStop(0, "rgba(150, 160, 200, 0)");
      mwGrad.addColorStop(0.3, "rgba(150, 160, 200, 0.6)");
      mwGrad.addColorStop(0.5, "rgba(170, 170, 210, 1)");
      mwGrad.addColorStop(0.7, "rgba(150, 160, 200, 0.6)");
      mwGrad.addColorStop(1, "rgba(150, 160, 200, 0)");
      ctx.fillStyle = mwGrad;

      // Draw as a wide diagonal strip
      ctx.translate(W * 0.5, H * 0.5);
      ctx.rotate(-0.4); // slight tilt
      ctx.fillRect(-W, -H * 0.12, W * 2, H * 0.24);
      ctx.restore();

      // Nebula-like color patches (very subtle)
      ctx.save();
      ctx.globalAlpha = 0.015;
      const nebulaPatches = [
        { x: W * 0.3, y: H * 0.25, r: 150, h: 220 },
        { x: W * 0.7, y: H * 0.4, r: 120, h: 280 },
        { x: W * 0.5, y: H * 0.6, r: 100, h: 350 },
      ];
      for (const n of nebulaPatches) {
        const nx = n.x + Math.sin(t * 0.05 + n.h) * 10;
        const ny = n.y + Math.cos(t * 0.04 + n.h) * 8;
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
        grad.addColorStop(0, `hsla(${n.h}, 60%, 60%, 0.6)`);
        grad.addColorStop(0.5, `hsla(${n.h}, 50%, 50%, 0.3)`);
        grad.addColorStop(1, `hsla(${n.h}, 40%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(nx - n.r, ny - n.r, n.r * 2, n.r * 2);
      }
      ctx.restore();

      // --- Draw stars ---
      for (const star of starsRef.current) {
        const twinkle = Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        // Small stars: gentle twinkle. Large stars: more pronounced
        const twinkleAmount = star.size > 1.5 ? 0.35 : 0.2;
        const alpha = star.brightness * (1 - twinkleAmount + twinkle * twinkleAmount);

        if (alpha < 0.05) continue; // skip invisible stars

        const { r, g, b } = star.color;

        if (star.size > 2) {
          // Bright stars get a glow halo and diffraction spikes
          ctx.save();

          // Soft glow
          const glowR = star.size * 4;
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`);
          glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.05})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(star.x - glowR, star.y - glowR, glowR * 2, glowR * 2);

          // Diffraction spikes (4-point star)
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          const spikeLen = star.size * 5;
          ctx.beginPath();
          ctx.moveTo(star.x - spikeLen, star.y);
          ctx.lineTo(star.x + spikeLen, star.y);
          ctx.moveTo(star.x, star.y - spikeLen);
          ctx.lineTo(star.x, star.y + spikeLen);
          ctx.stroke();

          ctx.restore();
        }

        // Star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }

      // --- Shooting stars ---
      shootingStarsRef.current.forEach((ss) => {
        if (!ss.active) return;

        ss.life -= 1;
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;

        if (ss.life <= 0) {
          ss.active = false;
          return;
        }

        const lifeRatio = ss.life / ss.maxLife;
        const headAlpha = lifeRatio * 0.9;

        // Trail
        const tailX = ss.x - Math.cos(ss.angle) * ss.length * lifeRatio;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length * lifeRatio;

        const trailGrad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        trailGrad.addColorStop(0, `rgba(255, 255, 255, ${headAlpha})`);
        trailGrad.addColorStop(0.3, `rgba(200, 220, 255, ${headAlpha * 0.5})`);
        trailGrad.addColorStop(1, "rgba(200, 220, 255, 0)");

        ctx.save();
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(200, 220, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${headAlpha})`;
        ctx.fill();
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(shootingTimeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full bg-black/40" />
    </div>
  );
}
