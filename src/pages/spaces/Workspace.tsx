import { useRef, useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { UrlTabs } from '@/components/ui/url-tabs';
import { MessageSquare, FolderPlus, X, CheckCircle2, UserRound, CalendarDays, Flag, Trash2, Paintbrush } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { TabsTrigger } from '@/animated/Tabs';
import { WorkspaceTableHandle } from '@/pages/spaces/components/WorkspaceTable';
import ChatTab from '@/pages/spaces/components/ChatTab';
import ResourcesTab from '@/pages/spaces/components/ResourcesTab';
import WhiteboardViewTab from '@/pages/spaces/components/WhiteboardViewTab';
import { Button } from '@/components/ui/button';
import TaskDialog from '@/pages/spaces/components/TaskDialog';
import { TAB_ANIMATION, getTabInitialX, type TabAnimationConfig } from '@/config/tabAnimation';
import FilterBuilderDialog from '@/pages/spaces/components/FilterBuilderDialog';
import TaskNotesModal from '@/pages/spaces/components/TaskNotesModal';
import { useLanguage } from '@/providers/LanguageProvider';
import { useAuth } from '@/providers/AuthProvider';
import { DeleteTaskDialog } from '@/components/tasks/DeleteTaskDialog';
import { WorkspaceKpiCard } from '@/pages/spaces/components/WorkspaceKpiCard';
import { useTable } from '@/store/dexie';
import { useWorkspaceUIStore } from '@/store/workspaceUIStore';
import { useWorkspaceRouting } from './workspace/hooks/useWorkspaceRouting';
import { useWorkspaceTabOrder } from './workspace/hooks/useWorkspaceTabOrder';
import { useWorkspaceDisplayOptions } from './workspace/hooks/useWorkspaceDisplayOptions';
import { useWorkspaceTabState } from './workspace/hooks/useWorkspaceTabState';
import { useWorkspaceStats } from './workspace/hooks/useWorkspaceStats';
import { useWorkspaceKpiCards } from './workspace/hooks/useWorkspaceKpiCards';
import { useWorkspaceTaskActions } from './workspace/hooks/useWorkspaceTaskActions';
import { useWorkspaceRightPanel } from './workspace/hooks/useWorkspaceRightPanel';
import { useWorkspaceFilters } from './workspace/hooks/useWorkspaceFilters';
import { useWorkspaceDragDrop } from './workspace/hooks/useWorkspaceDragDrop';
import { useWorkspaceTaskDialog } from './workspace/hooks/useWorkspaceTaskDialog';
import { useWorkspaceRowDensity } from './workspace/hooks/useWorkspaceRowDensity';
import { useTaskCompletionToast } from './workspace/hooks/useTaskCompletionToast';
import { createWorkspaceTabs } from './workspace/utils/workspaceTabs';
import { SortableTab } from './workspace/components/SortableTab';
import { SortableKpiCard } from './workspace/components/SortableKpiCard';
import { WORKSPACE_TAB_PATHS, ALWAYS_VISIBLE_TABS, FIXED_TABS, type WorkspaceTabKey } from './workspace/constants';

export const Workspace = () => {
  const { t } = useLanguage();
  const location = useLocation();

  // Routing
  const routing = useWorkspaceRouting(location);
  const { id, workspaceBasePath, isAllWorkspaces, workspaceIdNum, invalidWorkspaceRoute, invalidWorkspaceId } = routing;
  const workspaceKey = id || 'all';

  // Tab order and state
  const { customTabOrder, setCustomTabOrder, resolvedOrder, primaryTabValue } = useWorkspaceTabOrder(workspaceKey);
  const { activeTab, setActiveTab, prevActiveTab, setPrevActiveTab } = useWorkspaceTabState({
    location,
    workspaceBasePath,
    invalidWorkspaceRoute,
    invalidWorkspaceId,
    resolvedOrder,
  });

  // Display options
  const { showHeaderKpis, tagDisplayMode, visibleTabs } = useWorkspaceDisplayOptions(workspaceKey);
  const { computedRowHeight } = useWorkspaceRowDensity();

  // Refs
  const rowCache = useRef(new Map<string, { rows: any[]; rowCount: number }>());
  const tableRef = useRef<WorkspaceTableHandle | null>(null);

  // Zustand UI state
  const { searchText, groupBy, collapseGroups } = useWorkspaceUIStore();
  
  // Auth state
  const { user: currentUser } = useAuth();
  const currentUserId = Number(currentUser?.id);

  // Dexie data for filters
  const priorities = useTable('priorities');
  const statuses = useTable('statuses');
  const spots = useTable('spots');
  const users = useTable('users');
  const tags = useTable('tags');

  // Derived status groupings for stats
  const doneStatusId = (statuses || []).find((s: any) => String((s as any).action || '').toUpperCase() === 'FINISHED')?.id
    ?? (statuses || []).find((s: any) => String((s as any).action || '').toUpperCase() === 'DONE')?.id
    ?? (statuses || []).find((s: any) => String((s as any).name || '').toLowerCase().includes('done'))?.id;
  const workingStatusIds: number[] = (statuses || [])
    .filter((s: any) => String((s as any).action || '').toUpperCase() === 'WORKING')
    .map((s: any) => Number((s as any).id))
    .filter((n: number) => Number.isFinite(n));

  // Stats
  const stats = useWorkspaceStats({
    workspaceId: id,
    isAllWorkspaces,
    doneStatusId,
    workingStatusIds,
  });

  // KPI Cards
  const {
    headerKpiCards,
    setHeaderKpiCards,
    headerCards,
    canReorderHeaderKpis
  } = useWorkspaceKpiCards({
    workspaceIdNum,
    currentUserId,
    doneStatusId,
    workingStatusIds,
    stats,
  });

  // Track selected KPI card for filtering
  const [selectedKpiCardId, setSelectedKpiCardId] = useState<number | null>(null);

  // Task actions
  const {
    selectedIds,
    setSelectedIds,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDeleteSelected
  } = useWorkspaceTaskActions();

  // Right panel
  const { rightPanel, setRightPanel, rightPanelWidth, isResizing, toggleRightPanel, startResize } = useWorkspaceRightPanel();

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { handleTableReady } = useWorkspaceFilters({
    workspaceKey,
    currentUser,
    filtersOpen,
    tableRef,
  });

  // Task dialog
  const { openCreateTask, setOpenCreateTask, openEditTask, setOpenEditTask, selectedTask, handleOpenTaskDialog } = useWorkspaceTaskDialog();

  // Task completion toast notifications
  useTaskCompletionToast();

  // Drag and drop
  const { activeKpiId, handleDragStart, handleDragEnd, handleKpiDragStart, handleKpiDragEnd } = useWorkspaceDragDrop({
    customTabOrder,
    setCustomTabOrder,
    headerKpiCards,
    setHeaderKpiCards,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const kpiSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Zustand UI actions
  const { setFilterModel, setSearchText, setGroupBy, setCollapseGroups } = useWorkspaceUIStore();

  // Load groupBy and collapseGroups from localStorage when workspace changes
  useEffect(() => {
    if (!id && !isAllWorkspaces) return;
    const workspaceId = id || 'all';
    try {
      const groupKey = `wh_workspace_group_by_${workspaceId}`;
      const collapseKey = `wh_workspace_group_collapse_${workspaceId}`;
      const savedGroup = localStorage.getItem(groupKey) as any;
      const savedCollapse = localStorage.getItem(collapseKey);
      if (savedGroup) {
        setGroupBy(savedGroup);
      }
      if (savedCollapse !== null) {
        setCollapseGroups(savedCollapse === 'true');
      }
    } catch {}
  }, [id, isAllWorkspaces, setGroupBy, setCollapseGroups]);

  // Listen for filter dialog open events
  useEffect(() => {
    const handleFilterDialogOpen = () => {
      setFiltersOpen(true);
    };
    window.addEventListener('workspace-filter-dialog-open', handleFilterDialogOpen as EventListener);
    return () => {
      window.removeEventListener('workspace-filter-dialog-open', handleFilterDialogOpen as EventListener);
    };
  }, []);

  // Clear cache when workspace ID changes
  useEffect(() => {
    if (id) {
      rowCache.current.clear();
    }
  }, [id, location.pathname]);

  // Save search text to localStorage when it changes
  useEffect(() => {
    const key = `wh_workspace_search_global`;
    try {
      if (searchText) {
        localStorage.setItem(key, searchText);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }, [searchText]);

  // Filter tabs based on visibility preferences
  const visibleTabSet = useMemo(() => new Set(visibleTabs), [visibleTabs]);
  const filteredOrder = useMemo(() => resolvedOrder.filter(key => 
    ALWAYS_VISIBLE_TABS.includes(key) || visibleTabSet.has(key)
  ), [resolvedOrder, visibleTabSet]);
  
  // Create dynamic animation config
  const dynamicTabAnimation = useMemo<TabAnimationConfig<WorkspaceTabKey>>(() => ({
    order: filteredOrder,
    distance: TAB_ANIMATION.distance,
    transition: TAB_ANIMATION.transition,
  }), [filteredOrder]);
  
  const getDynamicTabInitialX = useMemo(() => {
    return (prev: WorkspaceTabKey | string | null | undefined, next: WorkspaceTabKey | string): string | number => {
      const prevStr = prev ? String(prev) : null;
      const nextStr = String(next);
      return getTabInitialX(prevStr, nextStr, dynamicTabAnimation);
    };
  }, [dynamicTabAnimation]);

  // Create tabs
  const workspaceTabs = createWorkspaceTabs({
    workspaceId: id,
    isAllWorkspaces,
    rowCache,
    tableRef,
    searchText,
    groupBy,
    collapseGroups,
    tagDisplayMode,
    computedRowHeight,
    activeTab,
    prevActiveTab,
    dynamicTabAnimation,
    getDynamicTabInitialX,
    onFiltersChanged: (active) => {
      setShowClearFilters(active);
      const model = tableRef.current?.getFilterModel?.();
      setFilterModel(model || null);
    },
    onSelectionChanged: setSelectedIds,
    onOpenTaskDialog: handleOpenTaskDialog,
    onReady: handleTableReady,
    onFilterModelChange: (model) => setFilterModel(model),
  });

  const workspaceTabMap = workspaceTabs.reduce<Record<string, typeof workspaceTabs[number]>>((acc, tab) => {
    acc[tab.value] = tab;
    return acc;
  }, {});
  
  const orderedVisibleTabs = filteredOrder
    .map((key) => workspaceTabMap[key])
    .filter((tab): tab is typeof workspaceTabs[number] => Boolean(tab));
  const tabsForRender = orderedVisibleTabs.length > 0 ? orderedVisibleTabs : workspaceTabs.filter(tab => {
    const tabValue = tab.value as WorkspaceTabKey;
    return ALWAYS_VISIBLE_TABS.includes(tabValue) || visibleTabSet.has(tabValue);
  });

  const [showClearFilters, setShowClearFilters] = useState(false);

  // Handle KPI card click to apply filters
  const handleKpiCardClick = (cardId: number) => {
    const card = headerCards.find((c: any) => c.id === cardId);
    if (!card || !card.filterModel) {
      // If no filter model, clear selection and filters
      setSelectedKpiCardId(null);
      tableRef.current?.setFilterModel?.(null);
      setFilterModel(null);
      try {
        localStorage.removeItem(`wh_workspace_filters_${id || 'all'}`);
      } catch {}
      return;
    }

    // Toggle: if already selected, deselect and clear filters
    if (selectedKpiCardId === cardId) {
      setSelectedKpiCardId(null);
      tableRef.current?.setFilterModel?.(null);
      setFilterModel(null);
      try {
        localStorage.removeItem(`wh_workspace_filters_${id || 'all'}`);
      } catch {}
    } else {
      // Apply filter from card
      setSelectedKpiCardId(cardId);
      tableRef.current?.setFilterModel?.(card.filterModel);
      setFilterModel(card.filterModel);
      try {
        localStorage.setItem(`wh_workspace_filters_${id || 'all'}`, JSON.stringify({ filterModel: card.filterModel, cardId: cardId }));
      } catch {}
      setSearchText('');
    }
  };

  // Clear KPI selection when filters are cleared externally
  useEffect(() => {
    const handleClearFilters = () => {
      setSelectedKpiCardId(null);
    };
    window.addEventListener('workspace-filter-clear', handleClearFilters as EventListener);
    return () => {
      window.removeEventListener('workspace-filter-clear', handleClearFilters as EventListener);
    };
  }, []);

  // Sync selected KPI card when filters are loaded from localStorage
  useEffect(() => {
    if (!id && !isAllWorkspaces) return;
    const workspaceId = id || 'all';
    try {
      const key = `wh_workspace_filters_${workspaceId}`;
      const saved = localStorage.getItem(key);
      if (saved && headerCards.length > 0) {
        const parsed = JSON.parse(saved);
        // Support both new format { filterModel, cardId } and legacy format (plain filterModel)
        const filterModel = parsed?.filterModel !== undefined ? parsed.filterModel : parsed;
        const savedCardId = parsed?.cardId;
        
        // First try to match by saved card ID
        if (savedCardId != null) {
          const exactCard = headerCards.find((card: any) => card.id === savedCardId);
          if (exactCard) {
            setSelectedKpiCardId(exactCard.id);
            return;
          }
        }
        // Fallback: match by filter model
        const matchingCard = headerCards.find((card: any) => {
          if (!card.filterModel) return false;
          return JSON.stringify(card.filterModel) === JSON.stringify(filterModel);
        });
        if (matchingCard) {
          setSelectedKpiCardId(matchingCard.id);
        }
      }
    } catch {}
  }, [id, isAllWorkspaces, headerCards]);

  if (invalidWorkspaceRoute) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Invalid Workspace ID</h2>
          <p className="text-gray-600 mt-2">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  if (invalidWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Invalid Workspace ID</h2>
          <p className="text-gray-600 mt-2">ID: "{id}" must be a number or "all" - Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {showHeaderKpis && (
        <div className="flex-shrink-0 flex items-start gap-3 -mt-1 mb-3">
          <div className="flex-1 min-w-0">
            <DndContext
              sensors={kpiSensors}
              collisionDetection={closestCenter}
              onDragStart={handleKpiDragStart}
              onDragEnd={handleKpiDragEnd}
              onDragCancel={() => {
                // Handled in hook
              }}
            >
              {canReorderHeaderKpis ? (
                <>
                  <SortableContext items={headerCards.map((c: any) => c.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-stretch">
                      {headerCards.map((card: any) => (
                        <SortableKpiCard
                          key={card.id}
                          id={card.id}
                          card={card}
                          isSelected={selectedKpiCardId === card.id}
                          onClick={() => handleKpiCardClick(card.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay zIndex={10000}>
                    {activeKpiId != null ? (() => {
                      const card = headerCards.find((c: any) => c.id === activeKpiId);
                      if (!card) return null;
                      return (
                        <div className="opacity-90 scale-105">
                          <WorkspaceKpiCard
                            label={card.label}
                            value={card.value}
                            icon={card.icon}
                            accent={card.accent}
                            helperText={card.helperText}
                            right={card.sparkline}
                          />
                        </div>
                      );
                    })() : null}
                  </DragOverlay>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-stretch">
                  {headerCards.map((card: any) => (
                    <WorkspaceKpiCard
                      key={card.id}
                      label={card.label}
                      value={card.value}
                      icon={card.icon}
                      accent={card.accent}
                      helperText={card.helperText}
                      right={card.sparkline}
                      isSelected={selectedKpiCardId === card.id}
                      onClick={() => handleKpiCardClick(card.id)}
                    />
                  ))}
                </div>
              )}
            </DndContext>
          </div>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-2 border rounded px-2 py-1 bg-background/60">
          <span className="text-sm text-muted-foreground">Selected: {selectedIds.length}</span>
          <Button variant="ghost" size="sm" title="Mark complete" aria-label="Mark complete" disabled>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
          </Button>
          <Button variant="ghost" size="sm" title="Reassign" aria-label="Reassign" disabled>
            <UserRound className="h-4 w-4 mr-1" /> Reassign
          </Button>
          <Button variant="ghost" size="sm" title="Change priority" aria-label="Change priority" disabled>
            <Flag className="h-4 w-4 mr-1" /> Priority
          </Button>
          <Button variant="ghost" size="sm" title="Reschedule" aria-label="Reschedule" disabled>
            <CalendarDays className="h-4 w-4 mr-1" /> Reschedule
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Delete selected tasks" 
            aria-label="Delete selected tasks"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <div className="ml-auto" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              tableRef.current?.clearSelection?.();
              setSelectedIds([]);
            }}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 ${isResizing ? 'select-none' : ''}`}>
        {/* Main content area - hidden when whiteboard is active */}
        {rightPanel !== 'whiteboard' && (
          <div className='flex-1 min-w-0 h-full'>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredOrder} strategy={rectSortingStrategy}>
                <UrlTabs
                  tabs={tabsForRender}
                  defaultValue={primaryTabValue}
                  basePath={`/workspace/${id}`}
                  pathMap={WORKSPACE_TAB_PATHS}
                  className="w-full h-full flex flex-col [&_[data-slot=tabs]]:gap-0 [&_[data-slot=tabs-content]]:mt-0 [&>div]:pt-0 [&_[data-slot=tabs-list]]:mb-0"
                  onValueChange={(v) => { 
                    if (Object.keys(WORKSPACE_TAB_PATHS).includes(v)) {
                      const tabValue = v as WorkspaceTabKey;
                      setPrevActiveTab(activeTab); 
                      setActiveTab(tabValue);
                    }
                  }}
                  showClearFilters={showClearFilters}
                  onClearFilters={() => {
                    tableRef.current?.clearFilters();
                    setSelectedKpiCardId(null);
                    window.dispatchEvent(new CustomEvent('workspace-filter-clear'));
                  }}
                  sortable={true}
                  sortableItems={filteredOrder.filter(key => !FIXED_TABS.includes(key))}
                  renderSortableTab={(tab, isFixed) => (
                    <SortableTab
                      key={tab.value}
                      id={tab.value}
                      disabled={isFixed}
                    >
                      <TabsTrigger
                        value={tab.value}
                        disabled={tab.disabled}
                      >
                        {tab.label}
                      </TabsTrigger>
                    </SortableTab>
                  )}
                  rightElement={
                    !rightPanel ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8 px-3 rounded-md font-medium text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label="Collaboration"
                        onClick={() => setRightPanel('chat')}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('workspace.collab.collab', 'Collab')}</span>
                      </Button>
                    ) : null
                  }
                />
              </SortableContext>
            </DndContext>
          </div>
        )}
        {/* Right panel for chat/resources, or full-width whiteboard */}
        {rightPanel && (
            <div 
              className={cn(
                "relative bg-background flex flex-col",
                rightPanel === 'whiteboard' ? "flex-1" : "border-l"
              )} 
              style={rightPanel === 'whiteboard' ? undefined : { width: rightPanelWidth, flex: '0 0 auto' }}
            >
              {/* Resize handle - only show for non-whiteboard panels */}
              {rightPanel !== 'whiteboard' && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-col-resize z-10 group"
                  onMouseDown={startResize}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-transparent group-hover:bg-primary/40 transition-colors" />
                </div>
              )}
              <div className="flex items-center justify-between px-2 py-1.5 border-b">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium rounded-md",
                      rightPanel === 'chat' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setRightPanel('chat')}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    {t('workspace.collab.chat', 'Chat')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium rounded-md",
                      rightPanel === 'resources' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setRightPanel('resources')}
                  >
                    <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                    {t('workspace.collab.resources', 'Resources')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium rounded-md",
                      rightPanel === 'whiteboard' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setRightPanel('whiteboard')}
                  >
                    <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
                    {t('workspace.collab.whiteboard', 'Board')}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label="Close panel" onClick={() => setRightPanel(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {rightPanel === 'chat' ? (
                  <ChatTab workspaceId={id} />
                ) : rightPanel === 'resources' ? (
                  <ResourcesTab workspaceId={id} />
                ) : (
                  <WhiteboardViewTab workspaceId={id} />
                )}
              </div>
            </div>
        )}
      </div>

      <FilterBuilderDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        workspaceId={isAllWorkspaces ? 'all' : (id || 'all')}
        statuses={(statuses || []).map((s: any) => ({ id: Number(s.id), name: s.name }))}
        priorities={(priorities || []).map((p: any) => ({ id: Number(p.id), name: p.name }))}
        spots={(spots || []).map((sp: any) => ({ id: Number(sp.id), name: sp.name }))}
        owners={(users || [])
          .map((u: any) => {
            const idNum = Number(u.id);
            if (!Number.isFinite(idNum)) return null;
            return { id: idNum, name: u.name || u.email || `User #${idNum}` };
          })
          .filter((o): o is { id: number; name: string } => Boolean(o))}
        tags={(tags || [])
          .filter((t: any) => {
            const idNum = Number(t.id);
            return Number.isFinite(idNum);
          })
          .map((t: any) => ({
            id: Number(t.id),
            name: t.name,
            color: t.color
          }))}
        currentModel={tableRef.current?.getFilterModel?.()}
        currentSearchText={searchText}
        onApply={(model) => {
          const filterModelValue = model || null;
          tableRef.current?.setFilterModel(filterModelValue);
          setFilterModel(filterModelValue);
          try { localStorage.setItem(`wh_workspace_filters_${id || 'all'}`, JSON.stringify(filterModelValue)); } catch {}
          setSearchText('');
          
          // Check if the applied filter matches any KPI card
          if (!filterModel) {
            setSelectedKpiCardId(null);
          } else {
            // Try to find a matching card
            const matchingCard = headerCards.find((card: any) => {
              if (!card.filterModel) return false;
              // Simple comparison - check if filter models match
              return JSON.stringify(card.filterModel) === JSON.stringify(filterModel);
            });
            if (matchingCard) {
              setSelectedKpiCardId(matchingCard.id);
            } else {
              setSelectedKpiCardId(null);
            }
          }
        }}
      />

      {/* Task Dialog - Unified component for create/edit */}
      {!isAllWorkspaces && !isNaN(Number(id)) && (
        <TaskDialog 
          open={openCreateTask} 
          onOpenChange={setOpenCreateTask} 
          mode="create" 
          workspaceId={parseInt(id!, 10)} 
        />
      )}
      {isAllWorkspaces && (
        <TaskDialog 
          open={openCreateTask} 
          onOpenChange={setOpenCreateTask} 
          mode="create-all" 
        />
      )}
      <TaskDialog 
        open={openEditTask} 
        onOpenChange={setOpenEditTask} 
        mode="edit" 
        task={selectedTask} 
      />
      <TaskNotesModal />
      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        taskName={selectedIds.length === 1 ? undefined : `${selectedIds.length} tasks`}
      />
    </div>
  );
};
