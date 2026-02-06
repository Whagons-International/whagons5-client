// @ts-ignore - canvas-confetti types may not be perfect
import confetti from 'canvas-confetti';

import { Logger } from '@/utils/logger';
export type CelebrationType = 'confetti' | 'fireworks' | 'hearts' | 'balloons' | 'sparkles' | 'ribbons' | 'none';

const CELEBRATION_SETTING_KEY = 'wh-celebration-type';

/**
 * Get the current celebration type from localStorage
 */
export function getCelebrationType(): CelebrationType {
  if (typeof window === 'undefined') return 'confetti';
  try {
    const stored = localStorage.getItem(CELEBRATION_SETTING_KEY);
    if (stored === 'confetti' || stored === 'fireworks' || stored === 'hearts' || stored === 'balloons' || stored === 'sparkles' || stored === 'ribbons' || stored === 'none') {
      return stored;
    }
  } catch (error) {
    Logger.warn('confetti', '[Celebration] Error reading localStorage:', error);
  }
  return 'confetti';
}

/**
 * Set the celebration type in localStorage
 */
export function setCelebrationType(type: CelebrationType) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CELEBRATION_SETTING_KEY, type);
  } catch (error) {
    Logger.warn('confetti', '[Celebration] Error saving to localStorage:', error);
  }
}

// ─── Helper: create a temporary fullscreen canvas overlay ────────────────────
function createOverlayCanvas(): { canvas: HTMLCanvasElement; cleanup: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;width:100%;height:100%';
  document.body.appendChild(canvas);

  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  const cleanup = () => {
    window.removeEventListener('resize', onResize);
    canvas.remove();
  };
  return { canvas, cleanup };
}

// ─── Custom canvas: Confetti ─────────────────────────────────────────────────
export function celebrateWithConfetti() {
  if (typeof window === 'undefined') return;

  const { canvas, cleanup } = createOverlayCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) { cleanup(); return; }

  const DURATION = 3500;
  const startTime = Date.now();

  const colors = [
    '#FF3366', '#FF6633', '#FFCC00', '#33CC66',
    '#3399FF', '#9933FF', '#FF33CC', '#00CCCC',
    '#FF5555', '#55FF55', '#5555FF', '#FFAA00',
  ];
  const shapeTypes = ['rect', 'rect', 'circle', 'ribbon', 'ribbon'] as const;

  interface Piece { x: number; y: number; size: number; speed: number; rotation: number; rotationSpeed: number; color: string; drift: number; wobblePhase: number; wobbleSpeed: number; shape: typeof shapeTypes[number]; ribbonWave: number; }

  const pieces: Piece[] = [];
  for (let i = 0; i < 200; i++) {
    pieces.push({
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
      shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      ribbonWave: Math.random() * Math.PI * 2,
    });
  }

  let raf: number;
  const animate = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > DURATION) { cancelAnimationFrame(raf); cleanup(); return; }

    // Fade out in last 800ms
    const fadeAlpha = elapsed > DURATION - 800 ? (DURATION - elapsed) / 800 : 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = fadeAlpha;

    pieces.forEach((p) => {
      p.wobblePhase += p.wobbleSpeed;
      p.ribbonWave += 0.08;
      p.y += p.speed;
      p.x += p.drift + Math.sin(p.wobblePhase) * 1.5;
      p.rotation += p.rotationSpeed;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.wobblePhase * 2), 1);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(-p.size / 2, 0);
        for (let rx = -p.size / 2; rx <= p.size / 2; rx += 2) ctx.lineTo(rx, Math.sin(p.ribbonWave + rx * 0.5) * p.size * 0.15);
        ctx.lineTo(p.size / 2, p.size * 0.15);
        for (let rx = p.size / 2; rx >= -p.size / 2; rx -= 2) ctx.lineTo(rx, Math.sin(p.ribbonWave + rx * 0.5) * p.size * 0.15 + p.size * 0.15);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(animate);
  };
  raf = requestAnimationFrame(animate);
}

