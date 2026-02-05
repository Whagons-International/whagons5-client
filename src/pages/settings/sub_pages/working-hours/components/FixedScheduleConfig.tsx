import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FixedScheduleConfig as FixedConfig, DayOfWeek } from '../types';
import { DAYS_OF_WEEK, DAY_LABELS, calculateFixedWeeklyHours, formatHours } from '../scheduleUtils';

interface FixedScheduleConfigProps {
  config: FixedConfig;
  onChange: (config: FixedConfig) => void;
}

export function FixedScheduleConfig({ config, onChange }: FixedScheduleConfigProps) {
  const weeklyHours = calculateFixedWeeklyHours(config);

  const handleDayToggle = (day: DayOfWeek, enabled: boolean) => {
    onChange({
      ...config,
      days: {
        ...config.days,
        [day]: {
          ...config.days[day],
          enabled,
          start: config.days[day]?.start || '09:00',
          end: config.days[day]?.end || '17:00',
        },
      },
    });
  };

  const handleTimeChange = (day: DayOfWeek, field: 'start' | 'end', value: string) => {
    onChange({
      ...config,
      days: {
        ...config.days,
        [day]: {
          ...config.days[day]!,
          [field]: value,
        },
      },
    });
  };

  const handleOvernightToggle = (day: DayOfWeek, isOvernight: boolean) => {
    onChange({
      ...config,
      days: {
        ...config.days,
        [day]: {
          ...config.days[day]!,
          is_overnight: isOvernight,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Working Days</Label>
        <div className="text-sm text-muted-foreground">
          Weekly: <span className="font-semibold text-foreground">{formatHours(weeklyHours)}</span>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_70px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          <div>Day</div>
          <div className="text-center">Start</div>
          <div className="text-center">End</div>
          <div className="text-center">Overnight</div>
        </div>

        {/* Days */}
        {DAYS_OF_WEEK.map((day) => {
          const dayConfig = config.days[day];
          const isEnabled = dayConfig?.enabled ?? false;

          return (
            <div
              key={day}
              className={`grid grid-cols-[1fr_80px_80px_70px] gap-2 px-3 py-2.5 items-center border-b border-border last:border-b-0 transition-colors ${
                isEnabled ? 'bg-card' : 'bg-muted/30'
              }`}
            >
              {/* Day name with toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleDayToggle(day, checked)}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className={`text-sm ${isEnabled ? 'font-medium' : 'text-muted-foreground'}`}>
                  {DAY_LABELS[day]}
                </span>
              </div>

              {/* Start time */}
              <Input
                type="time"
                value={dayConfig?.start || '09:00'}
                onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                disabled={!isEnabled}
                className="h-8 text-center text-sm px-1"
              />

              {/* End time */}
              <Input
                type="time"
                value={dayConfig?.end || '17:00'}
                onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                disabled={!isEnabled}
                className="h-8 text-center text-sm px-1"
              />

              {/* Overnight toggle */}
              <div className="flex justify-center">
                <Switch
                  checked={dayConfig?.is_overnight ?? false}
                  onCheckedChange={(checked) => handleOvernightToggle(day, checked)}
                  disabled={!isEnabled}
                  className="data-[state=checked]:bg-blue-500 scale-75"
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Enable "Overnight" for shifts that cross midnight (e.g., 22:00 to 06:00)
      </p>
    </div>
  );
}

export default FixedScheduleConfig;
