/**
 * Config column definition: SLA badges and approval status indicators
 * Note: Approval interaction (approve/reject buttons) has been moved to the Status column
 * This column now only shows:
 * - SLA badges (always, if configured)
 * - Small approval status indicator for completed approvals (approved/rejected)
 */

import { Clock } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ColumnBuilderOptions } from './types';

function formatSlaDuration(seconds?: number | null) {
  const secs = Number(seconds);
  if (!Number.isFinite(secs)) return null;
  const totalMinutes = Math.floor(secs / 60);
  const hrs = Math.floor(totalMinutes / 60);
  const remMins = totalMinutes % 60;
  if (hrs > 0 && remMins > 0) return `${hrs}h ${remMins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${remMins}m`;
}

function renderSlaPill(slaId: any, slaMap: Record<number, any>) {
  const sla = slaMap?.[Number(slaId)];
  const responseLabel = formatSlaDuration(sla?.response_time);
  const resolutionLabel = formatSlaDuration(sla?.resolution_time);
  const priorityLabel = sla?.priority_id ? `Priority #${sla.priority_id}` : null;
  const pill = (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-opacity-10 flex-shrink-0 cursor-pointer"
      style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
      <Clock className="w-3.5 h-3.5 text-purple-600" />
      <span className="text-[11px] font-medium text-purple-600">SLA</span>
    </div>
  );

  if (!sla) return pill;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {pill}
      </PopoverTrigger>
      <PopoverContent side="right" className="max-w-[320px] p-0">
        <div className="flex flex-col">
          <div className="bg-purple-600 dark:bg-purple-700 text-white px-3 py-2 flex items-center gap-2 border-b">
            <Clock className="w-4 h-4" />
            <div className="text-sm font-semibold truncate">{sla.name || 'SLA'}</div>
          </div>
          <div className="p-3 space-y-2 text-[12px]">
            {responseLabel && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Response:</span>
                <Badge variant="secondary">{responseLabel}</Badge>
              </div>
            )}
            {resolutionLabel && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Resolution:</span>
                <Badge variant="secondary">{resolutionLabel}</Badge>
              </div>
            )}
            {priorityLabel && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Priority:</span>
                <Badge variant="outline">{priorityLabel}</Badge>
              </div>
            )}
            {sla.description ? (
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words pt-2">
                {sla.description}
              </div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function renderSLA(p: any, opts: ColumnBuilderOptions) {
  const { categoryMap, slaMap } = opts;

  const row = p?.data || {};
  const categoryId = row?.category_id;
  const category = categoryId ? categoryMap[Number(categoryId)] : null;
  const slaId = row?.sla_id ?? category?.sla_id;

  // Config column only shows SLA badges
  // Approval status is now fully handled in the Status column
  if (slaId) {
    return renderSlaPill(slaId, slaMap);
  }
  
  return null;
}

export function createConfigColumn(opts: ColumnBuilderOptions) {
  return {
    colId: 'config',
    headerName: '',
    width: 60,
    minWidth: 50,
    maxWidth: 80,
    filter: false,
    sortable: false,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    cellRenderer: (p: any) => {
      const config = renderSLA(p, opts);
      if (!config) {
        return (
          <div className="flex items-center justify-center h-full w-full py-2">
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center h-full w-full py-1">
          {config}
        </div>
      );
    },
    onCellClicked: (params: any) => {
      // Prevent row click event from firing when clicking anywhere in the config column
      // The PopoverTrigger components inside will handle their own clicks
      if (params.event) {
        params.event.stopPropagation();
        // Don't preventDefault - allow PopoverTrigger to handle clicks
      }
    },
  };
}
