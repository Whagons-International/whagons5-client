import { useLaserPointer } from "@/providers/LaserPointerProvider";

export function LaserPointerToggle() {
  const { mode, cycleMode } = useLaserPointer();

  const isActive = mode !== 'off';

  const getTooltip = () => {
    switch (mode) {
      case 'off': return 'Laser pointer (L)';
      case 'fade': return 'Laser: Fade mode (L)';
      case 'persist': return 'Laser: Persist mode (L)';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      title={getTooltip()}
      className={`
        fixed bottom-5 right-5 z-[9998] rounded-full flex items-center justify-center
        transition-all duration-300 ease-in-out cursor-pointer border-0 p-0 outline-none
        hover:scale-125
        ${isActive
          ? 'w-8 h-8 opacity-90 hover:opacity-100'
          : 'w-7 h-7 opacity-40 hover:opacity-70 bg-foreground/5 hover:bg-foreground/10 shadow-sm'
        }
      `}
      style={isActive ? {
        backgroundColor: mode === 'persist' ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
        boxShadow: mode === 'persist'
          ? '0 0 10px 2px rgba(249,115,22,0.3), 0 0 20px 6px rgba(249,115,22,0.12)'
          : '0 0 10px 2px rgba(239,68,68,0.3), 0 0 20px 6px rgba(239,68,68,0.12)',
      } : undefined}
    >
      {/* Inner dot */}
      <div
        className={`rounded-full transition-all duration-300 ${
          isActive ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5 bg-foreground/30'
        }`}
        style={isActive ? {
          backgroundColor: mode === 'persist' ? '#f97316' : '#ef4444',
          boxShadow: mode === 'persist'
            ? '0 0 6px 1px #f97316'
            : '0 0 6px 1px #ef4444',
        } : undefined}
      />
      <span className="sr-only">Toggle laser pointer - Current: {mode}</span>
    </button>
  );
}
