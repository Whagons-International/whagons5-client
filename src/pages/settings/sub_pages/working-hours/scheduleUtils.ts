import {
  DayOfWeek,
  DayConfig,
  FixedScheduleConfig,
  RotatingScheduleConfig,
  FlexibleScheduleConfig,
  ScheduleConfig,
  Shift,
} from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration in minutes between start and end times
 * Handles overnight shifts
 */
export function calculateDayMinutes(start: string, end: string, isOvernight = false): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (isOvernight || endMinutes <= startMinutes) {
    // Shift crosses midnight
    return (1440 - startMinutes) + endMinutes;
  }

  return endMinutes - startMinutes;
}

/**
 * Calculate weekly hours for a fixed schedule
 */
export function calculateFixedWeeklyHours(config: FixedScheduleConfig): number {
  let totalMinutes = 0;

  for (const day of DAYS_OF_WEEK) {
    const dayConfig = config.days[day];
    if (dayConfig && dayConfig.enabled && dayConfig.start && dayConfig.end) {
      totalMinutes += calculateDayMinutes(
        dayConfig.start,
        dayConfig.end,
        dayConfig.is_overnight
      );
    }
  }

  return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Calculate average weekly hours for a rotating schedule
 */
export function calculateRotatingWeeklyHours(config: RotatingScheduleConfig): number {
  if (!config.shifts?.length || !config.rotation?.pattern?.length) {
    return 40;
  }

  let totalWeeklyHours = 0;
  let totalWeeks = 0;

  for (const patternItem of config.rotation.pattern) {
    const shift = config.shifts.find(s => s.id === patternItem.shiftId);
    if (!shift) continue;

    const weeks = patternItem.weeks;
    const daysPerWeek = shift.days.length;
    const hoursPerDay = calculateDayMinutes(
      shift.start,
      shift.end,
      shift.is_overnight
    ) / 60;

    const weeklyHoursForShift = hoursPerDay * daysPerWeek;
    totalWeeklyHours += weeklyHoursForShift * weeks;
    totalWeeks += weeks;
  }

  return totalWeeks > 0 ? Math.round((totalWeeklyHours / totalWeeks) * 100) / 100 : 40;
}

/**
 * Calculate weekly hours for a flexible schedule
 */
export function calculateFlexibleWeeklyHours(config: FlexibleScheduleConfig): number {
  const targetHours = config.dailyHours?.target ?? 8;
  const workingDays = config.workingDays ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return Math.round(targetHours * workingDays.length * 100) / 100;
}

/**
 * Calculate weekly hours based on schedule type and config
 */
export function calculateWeeklyHours(
  type: 'fixed' | 'rotating' | 'flexible',
  config: ScheduleConfig | null
): number {
  if (!config) return 40;

  switch (type) {
    case 'fixed':
      return calculateFixedWeeklyHours(config as FixedScheduleConfig);
    case 'rotating':
      return calculateRotatingWeeklyHours(config as RotatingScheduleConfig);
    case 'flexible':
      return calculateFlexibleWeeklyHours(config as FlexibleScheduleConfig);
    default:
      return 40;
  }
}

/**
 * Get default configuration for a schedule type
 */
export function getDefaultConfig(type: 'fixed' | 'rotating' | 'flexible'): ScheduleConfig {
  switch (type) {
    case 'fixed':
      return getDefaultFixedConfig();
    case 'rotating':
      return getDefaultRotatingConfig();
    case 'flexible':
      return getDefaultFlexibleConfig();
  }
}

export function getDefaultFixedConfig(): FixedScheduleConfig {
  return {
    days: {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' },
    },
  };
}

export function getDefaultRotatingConfig(): RotatingScheduleConfig {
  return {
    shifts: [
      {
        id: 'day',
        name: 'Day Shift',
        color: '#f59e0b',
        start: '06:00',
        end: '14:00',
        is_overnight: false,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
      {
        id: 'night',
        name: 'Night Shift',
        color: '#3b82f6',
        start: '22:00',
        end: '06:00',
        is_overnight: true,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    ],
    rotation: {
      pattern: [
        { shiftId: 'day', weeks: 2 },
        { shiftId: 'night', weeks: 2 },
      ],
    },
  };
}

export function getDefaultFlexibleConfig(): FlexibleScheduleConfig {
  return {
    coreHours: {
      enabled: true,
      start: '10:00',
      end: '15:00',
    },
    flexBand: {
      earliestStart: '07:00',
      latestEnd: '19:00',
    },
    dailyHours: {
      minimum: 6,
      target: 8,
      maximum: 10,
    },
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
}

/**
 * Format hours for display (e.g., "40h" or "37.5h")
 */
export function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
}

/**
 * Generate a unique ID for shifts
 */
export function generateShiftId(): string {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Predefined shift colors
 */
export const SHIFT_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
];
