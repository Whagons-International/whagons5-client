import { useEffect, useRef, useState } from "react";

interface MatrixRainEffectProps {
  onClose?: () => void;
}

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: { char: string; brightness: number; changeTimer: number }[];
  length: number;
  spawnTimer: number;
}

export default function MatrixRainEffect({ onClose: _onClose }: MatrixRainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
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

    const CHAR_SIZE = 14;
    const HALF_WIDTH_CHARS = "0123456789ABCDEFabcdef:.<>{}[]|/\\+=*&^%$#@!~";
    // Katakana range for that classic Matrix look
    const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const ALL_CHARS = KATAKANA + HALF_WIDTH_CHARS;

    const getRandomChar = () => ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    };

    const initColumns = () => {
      const numCols = Math.ceil(canvas.width / CHAR_SIZE);
      columnsRef.current = [];
      for (let i = 0; i < numCols; i++) {
        const length = Math.floor(Math.random() * 20) + 8;
        const chars = [];
        for (let j = 0; j < length; j++) {
          chars.push({
            char: getRandomChar(),
            brightness: 0,
            changeTimer: Math.random() * 100,
          });
        }
        columnsRef.current.push({
          x: i * CHAR_SIZE,
          y: -Math.random() * canvas.height * 2, // stagger start positions
          speed: Math.random() * 2.5 + 1.5,
          chars,
          length,
          spawnTimer: Math.random() * 200,
        });
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = () => {
      timeRef.current += 0.016;

      // Fade previous frame with semi-transparent overlay
      ctx.fillStyle = isDarkMode ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${CHAR_SIZE}px "Courier New", "MS Gothic", monospace`;
      ctx.textAlign = "center";

      columnsRef.current.forEach((col) => {
        col.y += col.speed;

        // Draw each character in the column
        col.chars.forEach((c, i) => {
          const charY = col.y - i * CHAR_SIZE;

          // Skip if off-screen
          if (charY < -CHAR_SIZE || charY > canvas.height + CHAR_SIZE) return;

          // Randomly change characters for glitch effect
          c.changeTimer -= 1;
          if (c.changeTimer <= 0) {
            c.char = getRandomChar();
            c.changeTimer = Math.random() * 60 + 20;
          }

          // Head character (brightest, white/bright green)
          const isHead = i === 0;
          // Brightness falls off along the tail
          const tailFade = 1 - (i / col.length);

          if (isHead) {
            if (isDarkMode) {
              ctx.fillStyle = `rgba(180, 255, 180, 0.95)`;
              ctx.shadowBlur = 12;
              ctx.shadowColor = "rgba(0, 255, 70, 0.8)";
            } else {
              ctx.fillStyle = `rgba(0, 80, 0, 0.9)`;
              ctx.shadowBlur = 8;
              ctx.shadowColor = "rgba(0, 140, 0, 0.5)";
            }
          } else {
            const alpha = tailFade * 0.7;
            if (isDarkMode) {
              const green = Math.floor(140 + tailFade * 115);
              ctx.fillStyle = `rgba(0, ${green}, 0, ${alpha})`;
            } else {
              const green = Math.floor(60 + tailFade * 80);
              ctx.fillStyle = `rgba(0, ${green}, 0, ${alpha * 0.8})`;
            }
            ctx.shadowBlur = 0;
          }

          ctx.fillText(c.char, col.x + CHAR_SIZE / 2, charY);
          ctx.shadowBlur = 0;
        });

        // Reset column when it goes off bottom
        if (col.y - col.length * CHAR_SIZE > canvas.height) {
          col.y = -Math.random() * canvas.height * 0.5 - col.length * CHAR_SIZE;
          col.speed = Math.random() * 2.5 + 1.5;
          col.length = Math.floor(Math.random() * 20) + 8;
          // Regenerate chars
          col.chars = [];
          for (let j = 0; j < col.length; j++) {
            col.chars.push({
              char: getRandomChar(),
              brightness: 0,
              changeTimer: Math.random() * 100,
            });
          }
        }
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