// ─── Custom canvas: Hearts ───────────────────────────────────────────────────
export function celebrateWithHearts() {
  if (typeof window === 'undefined') return;

  const { canvas, cleanup } = createOverlayCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) { cleanup(); return; }

  const DURATION = 3500;
  const startTime = Date.now();
  let timeCounter = 0;

  const heartColors = [
    '#FF69B4', '#FF1493', '#FF6B9D', '#E91E63',
    '#FF4081', '#F06292', '#EC407A', '#D81B60',
    '#FFB6C1', '#FF8FA3', '#C2185B',
  ];

  interface Heart { x: number; y: number; size: number; speed: number; opacity: number; drift: number; rotation: number; rotationSpeed: number; color: string; pulse: number; pulseSpeed: number; }

  const hearts: Heart[] = [];
  for (let i = 0; i < 60; i++) {
    hearts.push({
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

  const drawHeart = (x: number, y: number, size: number, opacity: number, rotation: number, color: string, pulseScale: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(pulseScale, pulseScale);
    const s = size;

    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.05, s * 0.1, -s * 0.55, s * 0.05, -s * 0.5, -s * 0.2);
    ctx.bezierCurveTo(-s * 0.45, -s * 0.5, -s * 0.1, -s * 0.5, 0, -s * 0.25);
    ctx.bezierCurveTo(s * 0.1, -s * 0.5, s * 0.45, -s * 0.5, s * 0.5, -s * 0.2);
    ctx.bezierCurveTo(s * 0.55, s * 0.05, s * 0.05, s * 0.1, 0, s * 0.3);
    ctx.closePath();

    const grad = ctx.createRadialGradient(-s * 0.15, -s * 0.15, 0, 0, 0, s * 0.6);
    grad.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
    grad.addColorStop(1, `${color}${Math.round(opacity * 180).toString(16).padStart(2, '0')}`);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.25, s * 0.12, s * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
    ctx.fill();

    ctx.restore();
  };

  let raf: number;
  const animate = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > DURATION) { cancelAnimationFrame(raf); cleanup(); return; }

    timeCounter += 0.016;
    const fadeAlpha = elapsed > DURATION - 800 ? (DURATION - elapsed) / 800 : 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = fadeAlpha;

    hearts.forEach((h) => {
      h.pulse += h.pulseSpeed;
      const pulseScale = 1 + Math.sin(h.pulse) * 0.08;
      h.y -= h.speed;
      h.x += h.drift + Math.sin(timeCounter + h.pulse) * 0.2;
      h.rotation += h.rotationSpeed;
      if (h.y < -50) { h.y = canvas.height + 30; h.x = Math.random() * canvas.width; h.color = heartColors[Math.floor(Math.random() * heartColors.length)]; }
      drawHeart(h.x, h.y, h.size, h.opacity, h.rotation, h.color, pulseScale);
    });

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(animate);
  };
  raf = requestAnimationFrame(animate);
}

// ─── Custom canvas: Fireworks ────────────────────────────────────────────────
export function celebrateWithFireworks() {
  if (typeof window === 'undefined') return;

  const { canvas, cleanup } = createOverlayCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) { cleanup(); return; }

  const DURATION = 4000;
  const startTime = Date.now();

  const colors = [
    [255, 80, 80], [80, 255, 120], [80, 140, 255],
    [255, 230, 50], [255, 80, 220], [50, 230, 255],
    [255, 160, 40], [200, 100, 255],
  ];

  interface P { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number; size: number; friction: number; }
  interface R { x: number; y: number; targetY: number; speed: number; r: number; g: number; b: number; active: boolean; }

  const particles: P[] = [];
  const rockets: R[] = [];

  const createExplosion = (x: number, y: number, cr: number, cg: number, cb: number) => {
    const count = 80 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 5 + 2;
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 50 + Math.random() * 40, maxLife: 90, r: Math.max(0, Math.min(255, cr + Math.floor((Math.random() - 0.5) * 60))), g: Math.max(0, Math.min(255, cg + Math.floor((Math.random() - 0.5) * 60))), b: Math.max(0, Math.min(255, cb + Math.floor((Math.random() - 0.5) * 60))), size: Math.random() * 3 + 2, friction: 0.97 + Math.random() * 0.015 });
    }
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 2 + 0.5;
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 20 + Math.random() * 20, maxLife: 40, r: 255, g: 255, b: 220, size: Math.random() * 2 + 1, friction: 0.95 });
    }
  };

  const launchRocket = () => {
    const c = colors[Math.floor(Math.random() * colors.length)];
    rockets.push({ x: Math.random() * canvas.width * 0.6 + canvas.width * 0.2, y: canvas.height + 10, targetY: Math.random() * canvas.height * 0.4 + canvas.height * 0.08, speed: 6 + Math.random() * 4, r: c[0], g: c[1], b: c[2], active: true });
  };

  launchRocket(); launchRocket();
  let launchTimer = 0;
  let raf: number;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > DURATION && rockets.length === 0 && particles.length === 0) { cancelAnimationFrame(raf); cleanup(); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (elapsed > DURATION - 800) {
      ctx.globalAlpha = Math.max(0, (DURATION - elapsed) / 800);
    }

    launchTimer++;
    if (elapsed < DURATION - 1000 && launchTimer > 40 && rockets.length < 4 && particles.length < 600) {
      launchRocket();
      if (Math.random() > 0.5) setTimeout(launchRocket, 100 + Math.random() * 200);
      launchTimer = 0;
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      if (!r.active) { rockets.splice(i, 1); continue; }
      r.y -= r.speed;
      r.x += (Math.random() - 0.5) * 0.5;
      ctx.fillStyle = 'rgba(255,255,220,0.95)';
      ctx.fillRect(r.x - 2, r.y - 2, 4, 4);
      ctx.fillStyle = `rgba(${r.r},${r.g},${r.b},0.3)`;
      ctx.fillRect(r.x - 4, r.y - 4, 8, 8);
      if (r.y <= r.targetY) { createExplosion(r.x, r.y, r.r, r.g, r.b); r.active = false; }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= p.friction; p.vy *= p.friction; p.vy += 0.04;
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
      const alpha = p.life / p.maxLife;
      const s = p.size * (0.4 + alpha * 0.6);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
      ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(animate);
  };
  raf = requestAnimationFrame(animate);
}

