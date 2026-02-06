import { useEffect, useRef, useState } from "react";

// Base values (viewBox coordinates)
const VIEWBOX_SIZE = 400;

interface LoadingWidgetProps {
  /** Size of the widget in pixels (default: 400) */
  size?: number;
  /** Ring radius as percentage of size (default: 30, which is 120/400) */
  radiusRatio?: number;
  /** Stroke width as percentage of size (default: 4.5, which is 18/400) */
  strokeWidthRatio?: number;
  /** Ring color (default: "#ffffff") */
  color?: string;
  /** Animation cycle duration in seconds (default: 0.9) */
  cycleDuration?: number;
  /** Additional CSS class names */
  className?: string;
}

export function LoadingWidget({
  size = 400,
  radiusRatio = 30,
  strokeWidthRatio = 4.5,
  color = "#ffffff",
  cycleDuration = 0.9,
  className = "",
}: LoadingWidgetProps) {
  // Radius in viewBox coordinates
  const radius = (radiusRatio / 100) * VIEWBOX_SIZE;
  // Stroke width in screen pixels (for non-scaling-stroke)
  const strokeWidth = (strokeWidthRatio / 100) * size;
  const ring1Ref = useRef<SVGCircleElement>(null);
  const ring2Ref = useRef<SVGCircleElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const ring1 = ring1Ref.current;
    const ring2 = ring2Ref.current;
    if (!ring1 || !ring2) return;

    const cycleDurationMs = cycleDuration * 1000;

    function animate(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const cycleProgress = (elapsed % cycleDurationMs) / cycleDurationMs;

      // Z rotation: continuous spin
      const zRotation = cycleProgress * 90; // 90 degrees per cycle

      // XY rotation: pulse from 0 to PI/2 and back (creates flatten effect)
      const xyProgress = cycleProgress < 0.5 
        ? cycleProgress * 2 // 0 to 1 in first half
        : 2 - cycleProgress * 2; // 1 to 0 in second half
      
      // Ease in-out function
      const eased = xyProgress < 0.5
        ? 2 * xyProgress * xyProgress
        : 1 - Math.pow(-2 * xyProgress + 2, 2) / 2;
      
      const rotationXY = eased * (Math.PI / 2);
      const scaleX = Math.cos(rotationXY);

      // Ring 1: Apply rotation and then the perspective scale
      ring1.setAttribute("transform", `rotate(${zRotation}) scale(${scaleX}, 1)`);

      // Ring 2: Apply rotation (+90deg offset) and then the perspective scale
      ring2.setAttribute("transform", `rotate(${zRotation + 90}) scale(${scaleX}, 1)`);

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cycleDuration]);

  const center = VIEWBOX_SIZE / 2;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className={className}
      style={{
        display: "block",
        width: size,
        height: size,
      }}
    >
      <g transform={`translate(${center}, ${center})`}>
        <circle
          ref={ring1Ref}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          ref={ring2Ref}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

export default LoadingWidget;
