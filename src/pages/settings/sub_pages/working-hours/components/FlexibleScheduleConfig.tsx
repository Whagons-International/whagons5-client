import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { FlexibleScheduleConfig as FlexibleConfig, DayOfWeek } from '../types';
import {
  DAYS_OF_WEEK,
  DAY_SHORT_LABELS,
  calculateFlexibleWeeklyHours,
  formatHours,
} from '../scheduleUtils';

interface FlexibleScheduleConfigProps {
  config: FlexibleConfig;
  onChange: (config: FlexibleConfig) => void;
}

export function FlexibleScheduleConfig({ config, onChange }: FlexibleScheduleConfigProps) {
  const weeklyHours = calculateFlexibleWeeklyHours(config);

  const toggleWorkingDay = (day: DayOfWeek) => {
    const currentDays = config.workingDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    onChange({ ...config, workingDays: newDays });
  };

  const updateCoreHours = (updates: Partial<FlexibleConfig['coreHours']>) => {
    onChange({
      ...config,
      coreHours: { ...config.coreHours, ...updates },
    });
  };

  const updateFlexBand = (updates: Partial<FlexibleConfig['flexBand']>) => {
    onChange({
      ...config,
      flexBand: { ...config.flexBand, ...updates },
    });
  };

  const updateDailyHours = (updates: Partial<FlexibleConfig['dailyHours']>) => {
    onChange({
      ...config,
      dailyHours: { ...config.dailyHours, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with weekly hours */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Flexible Schedule Configuration</Label>
        <div className="text-sm text-muted-foreground">
          Target weekly: <span className="font-semibold text-foreground">{formatHours(weeklyHours)}</span>
        </div>
      </div>

      {/* Working Days */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Working Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = config.workingDays?.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleWorkingDay(day)}
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

      {/* Core Hours */}
      <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Core Hours</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mandatory presence time for all team members
            </p>
          </div>
          <Switch
            checked={config.coreHours?.enabled ?? false}
            onCheckedChange={(checked) => updateCoreHours({ enabled: checked })}
          />
        </div>

        {config.coreHours?.enabled && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={config.coreHours.start || '10:00'}
                onChange={(e) => updateCoreHours({ start: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="time"
                value={config.coreHours.end || '15:00'}
                onChange={(e) => updateCoreHours({ end: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Flex Band */}
      <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-lg">
        <div>
          <Label className="text-sm font-medium">Flex Band</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Earliest start and latest end times allowed
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Earliest Start</Label>
            <Input
              type="time"
              value={config.flexBand?.earliestStart || '07:00'}
              onChange={(e) => updateFlexBand({ earliestStart: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Latest End</Label>
            <Input
              type="time"
              value={config.flexBand?.latestEnd || '19:00'}
              onChange={(e) => updateFlexBand({ latestEnd: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Daily Hours */}
      <div className="space-y-4 p-4 bg-muted/30 border border-border rounded-lg">
        <div>
          <Label className="text-sm font-medium">Daily Hours</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Minimum, target, and maximum hours per day
          </p>
        </div>

        <div className="space-y-4">
          {/* Minimum */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Minimum</Label>
              <span className="text-sm font-medium">{config.dailyHours?.minimum ?? 6}h</span>
            </div>
            <Slider
              value={[config.dailyHours?.minimum ?? 6]}
              onValueChange={([value]) => updateDailyHours({ minimum: value })}
              min={0}
              max={12}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Target</Label>
              <span className="text-sm font-medium text-primary">{config.dailyHours?.target ?? 8}h</span>
            </div>
            <Slider
              value={[config.dailyHours?.target ?? 8]}
              onValueChange={([value]) => updateDailyHours({ target: value })}
              min={0}
              max={12}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Maximum */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Maximum</Label>
              <span className="text-sm font-medium">{config.dailyHours?.maximum ?? 10}h</span>
            </div>
            <Slider
              value={[config.dailyHours?.maximum ?? 10]}
              onValueChange={([value]) => updateDailyHours({ maximum: value })}
              min={0}
              max={14}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Validation message */}
        {(config.dailyHours?.minimum ?? 0) > (config.dailyHours?.target ?? 8) && (
          <p className="text-xs text-red-500">Minimum cannot be greater than target</p>
        )}
        {(config.dailyHours?.target ?? 8) > (config.dailyHours?.maximum ?? 10) && (
          <p className="text-xs text-red-500">Target cannot be greater than maximum</p>
        )}
      </div>
    </div>
  );
}

export default FlexibleScheduleConfig;
