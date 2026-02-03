import { useLaserPointer, LaserMode } from "@/providers/LaserPointerProvider";

interface LaserPointerToggleProps {
  className?: string;
}

export function LaserPointerToggle({ className }: LaserPointerToggleProps) {
  const { mode, cycleMode } = useLaserPointer();

  const getTooltip = () => {
    switch (mode) {
      case 'off': return 'Laser pointer off (L)';
      case 'fade': return 'Laser: Fade mode (L) - Right-click to draw';
      case 'persist': return 'Laser: Persist mode (L) - Right-click to draw';
    }
  };

  const getDotColor = () => {
    switch (mode) {
      case 'off': return '#888888';
      case 'fade': return '#ef4444';
      case 'persist': return '#f97316';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      className={`inline-flex items-center justify-center rounded-md border border-input bg-background shadow-xs hover:bg-accent transition-colors ${className ?? ''}`}
      title={getTooltip()}
    >
      {/* Outer ring */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `2px solid ${getDotColor()}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Inner dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: getDotColor(),
          }}
        />
      </div>
      <span className="sr-only">Toggle laser pointer - Current: {mode}</span>
    </button>
  );
}