// ─── canvas-confetti based: Balloons ─────────────────────────────────────────
function celebrateWithBalloons() {
  if (typeof window === 'undefined') return;
  try {
    const duration = 4000;
    const animationEnd = Date.now() + duration;
    const balloonColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#FFA500', '#00FFFF'];

    const launchBalloon = (x: number, color: string, delay: number) => {
      setTimeout(() => {
        confetti({ particleCount: 1, startVelocity: 8, spread: 0, origin: { x, y: 1.1 }, colors: [color], shapes: ['circle'], scalar: 3, gravity: -0.15, drift: (Math.random() - 0.5) * 0.2, ticks: 500, zIndex: 9999 });
      }, delay);
    };

    for (let i = 0; i < 8; i++) launchBalloon(0.2 + i * 0.1, balloonColors[i % balloonColors.length], i * 300);

    const interval = setInterval(() => {
      if (Date.now() > animationEnd) { clearInterval(interval); return; }
      launchBalloon(Math.random() * 0.7 + 0.15, balloonColors[Math.floor(Math.random() * balloonColors.length)], 0);
    }, 600);
  } catch (error) { Logger.error('confetti', 'Balloons animation failed:', error); }
}

// ─── canvas-confetti based: Sparkles ─────────────────────────────────────────
function celebrateWithSparkles() {
  if (typeof window === 'undefined') return;
  try {
    const duration = 3500;
    const animationEnd = Date.now() + duration;
    const sparkleColors = ['#FFD700', '#FFF', '#FFED4E', '#C0C0C0', '#F4E869'];

    const createSparkle = () => {
      confetti({ particleCount: 3, startVelocity: 0, spread: 30, origin: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.8 + 0.1 }, colors: sparkleColors, shapes: ['star'], scalar: Math.random() + 1, gravity: 0, drift: 0, ticks: 60, decay: 0.9, zIndex: 9999 });
    };

    for (let i = 0; i < 15; i++) setTimeout(createSparkle, i * 100);
    const interval = setInterval(() => { if (Date.now() > animationEnd) { clearInterval(interval); return; } createSparkle(); }, 150);
  } catch (error) { Logger.error('confetti', 'Sparkles animation failed:', error); }
}

// ─── canvas-confetti based: Ribbons ──────────────────────────────────────────
function celebrateWithRibbons() {
  if (typeof window === 'undefined') return;
  try {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const ribbonColors = ['#FF1744', '#00E676', '#2979FF', '#FFD600', '#FF6D00', '#E040FB'];

    const createRibbon = (x: number, color: string) => {
      confetti({ particleCount: 8, startVelocity: 25, spread: 15, angle: 90, origin: { x, y: 0 }, colors: [color], shapes: ['square'], scalar: 2, gravity: 0.8, drift: (Math.random() - 0.5) * 2, ticks: 200, zIndex: 9999 });
    };

    [0.2, 0.4, 0.6, 0.8].forEach((x, i) => setTimeout(() => createRibbon(x, ribbonColors[i % ribbonColors.length]), i * 200));
    const interval = setInterval(() => { if (Date.now() > animationEnd) { clearInterval(interval); return; } createRibbon(Math.random() * 0.7 + 0.15, ribbonColors[Math.floor(Math.random() * ribbonColors.length)]); }, 400);
  } catch (error) { Logger.error('confetti', 'Ribbons animation failed:', error); }
}

/**
 * Triggers a celebration animation when a task is completed.
 * Confetti, hearts, and fireworks use custom canvas rendering (same as Ctrl+Shift+M effects).
 * Balloons, sparkles, and ribbons use canvas-confetti library.
 */
export function celebrateTaskCompletion(categoryEffect?: string | null) {
  const celebrationType = (categoryEffect && categoryEffect !== '') ? categoryEffect : getCelebrationType();

  if (celebrationType === 'none') return;

  if (celebrationType === 'fireworks') celebrateWithFireworks();
  else if (celebrationType === 'hearts') celebrateWithHearts();
  else if (celebrationType === 'balloons') celebrateWithBalloons();
  else if (celebrationType === 'sparkles') celebrateWithSparkles();
  else if (celebrationType === 'ribbons') celebrateWithRibbons();
  else celebrateWithConfetti();
}

// Expose function globally for testing: window.testConfetti()
if (typeof window !== 'undefined') {
  (window as any).testConfetti = celebrateTaskCompletion;
  (window as any).testFireworks = celebrateWithFireworks;
  (window as any).testConfettiOnly = celebrateWithConfetti;
  (window as any).testHearts = celebrateWithHearts;
  (window as any).testBalloons = celebrateWithBalloons;
  (window as any).testSparkles = celebrateWithSparkles;
  (window as any).testRibbons = celebrateWithRibbons;
}
