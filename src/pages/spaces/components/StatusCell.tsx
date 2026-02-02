'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
 
import { MultiStateBadge, AnimatedSpinner } from '@/animated/Status';
import { Clock, Zap, Check, PauseCircle } from 'lucide-react';
import { ApprovalPopup, ApproverDetail } from '@/pages/spaces/components/workspaceTable/columns/ApprovalPopup';

type StatusMeta = { name: string; color?: string; icon?: string; action?: string };

interface ApprovalProps {
  approval: any;
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;
  approverDetails: ApproverDetail[];
  canAct: boolean;
  slaPill?: React.ReactNode;
  submitDecision: (decision: 'approved' | 'rejected', onSuccess?: () => void) => Promise<void>;
}

interface StatusCellProps {
  value: number;
  statusMap: Record<number, StatusMeta>;
  getStatusIcon: (iconName?: string) => any;
  allowedNext: number[];
  onChange: (toStatusId: number) => Promise<boolean> | boolean;
  taskId?: number;
  // Approval props - when provided and approval is pending/rejected, shows approval UI
  approvalProps?: ApprovalProps;
}

const StatusCell: React.FC<StatusCellProps> = ({ value, statusMap, getStatusIcon, allowedNext, onChange, approvalProps }) => {
  const [open, setOpen] = useState(false);
  const [animationState, setAnimationState] = useState<'custom' | 'processing' | 'success' | 'error'>('custom');

  // Check if we should show approval UI instead of status dropdown
  const showApprovalUI = approvalProps && 
    (approvalProps.approvalStatus === 'pending' || approvalProps.approvalStatus === 'rejected');

  // Close popover on scroll
  useEffect(() => {
    if (!open) return;

    const handleScroll = () => {
      setOpen(false);
    };

    // Listen to scroll events on window and all scrollable containers
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);
  const meta = statusMap[value];
  const action = meta?.action?.toLowerCase?.() || '';
  const nameLower = (meta?.name || '').toLowerCase();
  // Support both English and Spanish status names
  const isWorkingStatus = action === 'working' || action === 'in_progress' || nameLower.includes('progress') || nameLower.includes('progreso');
  const isPendingStatus = action === 'pending' || action === 'waiting' || action === 'queued' || nameLower.includes('pending') || nameLower.includes('review') || nameLower.includes('pendiente') || nameLower.includes('espera');
  const isDoneStatus = action === 'done' || action === 'completed' || nameLower.includes('done') || nameLower.includes('complete') || nameLower.includes('finalizado') || nameLower.includes('terminado') || nameLower.includes('completado');

  const baseColor = meta?.color || '#6B7280';

  const variantIcon = isPendingStatus
    ? <Clock className="w-3.5 h-3.5" />
    : isWorkingStatus
      ? <Zap className="w-3.5 h-3.5" />
      : isDoneStatus
        ? <Check className="w-3.5 h-3.5" />
        : <PauseCircle className="w-3.5 h-3.5" />;
  if (!meta) {
    return (
      <div className="flex items-center h-full py-2">
        <span className="opacity-0">.</span>
      </div>
    );
  }
  const name = meta.name;

  // Create custom status config for the MultiStateBadge
  const customStatusConfig = {
    label: name,
    icon: null,
    bg: baseColor,
    glow: "",
    color: '#ffffff'
  };

  // Check if status name is long enough to need two-line display
  // Only wrap if: has multiple words AND total length > 14 characters
  const words = name.trim().split(/\s+/);
  const needsWrap = words.length > 1 && name.length > 14;

  const StatusPill = (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold ${needsWrap ? 'text-[11px]' : 'text-[13px]'}`}
      style={{ background: baseColor, color: '#ffffff' }}
    >
      {isWorkingStatus ? (
        <span className="relative inline-flex items-center justify-center h-4 w-4 flex-shrink-0" aria-busy="true" style={{ color: '#ffffff' }}>
          <AnimatedSpinner className="h-4 w-4" />
        </span>
      ) : (
        <span className="w-3.5 h-3.5 flex-shrink-0">{variantIcon}</span>
      )}
      {needsWrap ? (
        <span className="text-[11px] font-semibold leading-tight capitalize text-center whitespace-normal block">
          {words[0]}<br />{words.slice(1).join(' ')}
        </span>
      ) : (
        <span className="text-[13px] font-semibold leading-none capitalize whitespace-normal">{name}</span>
      )}
    </div>
  );

  const items = useMemo(() => {
    return allowedNext
      .map((id) => ({ id, meta: statusMap[id] }))
      .filter((it) => it.meta);
  }, [allowedNext, statusMap]);

  const BadgeContent = (
    <MultiStateBadge
      state={animationState}
      customStatus={customStatusConfig}
      customComponent={StatusPill}
      className="cursor-pointer"
    />
  );

  // If approval is pending or rejected, show approval UI instead of status dropdown
  if (showApprovalUI && approvalProps) {
    const { approval, approvalStatus, approverDetails, canAct, slaPill, submitDecision } = approvalProps;
    const normalizedStatus = approvalStatus?.toLowerCase() || 'pending';
    const statusLabel = normalizedStatus === 'approved' ? 'Approved' 
      : normalizedStatus === 'rejected' ? 'Rejected' 
      : 'Pending Approval';

    // Check if approval label is long enough to need two-line display
    // Only wrap if: has multiple words AND total length > 14 characters
    const approvalWords = statusLabel.trim().split(/\s+/);
    const approvalNeedsWrap = approvalWords.length > 1 && statusLabel.length > 14;

    // Create the approval pill trigger styled like a status but indicating approval state
    const ApprovalPill = (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold ${approvalNeedsWrap ? 'text-[11px]' : 'text-[13px]'} cursor-pointer transition-all hover:opacity-90 ${
          normalizedStatus === 'rejected' 
            ? 'bg-red-500 text-white' 
            : 'bg-amber-500 text-white'
        }`}
      >
        {normalizedStatus === 'rejected' ? (
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {approvalNeedsWrap ? (
          <span className="text-[11px] font-semibold leading-tight capitalize text-center whitespace-normal block">
            {approvalWords[0]}<br />{approvalWords.slice(1).join(' ')}
          </span>
        ) : (
          <span className="leading-none capitalize">{statusLabel}</span>
        )}
      </div>
    );

    const triggerElement = (
      <div
        className="flex items-center h-full py-1 gap-2 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {ApprovalPill}
      </div>
    );

    return (
      <ApprovalPopup
        approval={approval}
        normalizedApprovalStatus={normalizedStatus}
        approvalStatusLabel={statusLabel}
        approverDetails={approverDetails}
        canAct={canAct}
        slaPill={slaPill}
        submitDecision={submitDecision}
        trigger={triggerElement}
        open={open}
        onOpenChange={setOpen}
      />
    );
  }

  // Normal status dropdown
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="flex items-center h-full py-1 gap-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {BadgeContent}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        side="right" 
        align="start" 
        className="p-2 w-auto min-w-[180px] rounded-lg shadow-lg border border-border/50 bg-background" 
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
          <div className="flex flex-col gap-1">
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground px-3 py-2 text-center">No transitions available</div>
            )}
            {items.map(({ id, meta }) => (
              <Button
                key={id}
                variant="ghost"
                className="justify-start h-9 px-3 text-sm font-medium hover:bg-accent/60 transition-colors rounded-md"
                onClick={async (e) => {
                  e.stopPropagation();
                  setOpen(false);
                  try {
                    setAnimationState('processing');
                    const ok = await onChange(id);
                    if (ok) {
                      setAnimationState('success');
                      setTimeout(() => setAnimationState('custom'), 1000);
                    } else {
                      setAnimationState('error');
                      setTimeout(() => setAnimationState('custom'), 1000);
                    }
                  } catch (_) {
                    setAnimationState('error');
                    setTimeout(() => setAnimationState('custom'), 1000);
                  }
                }}
              >
                <span className="inline-flex items-center gap-2.5 w-full">
                  {meta?.icon ? (
                    <FontAwesomeIcon 
                      icon={getStatusIcon(meta.icon)} 
                      className="text-sm flex-shrink-0" 
                      style={{ color: meta?.color || undefined }} 
                    />
                  ) : (
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background" 
                      style={{ backgroundColor: meta?.color || '#6B7280', boxShadow: `0 0 0 1px ${meta?.color || '#6B7280'}20` }} 
                    />
                  )}
                  <span className="text-sm font-medium text-foreground capitalize">
                    {meta?.name || `#${id}`}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </PopoverContent>
    </Popover>
  );
};

export default StatusCell;


