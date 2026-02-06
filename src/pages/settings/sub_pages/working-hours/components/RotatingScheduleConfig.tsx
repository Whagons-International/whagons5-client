import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotatingScheduleConfig as RotatingConfig, Shift, DayOfWeek } from '../types';
import {
  DAYS_OF_WEEK,
  DAY_SHORT_LABELS,
  calculateRotatingWeeklyHours,
  formatHours,
  generateShiftId,
  SHIFT_COLORS,
} from '../scheduleUtils';

interface RotatingScheduleConfigProps {
  config: RotatingConfig;
  onChange: (config: RotatingConfig) => void;
}

export function RotatingScheduleConfig({ config, onChange }: RotatingScheduleConfigProps) {
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<Shift>>({});

  // Ensure config.shifts and config.rotation exist to prevent crashes
  const shifts = config?.shifts ?? [];
  const rotation = config?.rotation ?? { pattern: [] };

  const weeklyHours = calculateRotatingWeeklyHours(config);
  const cycleLength = rotation.pattern?.reduce((sum, p) => sum + p.weeks, 0) || 0;

  const openAddShiftDialog = () => {
    const usedColors = shifts.map(s => s.color);
    const availableColor = SHIFT_COLORS.find(c => !usedColors.includes(c)) || SHIFT_COLORS[0];
    
    setEditingShift(null);
    setShiftForm({
      name: '',
      color: availableColor,
      start: '09:00',
      end: '17:00',
      is_overnight: false,
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    });
    setIsShiftDialogOpen(true);
  };

  const openEditShiftDialog = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({ ...shift });
    setIsShiftDialogOpen(true);
  };

  const handleSaveShift = () => {
    if (!shiftForm.name || !shiftForm.start || !shiftForm.end) return;

    const newShift: Shift = {
      id: editingShift?.id || generateShiftId(),
      name: shiftForm.name!,
      color: shiftForm.color || SHIFT_COLORS[0],
      start: shiftForm.start!,
      end: shiftForm.end!,
      is_overnight: shiftForm.is_overnight || false,
      days: shiftForm.days || [],
    };

    let newShifts: Shift[];
    let newPattern = [...(rotation.pattern || [])];

    if (editingShift) {
      newShifts = shifts.map(s => s.id === editingShift.id ? newShift : s);
    } else {
      newShifts = [...config.shifts, newShift];
      // Add new shift to rotation pattern with 1 week default
      newPattern.push({ shiftId: newShift.id, weeks: 1 });
    }

    onChange({
      ...config,
      shifts: newShifts,
      rotation: { pattern: newPattern },
    });
    setIsShiftDialogOpen(false);
  };

  const handleDeleteShift = (shiftId: string) => {
    const newShifts = shifts.filter(s => s.id !== shiftId);
    const newPattern = rotation.pattern?.filter(p => p.shiftId !== shiftId) || [];
    
    onChange({
      ...config,
      shifts: newShifts,
      rotation: { pattern: newPattern },
    });
  };

  const handlePatternWeeksChange = (shiftId: string, weeks: number) => {
    const newPattern = rotation.pattern?.map(p =>
      p.shiftId === shiftId ? { ...p, weeks: Math.max(1, weeks) } : p
    ) || [];

    onChange({
      ...config,
      rotation: { pattern: newPattern },
    });
  };

  const toggleShiftDay = (day: DayOfWeek) => {
    const currentDays = shiftForm.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setShiftForm({ ...shiftForm, days: newDays });
  };

  return (
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Shift Definitions</Label>
        <div className="text-sm text-muted-foreground">
          Avg weekly: <span className="font-semibold text-foreground">{formatHours(weeklyHours)}</span>
          {cycleLength > 0 && (
            <span className="ml-2">| Cycle: {cycleLength} weeks</span>
          )}
        </div>
      </div>

      {/* Shifts list */}
      <div className="space-y-2">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            onClick={() => openEditShiftDialog(shift)}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: shift.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{shift.name}</div>
              <div className="text-xs text-muted-foreground">
                {shift.start} - {shift.end}
                {shift.is_overnight && ' (overnight)'}
                {' | '}
                {shift.days.map(d => DAY_SHORT_LABELS[d]).join(', ')}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteShift(shift.id);
              }}
            >
              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={openAddShiftDialog}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-3 w-3" />
          Add Shift
        </Button>
      </div>

      {/* Rotation Pattern */}
      {shifts.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Rotation Pattern</Label>
          <div className="space-y-2">
            {rotation.pattern?.map((item, index) => {
              const shift = shifts.find(s => s.id === item.shiftId);
              if (!shift) return null;

              return (
                <div
                  key={`${item.shiftId}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg"
                >
                  <FontAwesomeIcon icon={faGripVertical} className="text-muted-foreground/50 h-3 w-3" />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: shift.color }}
                  />
                  <span className="flex-1 text-sm font-medium">{shift.name}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={item.weeks}
                      onChange={(e) => handlePatternWeeksChange(item.shiftId, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground">weeks</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            The rotation repeats every {cycleLength} weeks
          </p>
        </div>
      )}

      {/* Add/Edit Shift Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
            <DialogDescription>
              Define the shift times and working days
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name and Color */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label>Shift Name</Label>
                <Input
                  value={shiftForm.name || ''}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="e.g., Day Shift"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-1">
                  {SHIFT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setShiftForm({ ...shiftForm, color })}
                      className={`w-7 h-7 rounded-md transition-all ${
                        shiftForm.color === color
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={shiftForm.start || '09:00'}
                  onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={shiftForm.end || '17:00'}
                  onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                />
              </div>
            </div>

            {/* Overnight toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Overnight Shift</Label>
                <p className="text-xs text-muted-foreground">Shift crosses midnight</p>
              </div>
              <Switch
                checked={shiftForm.is_overnight || false}
                onCheckedChange={(checked) => setShiftForm({ ...shiftForm, is_overnight: checked })}
              />
            </div>

            {/* Working Days */}
            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = shiftForm.days?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleShiftDay(day)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-accent'
                      }`}
                    >
                      {DAY_SHORT_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShiftDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveShift} disabled={!shiftForm.name}>
              {editingShift ? 'Save Changes' : 'Add Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RotatingScheduleConfig;
