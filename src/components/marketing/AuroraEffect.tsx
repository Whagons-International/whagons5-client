import { useEffect, useRef } from "react";

interface AuroraEffectProps {
  onClose?: () => void;
}

/**
 * Realistic Aurora Borealis effect.
 *
 * Key visual characteristics of real aurora:
 * - Vertical curtains/veils of light hanging from the sky
 * - Light is brightest at the top edge and fades downward
 * - Dominant green with purple/pink at the upper edges and blue at the base
 * - Curtains sway and ripple horizontally like fabric in wind
 * - Translucent, overlapping layers
 * - Occasional bright flare-ups along the curtain edge
 */
export default function AuroraEffect({ onClose: _onClose }: AuroraEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    // Pre-compute random offsets for curtain columns to avoid recalculating
    const COLS = 300; // number of vertical strips across the screen
    const colSeeds = Array.from({ length: COLS }, () => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      amp: 0.6 + Math.random() * 0.4,
      brightnessOffset: Math.random() * Math.PI * 2,
    }));

    // Stars
    const starCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 6000), 400);
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      r: Math.random() * 1.2 + 0.3,
      bri: Math.random() * 0.5 + 0.3,
      tw: Math.random() * 2 + 0.5,
      to: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      timeRef.current += 0.003; // slow, graceful movement
      const t = timeRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Clear with a very dark blue-black
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(4, 6, 18, 0.15)";
      ctx.fillRect(0, 0, W, H);

      // Draw stars
      for (const s of stars) {
        const twinkle = Math.sin(t * 8 * s.tw + s.to) * 0.25 + 0.75;
        const a = s.bri * twinkle;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 225, 255, ${a})`;
        ctx.fill();
      }

      // --- Aurora curtains ---
      // We draw vertical strips across the screen width.
      // Each strip is a vertical gradient from bright at the curtain edge (top)
      // fading to transparent at the bottom. The curtain edge undulates.

      const stripW = Math.ceil(W / COLS) + 1;

      // Three overlapping curtain layers: green (dominant), purple-pink, blue-teal
      const layers = [
        {
          // Primary green curtain
          topHue: 130, topSat: 80, topLit: 65,
          midHue: 140, midSat: 75, midLit: 50,
          baseAlpha: 0.35,
          edgeY: 0.12,    // how high the bright edge sits (fraction of H)
          curtainH: 0.50,  // how far down the curtain extends
          swaySpeed: 1.0,
          swayAmp: 1.0,
          phaseShift: 0,
        },
        {
          // Purple-pink upper layer
          topHue: 290, topSat: 70, topLit: 70,
          midHue: 310, midSat: 65, midLit: 55,
          baseAlpha: 0.20,
          edgeY: 0.07,
          curtainH: 0.35,
          swaySpeed: 0.8,
          swayAmp: 1.2,
          phaseShift: 1.5,
        },
        {
          // Blue-teal lower glow
          topHue: 180, topSat: 60, topLit: 55,
          midHue: 200, midSat: 65, midLit: 45,
          baseAlpha: 0.18,
          edgeY: 0.20,
          curtainH: 0.45,
          swaySpeed: 0.6,
          swayAmp: 0.8,
          phaseShift: 3.0,
        },
      ];

      for (const layer of layers) {
        for (let i = 0; i < COLS; i++) {
          const seed = colSeeds[i];
          const xNorm = i / COLS; // 0..1
          const x = xNorm * W;

          // Undulating curtain edge Y position
          const sway =
            Math.sin(xNorm * 6 + t * 1.5 * layer.swaySpeed + seed.phase + layer.phaseShift) *
              20 * seed.amp * layer.swayAmp +
            Math.sin(xNorm * 14 + t * 2.5 * layer.swaySpeed + seed.phase * 2) *
              8 * seed.amp +
            Math.sin(xNorm * 2.5 + t * 0.4 * layer.swaySpeed + layer.phaseShift) *
              35 * layer.swayAmp;

          const edgeY = H * layer.edgeY + sway;
          const curtainBottom = edgeY + H * layer.curtainH;

          // Brightness variation along the curtain (some columns brighter)
          const brightPulse =
            Math.sin(t * 2 * seed.speed + seed.brightnessOffset + xNorm * 4) * 0.3 + 0.7;
          // Slow large-scale brightness wave
          const brightWave =
            Math.sin(xNorm * 3 + t * 0.5 + layer.phaseShift) * 0.25 + 0.75;
          const alpha = layer.baseAlpha * brightPulse * brightWave;

          // Draw vertical gradient strip: bright at edgeY, fading to transparent at curtainBottom
          const grad = ctx.createLinearGradient(x, edgeY - 15, x, curtainBottom);
          // Very top: slight purple/pink tint (upper edge of real aurora)
          grad.addColorStop(0, `hsla(${layer.topHue}, ${layer.topSat}%, ${layer.topLit}%, ${alpha * 0.3})`);
          // Bright edge
          grad.addColorStop(0.05, `hsla(${layer.topHue}, ${layer.topSat}%, ${layer.topLit}%, ${alpha * 0.9})`);
          // Main body
          grad.addColorStop(0.15, `hsla(${layer.midHue}, ${layer.midSat}%, ${layer.midLit}%, ${alpha * 0.7})`);
          grad.addColorStop(0.4, `hsla(${layer.midHue}, ${layer.midSat}%, ${layer.midLit}%, ${alpha * 0.35})`);
          grad.addColorStop(0.7, `hsla(${layer.midHue}, ${layer.midSat}%, ${layer.midLit - 10}%, ${alpha * 0.12})`);
          grad.addColorStop(1, `hsla(${layer.midHue}, ${layer.midSat}%, ${layer.midLit}%, 0)`);

          ctx.fillStyle = grad;
          ctx.fillRect(x, edgeY - 15, stripW, curtainBottom - edgeY + 15);
        }
      }

      // --- Bright edge highlight (the glowing ribbon at the curtain top) ---
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Trace the bright edge of the primary green curtain as a glowing line
      ctx.beginPath();
      for (let i = 0; i <= COLS; i++) {
        const seed = colSeeds[Math.min(i, COLS - 1)];
        const xNorm = i / COLS;
        const x = xNorm * W;

        const sway =
          Math.sin(xNorm * 6 + t * 1.5 + seed.phase) * 20 * seed.amp +
          Math.sin(xNorm * 14 + t * 2.5 + seed.phase * 2) * 8 * seed.amp +
          Math.sin(xNorm * 2.5 + t * 0.4) * 35;

        const edgeY = H * 0.12 + sway;

        if (i === 0) ctx.moveTo(x, edgeY);
        else ctx.lineTo(x, edgeY);
      }
      ctx.strokeStyle = "rgba(150, 255, 180, 0.12)";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(100, 255, 150, 0.4)";
      ctx.stroke();

      // Second brighter, thinner line
      ctx.strokeStyle = "rgba(200, 255, 210, 0.08)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(180, 255, 200, 0.3)";
      ctx.stroke();

      ctx.restore();

      // --- Subtle overall glow bloom ---
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.04;
      const bloomX = W * (0.4 + Math.sin(t * 0.2) * 0.1);
      const bloomY = H * (0.15 + Math.sin(t * 0.15) * 0.03);
      const bloomR = W * 0.35;
      const bloom = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, bloomR);
      bloom.addColorStop(0, "hsla(140, 80%, 60%, 0.5)");
      bloom.addColorStop(0.4, "hsla(160, 70%, 50%, 0.2)");
      bloom.addColorStop(1, "hsla(140, 60%, 40%, 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas ref={canvasRef} className="w-full h-full bg-black/30" />
    </div>
  );
}
