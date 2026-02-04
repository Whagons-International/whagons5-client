// Working Hours Plugin Types

export interface CountryConfig {
  id: number;
  country_code: string;
  country_name: string;
  default_weekly_hours: number;
  max_daily_hours: number;
  min_break_after_hours: number;
  min_break_duration_minutes: number;
  overtime_threshold_daily: number | null;
  overtime_threshold_weekly: number | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRule {
  id: number;
  name: string;
  description: string | null;
  country_config_id: number | null;
  daily_threshold_hours: number | null;
  weekly_threshold_hours: number | null;
  require_approval: boolean;
  max_overtime_daily: number | null;
  max_overtime_weekly: number | null;
  is_active: boolean;
  multipliers?: OvertimeMultiplier[];
  created_at: string;
  updated_at: string;
}

export interface OvertimeMultiplier {
  id: number;
  overtime_rule_id: number;
  multiplier_type: 'weekday' | 'weekend' | 'holiday' | 'night' | 'double_time';
  threshold_hours: number;
  multiplier: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HolidayCalendar {
  id: number;
  name: string;
  country_config_id: number | null;
  region_code: string | null;
  calendar_year: number;
  source: 'manual' | 'imported';
  last_synced_at: string | null;
  is_active: boolean;
  holidays?: Holiday[];
  holidays_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: number;
  holiday_calendar_id: number;
  name: string;
  description: string | null;
  date: string;
  holiday_type: 'public' | 'regional' | 'organizational' | 'optional';
  is_half_day: boolean;
  is_recurring: boolean;
  affects_overtime: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingSchedule {
  id: number;
  name: string;
  description: string | null;
  schedule_type: 'fixed' | 'rotating' | 'flexible';
  schedule_config: FixedScheduleConfig | RotatingScheduleConfig | FlexibleScheduleConfig | null;
  weekly_hours: number;
  country_config_id: number | null;
  holiday_calendar_id: number | null;
  overtime_rule_id: number | null;
  is_default: boolean;
  is_active: boolean;
  created_by: number | null;
  days?: WorkingScheduleDay[];
  created_at: string;
  updated_at: string;
}

// Schedule Configuration Types
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayConfig {
  enabled: boolean;
  start: string; // HH:MM format
  end: string;   // HH:MM format
  is_overnight?: boolean;
}

export interface FixedScheduleConfig {
  days: Record<DayOfWeek, DayConfig | null>;
}

export interface Shift {
  id: string;
  name: string;
  color: string;
  start: string;       // HH:MM format
  end: string;         // HH:MM format
  is_overnight?: boolean;
  days: DayOfWeek[];
}

export interface RotationPattern {
  shiftId: string;
  weeks: number;
}

export interface RotatingScheduleConfig {
  shifts: Shift[];
  rotation: {
    pattern: RotationPattern[];
  };
}

export interface FlexibleScheduleConfig {
  coreHours: {
    enabled: boolean;
    start: string;  // HH:MM format
    end: string;    // HH:MM format
  };
  flexBand: {
    earliestStart: string;  // HH:MM format
    latestEnd: string;      // HH:MM format
  };
  dailyHours: {
    minimum: number;
    target: number;
    maximum: number;
  };
  workingDays: DayOfWeek[];
}

export type ScheduleConfig = FixedScheduleConfig | RotatingScheduleConfig | FlexibleScheduleConfig;

export interface WorkingScheduleDay {
  id: number;
  working_schedule_id: number;
  day_of_week: number;
  day_name?: string;
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
  is_overnight: boolean;
  expected_hours: number | null;
  breaks?: WorkingScheduleBreak[];
  created_at: string;
  updated_at: string;
}

export interface WorkingScheduleBreak {
  id: number;
  working_schedule_day_id: number;
  break_type: 'lunch' | 'short' | 'other';
  start_time: string | null;
  duration_minutes: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAssignment {
  id: number;
  working_schedule_id: number;
  assignable_type: 'user' | 'team' | 'job_position';
  assignable_id: number;
  assignable_name?: string;
  priority: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_by: number | null;
  working_schedule?: WorkingSchedule;
  created_at: string;
  updated_at: string;
}

export interface TimeOffType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  requires_approval: boolean;
  approval_id: number | null;
  max_days_per_year: number | null;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeOffRequest {
  id: number;
  user_id: number;
  time_off_type_id: number;
  start_date: string;
  end_date: string;
  start_half_day: boolean;
  end_half_day: boolean;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  time_off_type?: TimeOffType;
  created_at: string;
  updated_at: string;
}

export interface TimeOffBalance {
  type_id: number;
  type_name: string;
  type_code: string;
  year: number;
  max_days: number;
  used_days: number;
  remaining_days: number;
  has_limit: boolean;
}
