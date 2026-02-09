import { useEffect, useRef } from "react";

interface BugEffectProps {
  onClose?: () => void;
}

interface Bug {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  speed: number;
  angle: number;
  legPhase: number;
  pauseTime: number;
  color: string;
  wingColor: string;
  type: "beetle" | "ant" | "ladybug";
}

export default function BugEffect({ onClose: _onClose }: BugEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bugsRef = useRef<Bug[]>([]);
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

    const bugTypes: { color: string; wingColor: string; type: "beetle" | "ant" | "ladybug" }[] = [
      { color: "#1a1a1a", wingColor: "#333", type: "beetle" },
      { color: "#5B3A1A", wingColor: "#7B5A3A", type: "beetle" },
      { color: "#2F4F2F", wingColor: "#3F6F3F", type: "beetle" },
      { color: "#1a1a1a", wingColor: "#1a1a1a", type: "ant" },
      { color: "#CC2200", wingColor: "#111", type: "ladybug" },
    ];

    const createBugs = () => {
      const count = 10;
      bugsRef.current = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const bt = bugTypes[Math.floor(Math.random() * bugTypes.length)];
        bugsRef.current.push({
          x, y, targetX: x, targetY: y,
          size: bt.type === "ant" ? Math.random() * 5 + 6 : Math.random() * 8 + 10,
          speed: bt.type === "ant" ? Math.random() * 2 + 1 : Math.random() * 1.2 + 0.4,
          angle: Math.random() * Math.PI * 2,
          legPhase: Math.random() * Math.PI * 2,
          pauseTime: 0,
          color: bt.color,
          wingColor: bt.wingColor,
          type: bt.type,
        });
      }
    };
    createBugs();

    const drawBeetle = (bug: Bug) => {
      const s = bug.size;
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.angle);

      // Wing cases (elytra)
      ctx.fillStyle = bug.wingColor;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.05, s * 0.48, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing line down center
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(0, s * 0.5);
      ctx.stroke();

      // Body underneath
      ctx.fillStyle = bug.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.4, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, -s * 0.65, s * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.72, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.12, -s * 0.72, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.72, s * 0.03, 0, Math.PI * 2);
      ctx.arc(s * 0.12, -s * 0.72, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = bug.color;
      ctx.lineWidth = 1.2;
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const ly = -s * 0.25 + i * s * 0.3;
          const legOff = Math.sin(bug.legPhase + i * Math.PI / 3) * s * 0.2;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.quadraticCurveTo(side * s * 0.5, ly + legOff * 0.3, side * s * 0.7 + legOff, ly + s * 0.15);
          ctx.stroke();
        }
      }

      // Antennae
      const aw = Math.sin(timeRef.current * 3) * 0.15;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.8);
      ctx.quadraticCurveTo(-s * 0.3, -s * 1.1 + aw * s, -s * 0.25, -s * 1.2);
      ctx.moveTo(s * 0.1, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.3, -s * 1.1 - aw * s, s * 0.25, -s * 1.2);
      ctx.stroke();

      ctx.restore();
    };

    const drawLadybug = (bug: Bug) => {
      const s = bug.size;
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.angle);

      // Red shell
      ctx.fillStyle = "#CC2200";
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Center line
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(0, s * 0.55);
      ctx.stroke();

      // Black spots
      ctx.fillStyle = "#111";
      const spots = [[-0.2, -0.2], [0.2, -0.2], [-0.25, 0.15], [0.25, 0.15], [-0.1, 0.35], [0.1, 0.35]];
      spots.forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      });

      // Head
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(0, -s * 0.65, s * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1;
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const ly = -s * 0.2 + i * s * 0.25;
          const legOff = Math.sin(bug.legPhase + i * Math.PI / 3) * s * 0.15;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.quadraticCurveTo(side * s * 0.4, ly + legOff * 0.3, side * s * 0.6 + legOff, ly + s * 0.1);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const drawAnt = (bug: Bug) => {
      const s = bug.size;
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.angle);

      ctx.fillStyle = bug.color;

      // Abdomen
      ctx.beginPath();
      ctx.ellipse(0, s * 0.35, s * 0.25, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thorax
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.05, s * 0.15, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, -s * 0.4, s * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Mandibles
      ctx.strokeStyle = bug.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.55);
      ctx.lineTo(-s * 0.15, -s * 0.68);
      ctx.moveTo(s * 0.05, -s * 0.55);
      ctx.lineTo(s * 0.15, -s * 0.68);
      ctx.stroke();

      // Legs (6, jointed)
      ctx.lineWidth = 0.8;
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const ly = -s * 0.15 + i * s * 0.2;
          const off = Math.sin(bug.legPhase + i * Math.PI / 3) * s * 0.2;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(side * s * 0.3, ly + off * 0.2);
          ctx.lineTo(side * s * 0.55 + off, ly + s * 0.1);
          ctx.stroke();
        }
      }

      // Antennae (long, bent)
      const aw = Math.sin(timeRef.current * 4) * 0.1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.52);
      ctx.quadraticCurveTo(-s * 0.35, -s * 0.75 + aw * s, -s * 0.4, -s * 0.95);
      ctx.moveTo(s * 0.08, -s * 0.52);
      ctx.quadraticCurveTo(s * 0.35, -s * 0.75 - aw * s, s * 0.4, -s * 0.95);
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bugsRef.current.forEach((bug) => {
        bug.legPhase += bug.pauseTime > 0 ? 0 : 0.2;

        const dx = bug.targetX - bug.x;
        const dy = bug.targetY - bug.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (bug.pauseTime > 0) {
          bug.pauseTime--;
        } else if (dist < 5) {
          bug.targetX = Math.random() * canvas.width;
          bug.targetY = Math.random() * canvas.height;
          if (Math.random() > 0.65) {
            bug.pauseTime = Math.random() * 80 + 30;
          }
        } else {
          const mx = (dx / dist) * bug.speed;
          const my = (dy / dist) * bug.speed;
          bug.x += mx;
          bug.y += my;
          bug.angle = Math.atan2(my, mx) + Math.PI / 2; // face forward (head up in local space)
        }

        if (bug.x < -20) bug.x = canvas.width + 20;
        if (bug.x > canvas.width + 20) bug.x = -20;
        if (bug.y < -20) bug.y = canvas.height + 20;
        if (bug.y > canvas.height + 20) bug.y = -20;

        if (bug.type === "ladybug") drawLadybug(bug);
        else if (bug.type === "ant") drawAnt(bug);
        else drawBeetle(bug);
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
