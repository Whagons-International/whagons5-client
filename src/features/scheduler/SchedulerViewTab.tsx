import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTimeScale } from "./hooks/useTimeScale";
import { useSchedulerData } from "./hooks/useSchedulerData";
import { useResourceGrouping } from "./hooks/useResourceGrouping";
import TimeHeader from "./components/TimeHeader";
import TimelineCanvas from "./components/TimelineCanvas";
import ResourceList from "./components/ResourceList";
import TaskDialog from "@/pages/spaces/components/TaskDialog";
import SchedulerControls from "./components/SchedulerControls";
import UserSelector from "./components/UserSelector";
import { SchedulerErrorBoundary } from "./components/SchedulerErrorBoundary";
import { api } from "@/store/api/internalApi";
import { exportToPDF, exportToPNG, exportToExcel } from "./utils/exportUtils";
import { UndoRedoManager } from "./utils/undoRedo";
import { formatLocalDateTime, snapDateToInterval } from "./utils/dateTime";
import type { ViewPreset, SchedulerEvent } from "./types/scheduler";
import toast from "react-hot-toast";
import { Maximize2, Minimize2, Calendar, Clock } from "lucide-react";
import { TaskEvents } from "@/store/eventEmiters/taskEvents";

export default function SchedulerViewTab({ workspaceId }: { workspaceId: string | undefined }) {
  const dispatch = useDispatch<AppDispatch>();

  // ---- State with localStorage persistence ----
  const [viewPreset, setViewPreset] = useState<ViewPreset>(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_view_preset_${workspaceId || "all"}`);
      if (saved && ["hourAndDay", "dayAndWeek", "weekAndMonth", "monthAndYear"].includes(saved)) return saved as ViewPreset;
    } catch {}
    return "hourAndDay";
  });

  const [timeFormatMode, setTimeFormatMode] = useState<"24h" | "12h">(() => {
    try {
      const saved = localStorage.getItem("wh_scheduler_time_format");
      if (saved === "12h" || saved === "24h") return saved;
    } catch {}
    return "24h";
  });

  const [baseDate, setBaseDate] = useState(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_base_date_${workspaceId || "all"}`);
      if (saved && !saved.includes("T") && !saved.includes("Z")) {
        const [y, m, d] = saved.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt.getTime()) && Math.abs((Date.now() - dt.getTime()) / 86400000) <= 7) return dt;
      }
    } catch {}
    return new Date();
  });

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_selected_users_${workspaceId || "all"}`);
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.every((id) => typeof id === "number")) return p; }
    } catch {}
    return [];
  });

  const [groupBy, setGroupBy] = useState<"none" | "team" | "role">(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_group_by_${workspaceId || "all"}`);
      if (saved && ["none", "team", "role"].includes(saved)) return saved as "none" | "team" | "role";
    } catch {}
    return "team";
  });

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_filters_${workspaceId || "all"}`);
      if (saved) {
        const p = JSON.parse(saved);
        return { categories: Array.isArray(p.categories) ? p.categories : [], statuses: Array.isArray(p.statuses) ? p.statuses : [], priorities: Array.isArray(p.priorities) ? p.priorities : [], teams: Array.isArray(p.teams) ? p.teams : [] };
      }
    } catch {}
    return { categories: [] as number[], statuses: [] as number[], priorities: [] as number[], teams: [] as number[] };
  });

  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(new Set());
  const [editingEvent, setEditingEvent] = useState<SchedulerEvent | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<"create" | "edit">("create");
  const [initialTaskData, setInitialTaskData] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const undoRedoManagerRef = useRef(new UndoRedoManager());
  const schedulerContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeHeaderScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const resourceListScrollRef = useRef<HTMLDivElement>(null);
  const [undoRedoState, setUndoRedoState] = useState({ canUndo: false, canRedo: false });
  const pendingOptimisticUpdatesRef = useRef<Map<number, number>>(new Map());
  const rowHeight = 60;

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const timelineAreaRef = useRef<HTMLDivElement>(null);

  // ---- Data ----
  const allUsers = useSelector((state: RootState) => (state.users as any)?.value ?? []);
  const { resources, events, loading } = useSchedulerData(workspaceId);

  // ---- Persistence effects ----
  useEffect(() => { try { const k = `wh_scheduler_selected_users_${workspaceId || "all"}`; selectedUserIds.length > 0 ? localStorage.setItem(k, JSON.stringify(selectedUserIds)) : localStorage.removeItem(k); } catch {} }, [selectedUserIds, workspaceId]);
  useEffect(() => { try { localStorage.setItem(`wh_scheduler_view_preset_${workspaceId || "all"}`, viewPreset); } catch {} }, [viewPreset, workspaceId]);
  useEffect(() => { try { localStorage.setItem("wh_scheduler_time_format", timeFormatMode); } catch {} }, [timeFormatMode]);
  useEffect(() => { try { localStorage.setItem(`wh_scheduler_group_by_${workspaceId || "all"}`, groupBy); } catch {} }, [groupBy, workspaceId]);
  useEffect(() => { try { const d = baseDate; localStorage.setItem(`wh_scheduler_base_date_${workspaceId || "all"}`, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); } catch {} }, [baseDate, workspaceId]);
  useEffect(() => { try { const k = `wh_scheduler_filters_${workspaceId || "all"}`; const has = filters.categories.length || filters.statuses.length || filters.priorities.length || filters.teams.length; has ? localStorage.setItem(k, JSON.stringify(filters)) : localStorage.removeItem(k); } catch {} }, [filters, workspaceId]);

  // Restore selected users when workspace changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wh_scheduler_selected_users_${workspaceId || "all"}`);
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p)) setSelectedUserIds(p); }
      else setSelectedUserIds([]);
    } catch { setSelectedUserIds([]); }
  }, [workspaceId]);

  // Auto-select users who have tasks
  useEffect(() => {
    if (selectedUserIds.length === 0 && events.length > 0) {
      const usersWithTasks = [...new Set(events.map((e) => e.resourceId))];
      if (usersWithTasks.length > 0) setSelectedUserIds(usersWithTasks);
    }
  }, [events, selectedUserIds.length]);

  // ---- Task change listener ----
  useEffect(() => {
    const handleTaskChange = (data?: any) => {
      if (data?.id) {
        const taskId = typeof data.id === "string" ? parseInt(data.id) : data.id;
        const pending = pendingOptimisticUpdatesRef.current.get(taskId);
        if (pending && Date.now() - pending < 10000) return;
        pendingOptimisticUpdatesRef.current.delete(taskId);
      }
      dispatch(getTasksFromIndexedDB());
      if (data && Array.isArray(data.user_ids) && data.user_ids.length > 0) {
        setSelectedUserIds((prev) => {
          const s = new Set(prev);
          let added = false;
          data.user_ids.forEach((id: number) => { if (!s.has(id)) { s.add(id); added = true; } });
          return added ? Array.from(s) : prev;
        });
      }
    };
    const unsubs = [
      TaskEvents.on(TaskEvents.EVENTS.TASK_CREATED, handleTaskChange),
      TaskEvents.on(TaskEvents.EVENTS.TASK_UPDATED, handleTaskChange),
      TaskEvents.on(TaskEvents.EVENTS.TASK_DELETED, handleTaskChange),
      TaskEvents.on(TaskEvents.EVENTS.TASKS_BULK_UPDATE, handleTaskChange),
    ];
    return () => unsubs.forEach((u) => { try { u(); } catch {} });
  }, [dispatch]);

  // ---- Filtered / displayed resources ----
  const displayedResources = useMemo(() => {
    if (selectedUserIds.length === 0) return [];
    return resources
      .filter((r) => selectedUserIds.includes(r.id))
      .sort((a, b) => {
        if (a.teamName && b.teamName && a.teamName !== b.teamName) {
          return a.teamName.localeCompare(b.teamName);
        }
        return a.name.localeCompare(b.name);
      });
  }, [resources, selectedUserIds]);

  const { groupedResources } = useResourceGrouping(displayedResources, groupBy);

  // ---- Dimensions ----
  const savedScrollRef = useRef({ left: 0, top: 0 });
  useEffect(() => {
    // Save scroll position before re-measuring
    if (timelineScrollRef.current) {
      savedScrollRef.current = {
        left: timelineScrollRef.current.scrollLeft,
        top: timelineScrollRef.current.scrollTop,
      };
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width - 280, height: rect.height });
        // Restore scroll position after dimensions update
        requestAnimationFrame(() => {
          if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollLeft = savedScrollRef.current.left;
            timelineScrollRef.current.scrollTop = savedScrollRef.current.top;
          }
          if (timeHeaderScrollRef.current) {
            timeHeaderScrollRef.current.scrollLeft = savedScrollRef.current.left;
          }
        });
      }
    };
    const debounced = () => { if (timer) clearTimeout(timer); timer = setTimeout(update, 100); };
    // Reset dimensions immediately to prevent stale large values from overflowing
    setDimensions({ width: 0, height: 0 });
    // Then measure after layout settles
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    window.addEventListener("resize", debounced);
    return () => { cancelAnimationFrame(raf1); window.removeEventListener("resize", debounced); if (timer) clearTimeout(timer); };
  }, [isMaximized]);

  // ---- Timeline width ----
  const getTimelineWidth = useCallback((preset: ViewPreset, vw: number) => {
    switch (preset) {
      case "hourAndDay": return Math.max(24 * 100, vw);
      case "dayAndWeek": return Math.max(7 * 150, vw);
      case "weekAndMonth": return Math.max(5 * 200, vw);
      case "monthAndYear": return Math.max(12 * 150, vw);
      default: return vw;
    }
  }, []);

  const timelineWidth = useMemo(() => getTimelineWidth(viewPreset, dimensions.width), [viewPreset, dimensions.width, getTimelineWidth]);
  const { scale, startDate, endDate } = useTimeScale(viewPreset, timelineWidth, baseDate);

  // ---- Scroll sync ----
  const isScrollingRef = useRef(false);
  useEffect(() => {
    const tl = timelineScrollRef.current;
    const hd = timeHeaderScrollRef.current;
    const rl = resourceListScrollRef.current;
    if (!tl || !hd) return;
    // Compensate for timeline vertical scrollbar width
    const updateHeaderPadding = () => {
      const scrollbarWidth = tl.offsetWidth - tl.clientWidth;
      hd.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : "0";
    };
    updateHeaderPadding();
    const resizeObserver = new ResizeObserver(updateHeaderPadding);
    resizeObserver.observe(tl);

    const syncFromTimeline = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      hd.scrollLeft = tl.scrollLeft;
      if (rl) rl.scrollTop = tl.scrollTop;
      requestAnimationFrame(() => { isScrollingRef.current = false; });
    };
    const syncFromHeader = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      tl.scrollLeft = hd.scrollLeft;
      requestAnimationFrame(() => { isScrollingRef.current = false; });
    };
    const syncFromResource = () => {
      if (isScrollingRef.current || !rl) return;
      isScrollingRef.current = true;
      tl.scrollTop = rl.scrollTop;
      requestAnimationFrame(() => { isScrollingRef.current = false; });
    };
    tl.addEventListener("scroll", syncFromTimeline, { passive: true });
    hd.addEventListener("scroll", syncFromHeader, { passive: true });
    if (rl) rl.addEventListener("scroll", syncFromResource, { passive: true });
    return () => {
      resizeObserver.disconnect();
      tl.removeEventListener("scroll", syncFromTimeline);
      hd.removeEventListener("scroll", syncFromHeader);
      if (rl) rl.removeEventListener("scroll", syncFromResource);
    };
  }, [dimensions.width, timelineWidth]);

  // Auto-scroll to current time
  const hasScrolledRef = useRef(false);
  const lastPresetRef = useRef(viewPreset);
  const lastBaseDateRef = useRef(baseDate.getTime());
  useEffect(() => {
    if (!scale || !timelineScrollRef.current || !timeHeaderScrollRef.current) return;
    if (dimensions.width <= 0 || timelineWidth <= 0) return;
    const presetChange = lastPresetRef.current !== viewPreset;
    const dateChange = lastBaseDateRef.current !== baseDate.getTime();
    if (hasScrolledRef.current && !presetChange && !dateChange) return;
    lastPresetRef.current = viewPreset;
    lastBaseDateRef.current = baseDate.getTime();
    const now = new Date();
    if (now >= startDate && now <= endDate) {
      const x = scale(now);
      const pos = Math.max(0, x - dimensions.width / 4);
      requestAnimationFrame(() => {
        timelineScrollRef.current?.scrollTo({ left: pos });
        timeHeaderScrollRef.current?.scrollTo({ left: pos });
      });
    }
    hasScrolledRef.current = true;
  }, [scale, startDate, endDate, dimensions.width, timelineWidth, viewPreset, baseDate]);

  // ---- Filters ----
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filters.categories.length > 0 && ev.categoryId && !filters.categories.includes(ev.categoryId)) return false;
      if (filters.statuses.length > 0 && ev.statusId && !filters.statuses.includes(ev.statusId)) return false;
      if (filters.priorities.length > 0 && ev.priorityId && !filters.priorities.includes(ev.priorityId)) return false;
      if (filters.teams.length > 0) {
        const r = resources.find((r) => r.id === ev.resourceId);
        if (!r || !r.teamId || !filters.teams.includes(r.teamId)) return false;
      }
      return true;
    });
  }, [events, filters, resources]);

  // ---- Export ----
  const handleExportPDF = useCallback(async () => { if (schedulerContainerRef.current) await exportToPDF(schedulerContainerRef.current, `scheduler-${new Date().toISOString().split("T")[0]}.pdf`); }, []);
  const handleExportPNG = useCallback(async () => { if (schedulerContainerRef.current) await exportToPNG(schedulerContainerRef.current, `scheduler-${new Date().toISOString().split("T")[0]}.png`); }, []);
  const handleExportExcel = useCallback(async () => { await exportToExcel(filteredEvents, resources, `scheduler-${new Date().toISOString().split("T")[0]}.xlsx`); }, [filteredEvents, resources]);

  // ---- Undo / Redo ----
  const updateUndoRedoState = useCallback(() => {
    setUndoRedoState({ canUndo: undoRedoManagerRef.current.canUndo(), canRedo: undoRedoManagerRef.current.canRedo() });
  }, []);

  useEffect(() => { updateUndoRedoState(); }, [updateUndoRedoState]);

  const applyTaskUpdate = useCallback(async (taskId: number, startDate: Date, endDate: Date) => {
    const task = await TasksCache.getTask(taskId.toString());
    if (!task) return;
    pendingOptimisticUpdatesRef.current.set(taskId, Date.now());
    const updates = { start_date: formatLocalDateTime(startDate), due_date: formatLocalDateTime(endDate) };
    await TasksCache.updateTask(taskId.toString(), { ...task, ...updates });
    dispatch(updateTaskLocally({ id: taskId, updates }));
    return task;
  }, [dispatch]);

  const handleUndo = useCallback(async () => {
    const action = undoRedoManagerRef.current.undo();
    if (!action) return;
    await applyTaskUpdate(action.taskId, action.previousState.startDate, action.previousState.endDate);
    updateUndoRedoState();
    try {
      await api.patch(`/tasks/${action.taskId}`, { start_date: formatLocalDateTime(action.previousState.startDate), due_date: formatLocalDateTime(action.previousState.endDate) });
      toast.success("Undo successful");
    } catch {
      await applyTaskUpdate(action.taskId, action.newState.startDate, action.newState.endDate);
      undoRedoManagerRef.current.redo();
      updateUndoRedoState();
      toast.error("Failed to undo action");
    }
  }, [applyTaskUpdate, updateUndoRedoState]);

  const handleRedo = useCallback(async () => {
    const action = undoRedoManagerRef.current.redo();
    if (!action) return;
    await applyTaskUpdate(action.taskId, action.newState.startDate, action.newState.endDate);
    updateUndoRedoState();
    try {
      await api.patch(`/tasks/${action.taskId}`, { start_date: formatLocalDateTime(action.newState.startDate), due_date: formatLocalDateTime(action.newState.endDate) });
      toast.success("Redo successful");
    } catch {
      await applyTaskUpdate(action.taskId, action.previousState.startDate, action.previousState.endDate);
      undoRedoManagerRef.current.undo();
      updateUndoRedoState();
      toast.error("Failed to redo action");
    }
  }, [applyTaskUpdate, updateUndoRedoState]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMaximized) { e.preventDefault(); setIsMaximized(false); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); if (undoRedoState.canUndo) handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); if (undoRedoState.canRedo) handleRedo(); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [handleUndo, handleRedo, undoRedoState, isMaximized]);

  // ---- Navigation ----
  const handlePrev = () => {
    const d = new Date(baseDate);
    if (viewPreset === "hourAndDay") d.setDate(d.getDate() - 1);
    else if (viewPreset === "dayAndWeek") d.setDate(d.getDate() - 7);
    else if (viewPreset === "weekAndMonth") d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    setBaseDate(d);
  };
  const handleNext = () => {
    const d = new Date(baseDate);
    if (viewPreset === "hourAndDay") d.setDate(d.getDate() + 1);
    else if (viewPreset === "dayAndWeek") d.setDate(d.getDate() + 7);
    else if (viewPreset === "weekAndMonth") d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    setBaseDate(d);
  };
  const handleToday = () => setBaseDate(new Date());

  const scrollToCurrentTime = useCallback(() => {
    if (!scale || !timelineScrollRef.current || !timeHeaderScrollRef.current) return;
    const now = new Date();
    if (now >= startDate && now <= endDate) {
      const pos = Math.max(0, scale(now) - dimensions.width / 4);
      timelineScrollRef.current.scrollTo({ left: pos, behavior: "smooth" });
      timeHeaderScrollRef.current.scrollTo({ left: pos, behavior: "smooth" });
    } else {
      setBaseDate(new Date());
      toast.success("Jumped to current time");
    }
  }, [scale, startDate, endDate, dimensions.width]);

  const getDateDisplay = () => {
    if (viewPreset === "hourAndDay") return baseDate.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (viewPreset === "dayAndWeek") {
      const ws = new Date(baseDate);
      const dow = ws.getDay();
      ws.setDate(ws.getDate() - dow + (dow === 0 ? -6 : 1));
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${we.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (viewPreset === "weekAndMonth") return baseDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return baseDate.getFullYear().toString();
  };

  // ---- Event handlers for timeline ----
  const handleEventMove = useCallback((event: SchedulerEvent, newStartDate: Date, newEndDate: Date, newResourceIndex: number) => {
    // Optimistic update: move the event instantly in Redux
    const targetResource = displayedResources[newResourceIndex];
    const userChanged = targetResource && targetResource.id !== event.resourceId;

    const updates: any = { start_date: formatLocalDateTime(newStartDate), due_date: formatLocalDateTime(newEndDate) };
    if (userChanged) {
      // Get current user_ids from Redux (synchronous, no IndexedDB wait)
      const reduxTasks = ((store.getState().tasks as any)?.value ?? []) as any[];
      const reduxTask = reduxTasks.find((t: any) => t.id === event.taskId);
      const currentUserIds: number[] = reduxTask?.user_ids || [];
      const newUserIds = currentUserIds.filter((id: number) => id !== event.resourceId);
      newUserIds.push(targetResource.id);
      updates.user_ids = [...new Set(newUserIds)];
    }

    pendingOptimisticUpdatesRef.current.set(event.taskId, Date.now());
    dispatch(updateTaskLocally({ id: event.taskId, updates }));

    // Optimistically update taskUsers Redux so the event moves rows instantly
    let oldPivotRow: any = null;
    if (userChanged) {
      const taskUsersState = (store.getState().taskUsers as any)?.value ?? [];
      oldPivotRow = taskUsersState.find((tu: any) => Number(tu.task_id) === event.taskId && Number(tu.user_id) === event.resourceId);
      if (oldPivotRow) {
        dispatch(genericActions.taskUsers.removeItem(oldPivotRow.id));
      }
      // Add temporary pivot row so the event appears on the new user's row
      const tempPivotId = -(event.taskId * 100000 + targetResource.id);
      dispatch(genericActions.taskUsers.addItem({ id: tempPivotId, task_id: event.taskId, user_id: targetResource.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any));
    }

    const previousStartDate = event.startDate;
    const previousEndDate = event.endDate;

    undoRedoManagerRef.current.push({
      type: "move",
      eventId: event.id,
      taskId: event.taskId,
      previousState: { startDate: previousStartDate, endDate: previousEndDate },
      newState: { startDate: newStartDate, endDate: newEndDate },
    });
    updateUndoRedoState();

    // Fire API call in background — don't block the UI
    (async () => {
      // Update IndexedDB in background (non-blocking for UI)
      const task = await TasksCache.getTask(event.taskId.toString());
      if (task) {
        await TasksCache.updateTask(event.taskId.toString(), { ...task, ...updates });
      }

      try {
        const resp = await api.patch(`/tasks/${event.taskId}`, updates);
        const payload = resp.data?.data ?? resp.data;
        // Update local task cache with server's authoritative user_ids
        if (payload?.user_ids) {
          const latestTask = await TasksCache.getTask(event.taskId.toString());
          if (latestTask) {
            await TasksCache.updateTask(event.taskId.toString(), { ...latestTask, user_ids: payload.user_ids });
            dispatch(updateTaskLocally({ id: event.taskId, updates: { user_ids: payload.user_ids } }));
          }
        }
        // Sync taskUsers pivot in IndexedDB from the response
        if (payload?.pivot_changes) {
          await applyTaskUserPivotChanges(event.taskId, payload.pivot_changes);
        }
        setTimeout(() => pendingOptimisticUpdatesRef.current.delete(event.taskId), 2000);
      } catch (error) {
        console.error("Failed to update task:", error);
        pendingOptimisticUpdatesRef.current.delete(event.taskId);
        // Revert optimistic update
        if (task) {
          await TasksCache.updateTask(event.taskId.toString(), task);
        }
        dispatch(updateTaskLocally({ id: event.taskId, updates: { start_date: formatLocalDateTime(previousStartDate), due_date: formatLocalDateTime(previousEndDate), ...(userChanged ? { user_ids: task?.user_ids } : {}) } }));
        // Revert taskUsers Redux: remove temp row, restore old row
        if (userChanged) {
          const tempPivotId = -(event.taskId * 100000 + targetResource.id);
          dispatch(genericActions.taskUsers.removeItem(tempPivotId));
          if (oldPivotRow) {
            dispatch(genericActions.taskUsers.addItem(oldPivotRow));
          }
        }
        undoRedoManagerRef.current.undo();
        updateUndoRedoState();
        toast.error("Failed to move task. Changes reverted.");
      }
    })();
  }, [dispatch, displayedResources, updateUndoRedoState]);

  const handleEventResize = useCallback((event: SchedulerEvent, newStartDate: Date, newEndDate: Date) => {
    const previousStartDate = event.startDate;
    const previousEndDate = event.endDate;

    pendingOptimisticUpdatesRef.current.set(event.taskId, Date.now());

    const updates = { start_date: formatLocalDateTime(newStartDate), due_date: formatLocalDateTime(newEndDate) };
    dispatch(updateTaskLocally({ id: event.taskId, updates }));

    undoRedoManagerRef.current.push({
      type: "resize",
      eventId: event.id,
      taskId: event.taskId,
      previousState: { startDate: previousStartDate, endDate: previousEndDate },
      newState: { startDate: newStartDate, endDate: newEndDate },
    });
    updateUndoRedoState();

    // Fire API call in background
    (async () => {
      const task = await TasksCache.getTask(event.taskId.toString());
      if (task) {
        await TasksCache.updateTask(event.taskId.toString(), { ...task, ...updates });
      }

      try {
        await api.patch(`/tasks/${event.taskId}`, updates);
        setTimeout(() => pendingOptimisticUpdatesRef.current.delete(event.taskId), 2000);
      } catch (error) {
        console.error("Failed to resize task:", error);
        pendingOptimisticUpdatesRef.current.delete(event.taskId);
        if (task) {
          await TasksCache.updateTask(event.taskId.toString(), task);
        }
        dispatch(updateTaskLocally({ id: event.taskId, updates: { start_date: formatLocalDateTime(previousStartDate), due_date: formatLocalDateTime(previousEndDate) } }));
        undoRedoManagerRef.current.undo();
        updateUndoRedoState();
        toast.error("Failed to resize task. Changes reverted.");
      }
    })();
  }, [dispatch, updateUndoRedoState]);

  const handleEventDoubleClick = useCallback((event: SchedulerEvent) => {
    // Use Redux as source of truth for task data (IndexedDB may be stale)
    const reduxTasks = ((store.getState().tasks as any)?.value ?? []) as any[];
    const reduxTask = reduxTasks.find((t: any) => t.id === event.taskId);
    if (reduxTask) {
      // Enrich user_ids from taskUsers pivot (authoritative)
      const taskUsersState = (store.getState().taskUsers as any)?.value ?? [];
      const pivotUserIds = taskUsersState
        .filter((tu: any) => Number(tu.task_id) === event.taskId)
        .map((tu: any) => Number(tu.user_id));
      const enrichedTask = { ...reduxTask, user_ids: pivotUserIds.length > 0 ? [...new Set(pivotUserIds)] : reduxTask.user_ids || [] };
      setEditingEvent(event);
      setInitialTaskData(enrichedTask);
      setTaskDialogMode("edit");
      setIsTaskDialogOpen(true);
    } else {
      // Fallback to IndexedDB
      TasksCache.getTask(event.taskId.toString()).then((task) => {
        if (task) {
          setEditingEvent(event);
          setInitialTaskData(task);
          setTaskDialogMode("edit");
          setIsTaskDialogOpen(true);
        }
      });
    }
  }, []);

  const handleEmptySpaceClick = useCallback((date: Date, resourceIndex: number, colIndex: number) => {
    const resourcesToUse = displayedResources.length > 0 ? displayedResources : resources;
    if (resourcesToUse.length === 0) { toast.error("Please select at least one user to create a task"); return; }
    if (resourceIndex < 0 || resourceIndex >= resourcesToUse.length) return;
    const resource = resourcesToUse[resourceIndex];
    if (!selectedUserIds.includes(resource.id)) setSelectedUserIds((prev) => [...prev, resource.id]);

    const start = snapDateToInterval(date, 15 * 60 * 1000);
    const end = new Date(start.getTime() + 3600000);
    setInitialTaskData({
      start_date: formatLocalDateTime(start),
      due_date: formatLocalDateTime(end),
      user_ids: [resource.id],
      workspace_id: workspaceId ? parseInt(workspaceId) : undefined,
    });
    setSelectedCell({ row: resourceIndex, col: colIndex });
    setEditingEvent(null);
    setTaskDialogMode("create");
    setIsTaskDialogOpen(true);
  }, [displayedResources, resources, selectedUserIds, workspaceId]);

  const handleUserToggle = useCallback((userId: number) => {
    setSelectedUserIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }, []);
  const handleClearAllUsers = useCallback(() => setSelectedUserIds([]), []);

  return (
    <>
      <div className={`scheduler-container ${isMaximized ? "fixed inset-0 z-[100] bg-background p-4" : "h-full w-full"} flex flex-col gap-2 min-h-0 min-w-0 overflow-hidden`}>
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 shadow-sm border-border/40 bg-background/95">
          <CardContent className="flex-1 min-h-0 min-w-0 flex flex-col pt-3 pb-2 overflow-hidden px-3">
            {/* Toolbar */}
            <div className="scheduler-toolbar flex items-center justify-between gap-2 mb-3 flex-wrap px-1 py-1 rounded-xl bg-muted/20 border border-border/30 w-full max-w-full flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                {/* Navigation */}
                <div className="inline-flex rounded-lg border border-border/40 bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
                  <Button size="sm" variant="ghost" onClick={handlePrev} className="h-8 px-3.5 rounded-md hover:bg-muted/60 text-xs font-medium">Prev</Button>
                  <Button size="sm" variant="ghost" onClick={handleToday} className="h-8 px-3.5 rounded-md hover:bg-muted/60 text-xs font-medium">Today</Button>
                  <Button size="sm" variant="ghost" onClick={handleNext} className="h-8 px-3.5 rounded-md hover:bg-muted/60 text-xs font-medium">Next</Button>
                </div>

                {/* Date picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 px-3.5 shadow-sm border-border/40 text-xs font-medium bg-background/80">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground">{getDateDisplay()}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4 shadow-xl rounded-xl border-border/40" align="start">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">Select Date</label>
                      <input
                        type="date"
                        value={`${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`}
                        onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); const dt = new Date(y, m - 1, d); if (!isNaN(dt.getTime())) setBaseDate(dt); }}
                        className="w-full px-3 py-2 text-sm border border-border/40 rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        autoFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                <Button size="sm" variant="outline" onClick={scrollToCurrentTime} title="Scroll to current time" className="h-8 gap-1.5 px-3 shadow-sm border-border/40 text-xs font-medium bg-background/80 group">
                  <Clock className="h-3.5 w-3.5 text-destructive group-hover:animate-pulse" />
                  <span>Now</span>
                </Button>

                <Button size="sm" variant="outline" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Exit full screen" : "Full screen"} className="h-8 w-8 p-0 shadow-sm border-border/40 bg-background/80">
                  {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>

                <div className="h-6 w-px bg-border/40" />

                <UserSelector availableUsers={allUsers} selectedUserIds={selectedUserIds} onUserToggle={handleUserToggle} onClearAll={handleClearAllUsers} />

                <div className="h-6 w-px bg-border/40" />

                {/* View preset toggle */}
                <div className="inline-flex rounded-lg border border-border/40 bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
                  {(["hourAndDay", "dayAndWeek", "weekAndMonth"] as const).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={viewPreset === p ? "default" : "ghost"}
                      onClick={() => setViewPreset(p)}
                      className={`h-8 px-4 rounded-md text-xs font-medium transition-all ${viewPreset === p ? "shadow-sm" : "hover:bg-muted/60"}`}
                    >
                      {p === "hourAndDay" ? "Day" : p === "dayAndWeek" ? "Week" : "Month"}
                    </Button>
                  ))}
                </div>

                {/* Time format toggle */}
                <div className="inline-flex rounded-lg border border-border/40 bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
                  <Button
                    size="sm"
                    variant={timeFormatMode === "24h" ? "default" : "ghost"}
                    onClick={() => setTimeFormatMode("24h")}
                    className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${timeFormatMode === "24h" ? "shadow-sm" : "hover:bg-muted/60"}`}
                  >
                    24h
                  </Button>
                  <Button
                    size="sm"
                    variant={timeFormatMode === "12h" ? "default" : "ghost"}
                    onClick={() => setTimeFormatMode("12h")}
                    className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${timeFormatMode === "12h" ? "shadow-sm" : "hover:bg-muted/60"}`}
                  >
                    AM/PM
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <SchedulerControls
                  onExportPDF={handleExportPDF}
                  onExportPNG={handleExportPNG}
                  onExportExcel={handleExportExcel}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoRedoState.canUndo}
                  canRedo={undoRedoState.canRedo}
                  onFilterChange={setFilters}
                  filters={filters}
                  availableCategories={useSelector((state: any) => (state.categories as any)?.value ?? [])}
                  availableStatuses={useSelector((state: any) => (state.statuses as any)?.value ?? [])}
                  availablePriorities={useSelector((state: any) => (state.priorities as any)?.value ?? [])}
                  availableTeams={useSelector((state: any) => (state.teams as any)?.value ?? [])}
                />
              </div>
            </div>

            {/* Scheduler content */}
            <div ref={containerRef} className="flex-1 min-h-0 min-w-0 flex flex-row overflow-hidden rounded-xl border border-border/30 bg-background shadow-sm">
              <div ref={schedulerContainerRef} className="flex-1 min-h-0 min-w-0 flex flex-row overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center p-4"><div className="text-sm text-muted-foreground">Loading resources...</div></div>
                ) : selectedUserIds.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm text-muted-foreground mb-2">No users selected</p>
                      <p className="text-xs text-muted-foreground">Click the &quot;Users&quot; button above to select users to display in the scheduler</p>
                    </div>
                  </div>
                ) : (
                  <ResourceList ref={resourceListScrollRef} resources={displayedResources} rowHeight={rowHeight} selectedResourceIds={selectedResourceIds} onResourceSelect={(id) => { const s = new Set(selectedResourceIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedResourceIds(s); }} />
                )}

                {/* Timeline area */}
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  {dimensions.width > 0 && dimensions.height > 0 && (
                    <SchedulerErrorBoundary>
                      {/* Time header */}
                      <div ref={timeHeaderScrollRef} className="border-b overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ width: dimensions.width, maxWidth: dimensions.width }}>
                        <TimeHeader scale={scale} height={40} preset={viewPreset} startDate={startDate} endDate={endDate} timeFormat={timeFormatMode} />
                      </div>

                      {/* Timeline canvas — overflow-x scrolls horizontally, stretches to fill vertically */}
                      <div ref={timelineScrollRef} className="flex-1 overflow-x-auto overflow-y-auto" style={{ width: dimensions.width, maxWidth: dimensions.width }}>
                        <TimelineCanvas
                          scale={scale}
                          width={timelineWidth}
                          height={Math.max(displayedResources.length * rowHeight, dimensions.height - 40)}
                          preset={viewPreset}
                          startDate={startDate}
                          endDate={endDate}
                          resources={displayedResources}
                          events={filteredEvents}
                          rowHeight={rowHeight}
                          selectedCell={selectedCell}
                          onEventDoubleClick={handleEventDoubleClick}
                          onEventMove={handleEventMove}
                          onEventResize={handleEventResize}
                          onEmptySpaceClick={handleEmptySpaceClick}
                        />
                      </div>
                    </SchedulerErrorBoundary>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Render outside fullscreen container so the Sheet portal isn't covered by z-[100] */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDialogOpen(open);
          if (!open) { setEditingEvent(null); setInitialTaskData(null); setSelectedCell(null); }
        }}
        mode={taskDialogMode}
        workspaceId={workspaceId ? parseInt(workspaceId) : undefined}
        task={taskDialogMode === "edit" && editingEvent ? initialTaskData : taskDialogMode === "create" ? initialTaskData : null}
      />
    </>
  );
}
