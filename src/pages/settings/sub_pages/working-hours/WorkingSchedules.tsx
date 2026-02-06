import { useMemo, useState, useEffect, useRef } from "react";
import { useTable, collections } from "@/store/dexie";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faPlus,
  faTrash,
  faStar,
  faCircleInfo,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UrlTabs } from "@/components/ui/url-tabs";
import { useLanguage } from "@/providers/LanguageProvider";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  WorkingSchedule,
  CountryConfig,
  HolidayCalendar,
  OvertimeRule,
  ScheduleConfig,
  FixedScheduleConfig,
  RotatingScheduleConfig,
  FlexibleScheduleConfig,
} from "./types";
import { FixedScheduleConfig as FixedConfigUI, RotatingScheduleConfig as RotatingConfigUI, FlexibleScheduleConfig as FlexibleConfigUI } from "./components";
import { getDefaultConfig, calculateWeeklyHours, formatHours } from "./scheduleUtils";

// Extend WorkingSchedule type to include optional position
interface WorkingScheduleWithPosition extends WorkingSchedule {
  position?: number;
}

// Schedule type options for display
const scheduleTypeOptionsMap = {
  fixed: 'Fixed',
  rotating: 'Rotating',
  flexible: 'Flexible'
};

// Sortable Schedule Card Component
function SortableScheduleCard({
  schedule,
  onEdit,
  scheduleTypeOptions,
  tt,
}: {
  schedule: WorkingScheduleWithPosition;
  onEdit: (schedule: WorkingSchedule) => void;
  scheduleTypeOptions: { value: string; label: string }[];
  tt: (key: string, fallback: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: schedule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isInactive = !schedule.is_active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <div
        onClick={() => onEdit(schedule)}
        className={`group relative border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 ${
          isInactive 
            ? 'bg-muted/50 border-border/40 opacity-60 hover:opacity-80' 
            : 'bg-card hover:bg-accent/50 border-border/60 hover:border-border'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={`flex-shrink-0 cursor-grab active:cursor-grabbing transition-colors ${
              isInactive ? 'text-muted-foreground/30' : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <FontAwesomeIcon icon={faGripVertical} className="text-lg" />
          </div>

          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
            isInactive 
              ? 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 shadow-gray-500/10' 
              : 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/20'
          }`}>
            <FontAwesomeIcon icon={faClock} className="text-white text-lg" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`font-semibold truncate ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
                {schedule.name}
              </h3>
              {schedule.is_default && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isInactive 
                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400' 
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                }`}>
                  <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                  Default
                </span>
              )}
            </div>
            {schedule.description && (
              <p className="text-sm text-muted-foreground truncate">{schedule.description}</p>
            )}
          </div>

          {/* Meta info */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="text-xs text-muted-foreground/70 uppercase tracking-wide">{tt('fields.type', 'Type')}</div>
              <div className={`font-medium ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
                {scheduleTypeOptions.find(o => o.value === schedule.schedule_type)?.label || schedule.schedule_type}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground/70 uppercase tracking-wide">{tt('fields.weeklyHours', 'Hours')}</div>
              <div className={`font-medium ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
                {schedule.weekly_hours}h
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            schedule.is_active 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
          }`}>
            {schedule.is_active ? tt('status.active', 'Active') : tt('status.inactive', 'Inactive')}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkingSchedules() {
  const { t } = useLanguage();
  const tt = (key: string, fallback: string) => t(`settings.workingSchedules.${key}`, fallback);

  // Dexie state
  const schedules = useTable('working_schedules') as WorkingSchedule[];
  const countryConfigs = useTable('country_configs') as CountryConfig[];
  const holidayCalendars = useTable('holiday_calendars') as HolidayCalendar[];
  const overtimeRules = useTable('overtime_rules') as OvertimeRule[];
  const loading = false; // Dexie loads synchronously from IndexedDB

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkingSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<WorkingSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const initialFormData = {
    name: '',
    description: '',
    schedule_type: 'fixed' as 'fixed' | 'rotating' | 'flexible',
    schedule_config: getDefaultConfig('fixed') as ScheduleConfig,
    country_config_id: null as number | null,
    holiday_calendar_id: null as number | null,
    overtime_rule_id: null as number | null,
    is_default: false,
    is_active: true
  };
  const [formData, setFormData] = useState(initialFormData);

  // Calculate weekly hours from config
  const calculatedWeeklyHours = useMemo(() => {
    return calculateWeeklyHours(formData.schedule_type, formData.schedule_config);
  }, [formData.schedule_type, formData.schedule_config]);

  // Data is loaded automatically via Dexie's live queries

  // Local order state for drag and drop
  const [orderedSchedules, setOrderedSchedules] = useState<WorkingScheduleWithPosition[]>([]);
  const orderedSchedulesRef = useRef<WorkingScheduleWithPosition[]>([]);

  // Sync ordered schedules when Redux schedules change
  useEffect(() => {
    const schedulesWithPosition = schedules.map((s, index) => ({
      ...s,
      position: (s as WorkingScheduleWithPosition).position ?? index,
    }));
    // Sort by position
    schedulesWithPosition.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    setOrderedSchedules(schedulesWithPosition);
  }, [schedules]);

  // Keep ref in sync
  useEffect(() => {
    orderedSchedulesRef.current = orderedSchedules;
  }, [orderedSchedules]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);
    const previousSchedules = orderedSchedulesRef.current;

    const oldIndex = previousSchedules.findIndex(s => s.id === activeId);
    const newIndex = previousSchedules.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(previousSchedules, oldIndex, newIndex).map((schedule, index) => ({
      ...schedule,
      position: index,
    }));

    // Update local state
    setOrderedSchedules(newOrder);
    toast.success(tt('messages.reordered', 'Schedule order updated'));
  };

  // Filtered schedules (from ordered schedules)
  const filteredSchedules = useMemo(() => {
    if (!searchQuery) return orderedSchedules;
    const query = searchQuery.toLowerCase();
    return orderedSchedules.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    );
  }, [orderedSchedules, searchQuery]);

  // Schedule IDs for sortable context
  const scheduleIds = useMemo(() => filteredSchedules.map(s => s.id), [filteredSchedules]);

  // Reset form
  const resetForm = () => {
    setFormData({
      ...initialFormData,
      schedule_config: getDefaultConfig('fixed'),
    });
  };

  // Handle schedule type change
  const handleScheduleTypeChange = (newType: 'fixed' | 'rotating' | 'flexible') => {
    setFormData({
      ...formData,
      schedule_type: newType,
      schedule_config: getDefaultConfig(newType),
    });
  };

  // Open edit dialog
  const openEditDialog = (schedule: WorkingSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      schedule_type: schedule.schedule_type,
      schedule_config: schedule.schedule_config || getDefaultConfig(schedule.schedule_type),
      country_config_id: schedule.country_config_id,
      holiday_calendar_id: schedule.holiday_calendar_id,
      overtime_rule_id: schedule.overtime_rule_id,
      is_default: schedule.is_default,
      is_active: schedule.is_active
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (schedule: WorkingSchedule) => {
    setDeletingSchedule(schedule);
    setIsDeleteDialogOpen(true);
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error(tt('validation.nameRequired', 'Name is required'));
      return;
    }
    setIsSubmitting(true);
    try {
      await collections.working_schedules.add(formData);
      toast.success(tt('messages.created', 'Schedule created successfully'));
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || tt('messages.createError', 'Failed to create schedule'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingSchedule || !formData.name.trim()) {
      toast.error(tt('validation.nameRequired', 'Name is required'));
      return;
    }
    setIsSubmitting(true);
    try {
      await collections.working_schedules.update(editingSchedule.id, formData);
      toast.success(tt('messages.updated', 'Schedule updated successfully'));
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || tt('messages.updateError', 'Failed to update schedule'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingSchedule) return;
    setIsSubmitting(true);
    try {
      await collections.working_schedules.delete(deletingSchedule.id);
      toast.success(tt('messages.deleted', 'Schedule deleted successfully'));
      setIsDeleteDialogOpen(false);
      setDeletingSchedule(null);
    } catch (error: any) {
      toast.error(error.message || tt('messages.deleteError', 'Failed to delete schedule'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule type options
  const scheduleTypeOptions = [
    { value: 'fixed', label: tt('types.fixed', 'Fixed') },
    { value: 'rotating', label: tt('types.rotating', 'Rotating') },
    { value: 'flexible', label: tt('types.flexible', 'Flexible') }
  ];

  // Stats
  const activeCount = orderedSchedules.filter(s => s.is_active).length;
  const defaultSchedule = orderedSchedules.find(s => s.is_default);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
            <FontAwesomeIcon icon={faClock} className="text-orange-500 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tt('title', 'Working Schedules')}</h1>
            <p className="text-muted-foreground">{tt('description', 'Define working hours schedules for your organization')}</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {tt('actions.create', 'Create Schedule')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tt('stats.total', 'Total Schedules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orderedSchedules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tt('stats.active', 'Active Schedules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tt('stats.default', 'Default Schedule')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">
              {defaultSchedule ? defaultSchedule.name : tt('stats.noDefault', 'Not set')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <UrlTabs
        defaultValue="schedules"
        tabs={[
          {
            value: 'schedules',
            label: tt('tabs.schedules', 'Schedules'),
            content: (
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-4">
                  <Input
                    placeholder={tt('search', 'Search schedules...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Schedules List */}
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {tt('loading', 'Loading schedules...')}
                  </div>
                ) : filteredSchedules.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FontAwesomeIcon icon={faClock} className="text-4xl text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {orderedSchedules.length === 0 
                          ? tt('empty.title', 'No schedules yet')
                          : tt('empty.noResults', 'No schedules match your search')}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {orderedSchedules.length === 0 
                          ? tt('empty.description', 'Create your first working schedule to get started')
                          : tt('empty.tryDifferent', 'Try a different search term')}
                      </p>
                      {orderedSchedules.length === 0 && (
                        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                          <FontAwesomeIcon icon={faPlus} className="mr-2" />
                          {tt('actions.create', 'Create Schedule')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {tt('dragToReorder', 'Drag schedules to reorder them')}
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={scheduleIds} strategy={verticalListSortingStrategy}>
                        <div className="grid gap-3">
                          {filteredSchedules.map((schedule) => (
                            <SortableScheduleCard
                              key={schedule.id}
                              schedule={schedule}
                              onEdit={openEditDialog}
                              scheduleTypeOptions={scheduleTypeOptions}
                              tt={tt}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )
          },
          {
            value: 'help',
            label: tt('tabs.help', 'Help'),
            content: (
              <div className="space-y-6">
                {/* Quick Start Guide */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-600/5 border border-blue-200/60 dark:border-blue-500/20 rounded-xl p-5 transition-all hover:shadow-md">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mb-3 shadow-sm shadow-blue-500/25">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Create a Schedule</h4>
                    <p className="text-sm text-muted-foreground">Define working hours, weekly limits, and schedule type for your team.</p>
                  </div>
                  <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-600/5 border border-purple-200/60 dark:border-purple-500/20 rounded-xl p-5 transition-all hover:shadow-md">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mb-3 shadow-sm shadow-purple-500/25">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Configure Settings</h4>
                    <p className="text-sm text-muted-foreground">Link country configs, holiday calendars, and overtime rules.</p>
                  </div>
                  <div className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-600/5 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl p-5 transition-all hover:shadow-md">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center mb-3 shadow-sm shadow-emerald-500/25">
                      <span className="text-white font-bold">3</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Assign to Users</h4>
                    <p className="text-sm text-muted-foreground">Apply schedules to team members for accurate time tracking.</p>
                  </div>
                </div>

                {/* Schedule Types */}
                <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60 bg-muted/30">
                    <h3 className="font-semibold text-foreground">Schedule Types</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Choose the right schedule type for different work arrangements</p>
                  </div>
                  <div className="divide-y divide-border/60">
                    <div className="p-5 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/20">
                        <FontAwesomeIcon icon={faClock} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Fixed Schedule</h4>
                        <p className="text-sm text-muted-foreground mb-2">Consistent hours every week. Best for traditional office roles with predictable schedules.</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Mon-Fri 9am-5pm</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">40 hours/week</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Office workers</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Rotating Schedule</h4>
                        <p className="text-sm text-muted-foreground mb-2">Hours change on a regular cycle. Ideal for shift-based operations and 24/7 coverage.</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Day/Night shifts</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Weekly rotation</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Healthcare, Manufacturing</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Flexible Schedule</h4>
                        <p className="text-sm text-muted-foreground mb-2">Variable hours within defined limits. Perfect for remote teams and results-oriented roles.</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Core hours only</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Self-managed</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Remote teams</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-card border border-border/60 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faStar} className="text-amber-500 text-sm" />
                      </div>
                      <h4 className="font-semibold text-foreground">Best Practices</h4>
                    </div>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>Set one schedule as <strong className="text-foreground">default</strong> for new team members</span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>Link schedules to <strong className="text-foreground">country configs</strong> for accurate holiday handling</span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>Configure <strong className="text-foreground">overtime rules</strong> to track and manage extra hours</span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>Review schedules quarterly to ensure they match actual work patterns</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-card border border-border/60 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faCircleInfo} className="text-blue-500 text-sm" />
                      </div>
                      <h4 className="font-semibold text-foreground">Did You Know?</h4>
                    </div>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>Schedules automatically integrate with <strong className="text-foreground">time-off requests</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>Holiday calendars can be <strong className="text-foreground">imported automatically</strong> for your country</span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>Overtime calculations respect <strong className="text-foreground">local labor laws</strong> when configured</span>
                      </li>
                      <li className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>Inactive schedules are preserved for <strong className="text-foreground">historical reporting</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          }
        ]}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tt('dialog.createTitle', 'Create Working Schedule')}</DialogTitle>
            <DialogDescription>{tt('dialog.createDescription', 'Define a new working schedule for your team')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tt('fields.name', 'Name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={tt('placeholders.name', 'e.g., Standard Full-Time')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tt('fields.scheduleType', 'Schedule Type')}</Label>
                <Select value={formData.schedule_type} onValueChange={(value: 'fixed' | 'rotating' | 'flexible') => handleScheduleTypeChange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{tt('fields.description', 'Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={tt('placeholders.description', 'Optional description...')}
                rows={2}
              />
            </div>

            {/* Schedule Configuration */}
            <div className="border-t border-border pt-4">
              {formData.schedule_type === 'fixed' && (
                <FixedConfigUI
                  config={formData.schedule_config as FixedScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
              {formData.schedule_type === 'rotating' && (
                <RotatingConfigUI
                  config={formData.schedule_config as RotatingScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
              {formData.schedule_type === 'flexible' && (
                <FlexibleConfigUI
                  config={formData.schedule_config as FlexibleScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
            </div>

            {/* Additional Settings (Collapsible) */}
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Additional Settings
              </summary>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{tt('fields.country', 'Country Config')}</Label>
                  <Select 
                    value={formData.country_config_id ? String(formData.country_config_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, country_config_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tt('placeholders.selectCountry', 'Select country...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {countryConfigs.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.country_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tt('fields.holidayCalendar', 'Holiday Calendar')}</Label>
                  <Select 
                    value={formData.holiday_calendar_id ? String(formData.holiday_calendar_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, holiday_calendar_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tt('placeholders.selectCalendar', 'Select calendar...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {holidayCalendars.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.calendar_year})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tt('fields.overtimeRule', 'Overtime Rule')}</Label>
                  <Select 
                    value={formData.overtime_rule_id ? String(formData.overtime_rule_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, overtime_rule_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tt('placeholders.selectOvertimeRule', 'Select overtime rule...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {overtimeRules.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </details>

            {/* Toggles */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="isDefault">{tt('fields.isDefault', 'Set as default')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="isActive">{tt('fields.isActive', 'Active')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{tt('actions.cancel', 'Cancel')}</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? tt('actions.creating', 'Creating...') : tt('actions.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tt('dialog.editTitle', 'Edit Working Schedule')}</DialogTitle>
            <DialogDescription>{tt('dialog.editDescription', 'Update schedule settings')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{tt('fields.name', 'Name')} *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tt('fields.scheduleType', 'Schedule Type')}</Label>
                <Select value={formData.schedule_type} onValueChange={(value: 'fixed' | 'rotating' | 'flexible') => handleScheduleTypeChange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{tt('fields.description', 'Description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Schedule Configuration */}
            <div className="border-t border-border pt-4">
              {formData.schedule_type === 'fixed' && (
                <FixedConfigUI
                  config={formData.schedule_config as FixedScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
              {formData.schedule_type === 'rotating' && (
                <RotatingConfigUI
                  config={formData.schedule_config as RotatingScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
              {formData.schedule_type === 'flexible' && (
                <FlexibleConfigUI
                  config={formData.schedule_config as FlexibleScheduleConfig}
                  onChange={(config) => setFormData({ ...formData, schedule_config: config })}
                />
              )}
            </div>

            {/* Additional Settings (Collapsible) */}
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Additional Settings
              </summary>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{tt('fields.country', 'Country Config')}</Label>
                  <Select 
                    value={formData.country_config_id ? String(formData.country_config_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, country_config_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {countryConfigs.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.country_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tt('fields.holidayCalendar', 'Holiday Calendar')}</Label>
                  <Select 
                    value={formData.holiday_calendar_id ? String(formData.holiday_calendar_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, holiday_calendar_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {holidayCalendars.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.calendar_year})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tt('fields.overtimeRule', 'Overtime Rule')}</Label>
                  <Select 
                    value={formData.overtime_rule_id ? String(formData.overtime_rule_id) : "none"} 
                    onValueChange={(value) => setFormData({ ...formData, overtime_rule_id: value === "none" ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('options.none', 'None')}</SelectItem>
                      {overtimeRules.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </details>

            {/* Toggles */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isDefault"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="edit-isDefault">{tt('fields.isDefault', 'Set as default')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-isActive">{tt('fields.isActive', 'Active')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="ghost" 
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => {
                setIsEditDialogOpen(false);
                if (editingSchedule) {
                  openDeleteDialog(editingSchedule);
                }
              }}
              disabled={isSubmitting}
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              {tt('actions.delete', 'Delete')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{tt('actions.cancel', 'Cancel')}</Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? tt('actions.saving', 'Saving...') : tt('actions.save', 'Save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt('dialog.deleteTitle', 'Delete Working Schedule')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt('dialog.deleteDescription', 'Are you sure you want to delete')} <strong>{deletingSchedule?.name}</strong>? {tt('dialog.deleteWarning', 'This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt('actions.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" disabled={isSubmitting}>
              {isSubmitting ? tt('actions.deleting', 'Deleting...') : tt('actions.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default WorkingSchedules;
