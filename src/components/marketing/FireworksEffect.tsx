import { useEffect, useRef } from "react";

interface FireworksEffectProps {
  onClose?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
  friction: number;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  r: number;
  g: number;
  b: number;
  active: boolean;
}

export default function FireworksEffect({ onClose: _onClose }: FireworksEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const animationFrameRef = useRef<number>();

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
      [255, 80, 80], [80, 255, 120], [80, 140, 255],
      [255, 230, 50], [255, 80, 220], [50, 230, 255],
      [255, 160, 40], [200, 100, 255],
    ];

    const createExplosion = (x: number, y: number, cr: number, cg: number, cb: number) => {
      const count = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 2;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 50 + Math.random() * 40,
          maxLife: 90,
          r: Math.max(0, Math.min(255, cr + Math.floor((Math.random() - 0.5) * 60))),
          g: Math.max(0, Math.min(255, cg + Math.floor((Math.random() - 0.5) * 60))),
          b: Math.max(0, Math.min(255, cb + Math.floor((Math.random() - 0.5) * 60))),
          size: Math.random() * 3 + 2,
          friction: 0.97 + Math.random() * 0.015,
        });
      }
      // Add a few bright white sparkle particles
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 2 + 0.5;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 20 + Math.random() * 20,
          maxLife: 40,
          r: 255, g: 255, b: 220,
          size: Math.random() * 2 + 1,
          friction: 0.95,
        });
      }
    };

    const launchRocket = () => {
      const c = colors[Math.floor(Math.random() * colors.length)];
      rocketsRef.current.push({
        x: Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
        y: canvas.height + 10,
        targetY: Math.random() * canvas.height * 0.4 + canvas.height * 0.08,
        speed: 6 + Math.random() * 4,
        r: c[0], g: c[1], b: c[2],
        active: true,
      });
    };

    let launchTimeout: ReturnType<typeof setTimeout>;
    const scheduleLaunch = () => {
      launchTimeout = setTimeout(() => {
        if (rocketsRef.current.length < 4 && particlesRef.current.length < 600) {
          launchRocket();
          // Sometimes double launch
          if (Math.random() > 0.5) {
            setTimeout(launchRocket, 100 + Math.random() * 200);
          }
        }
        scheduleLaunch();
      }, 600 + Math.random() * 500);
    };
    scheduleLaunch();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const r = rocketsRef.current[i];
        if (!r.active) { rocketsRef.current.splice(i, 1); continue; }

        r.y -= r.speed;
        r.x += (Math.random() - 0.5) * 0.5;

        // Rocket head
        ctx.fillStyle = "rgba(255,255,220,0.95)";
        ctx.fillRect(r.x - 2, r.y - 2, 4, 4);
        // Small glow around rocket
        ctx.fillStyle = `rgba(${r.r},${r.g},${r.b},0.3)`;
        ctx.fillRect(r.x - 4, r.y - 4, 8, 8);

        if (r.y <= r.targetY) {
          createExplosion(r.x, r.y, r.r, r.g, r.b);
          r.active = false;
        }
      }

      // Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += 0.04;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
          particles[i] = particles[particles.length - 1];
          particles.pop();
          continue;
        }

        const alpha = p.life / p.maxLife;
        const s = p.size * (0.4 + alpha * 0.6); // Don't shrink to nothing
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(launchTimeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
