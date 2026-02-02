import { useState, forwardRef } from "react";
import type { SchedulerResource } from "../types/scheduler";

interface ResourceListProps {
  resources: SchedulerResource[];
  rowHeight: number;
  selectedResourceIds?: Set<number>;
  onResourceSelect?: (resourceId: number) => void;
}

const ResourceList = forwardRef<HTMLDivElement, ResourceListProps>(function ResourceList({
  resources,
  rowHeight,
  selectedResourceIds = new Set(),
  onResourceSelect,
}, ref) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Use resources in the order provided by parent (must match TimelineCanvas row order)
  const sortedResources = resources;

  const getInitials = (name: string): string => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getColor = (name: string, provided?: string): string => {
    if (provided) return provided;
    const colors = [
      "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
      "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
      "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className="scheduler-resource-list border-r border-border/30 bg-gradient-to-b from-background via-background to-muted/10 flex flex-col"
      style={{ width: 280, minWidth: 280 }}
    >
      {/* Header */}
      <div
        className="sticky top-0 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent border-b border-border/30 px-4 font-medium text-sm z-10 flex items-center justify-between backdrop-blur-md"
        style={{ height: 40 }}
      >
        <span className="text-foreground/85 tracking-tight font-semibold text-[13px]">Users</span>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full shadow-sm">
          {sortedResources.length}
        </span>
      </div>

      {/* List */}
      <div ref={ref} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sortedResources.length === 0 ? (
          <div className="scheduler-empty p-8 text-center flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-sm font-medium text-muted-foreground/70">No resources</div>
            <div className="text-xs text-muted-foreground/50 mt-1.5 max-w-[180px]">Select users to display in the scheduler</div>
          </div>
        ) : (
          sortedResources.map((resource, index) => {
            const hasImageError = imageErrors.has(resource.id);
            const showFallback = !resource.avatar || resource.avatar === "" || hasImageError;
            const isSelected = selectedResourceIds.has(resource.id);
            const avatarColor = getColor(resource.name, resource.color);
            const isEven = index % 2 === 0;

            return (
              <div
                key={resource.id}
                className={`scheduler-resource-row group px-4 cursor-pointer transition-all duration-200 ease-out flex items-center ${
                  isSelected
                    ? "bg-primary/8 border-l-[3px] border-l-primary"
                    : isEven
                      ? "bg-transparent hover:bg-muted/40 border-l-[3px] border-l-transparent"
                      : "bg-muted/15 hover:bg-muted/50 border-l-[3px] border-l-transparent"
                }`}
                style={{ height: rowHeight }}
                onClick={() => onResourceSelect?.(resource.id)}
              >
                <div className="flex items-center gap-3.5 w-full min-w-0">
                  {showFallback ? (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 transition-all duration-200 ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : "group-hover:scale-105 group-hover:shadow-lg"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${avatarColor}cc 0%, ${avatarColor} 50%, ${avatarColor}dd 100%)`,
                        boxShadow: `0 4px 12px ${avatarColor}35`,
                      }}
                    >
                      {getInitials(resource.name)}
                    </div>
                  ) : (
                    <img
                      src={resource.avatar}
                      alt={resource.name}
                      className={`w-10 h-10 rounded-full object-cover flex-shrink-0 transition-all duration-200 ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : "group-hover:scale-105 group-hover:shadow-lg"
                      }`}
                      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                      onError={() => setImageErrors((prev) => new Set(prev).add(resource.id))}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13px] font-medium truncate leading-tight tracking-[-0.01em] transition-colors duration-200 ${
                        isSelected ? "text-primary" : "text-foreground group-hover:text-foreground/90"
                      }`}
                    >
                      {resource.name}
                    </div>
                    {resource.teamName && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase truncate max-w-full"
                          style={{
                            backgroundColor: `${avatarColor}12`,
                            color: avatarColor,
                            boxShadow: `0 0 0 1px ${avatarColor}15`,
                          }}
                        >
                          {resource.teamName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default ResourceList;
