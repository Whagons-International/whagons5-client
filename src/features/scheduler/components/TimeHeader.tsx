import { useMemo, useState, useEffect } from "react";
import { timeHour, timeDay, timeWeek, timeMonth, timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { ScaleTime } from "d3-scale";
import type { ViewPreset } from "../types/scheduler";


export type TimeFormatMode = "24h" | "12h";

interface TimeHeaderProps {
  scale: ScaleTime<number, number>;
  height: number;
  preset: ViewPreset;
  startDate: Date;
  endDate: Date;
  timeFormat?: TimeFormatMode;
}

const formatHour24 = timeFormat("%H:%M");
const formatHour12 = timeFormat("%-I %p");
const formatDay = timeFormat("%a %d");
const formatDayNum = timeFormat("%d");
const formatDayShort = timeFormat("%a");
const formatWeek = timeFormat("%b %d");
const formatMonth = timeFormat("%B %Y");
const formatMonthShort = timeFormat("%b");
const formatYear = timeFormat("%Y");

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getTicks(preset: ViewPreset, startDate: Date, endDate: Date) {
  let majorInterval: any;
  let minorInterval: any;

  switch (preset) {
    case "hourAndDay":
      majorInterval = timeDay.every(1);
      minorInterval = timeHour.every(1);
      break;
    case "dayAndWeek":
      majorInterval = timeWeek.every(1);
      minorInterval = timeDay.every(1);
      break;
    case "weekAndMonth":
      majorInterval = timeMonth.every(1);
      minorInterval = timeWeek.every(1);
      break;
    case "monthAndYear":
      majorInterval = timeYear.every(1);
      minorInterval = timeMonth.every(1);
      break;
  }

  return {
    major: majorInterval.range(startDate, endDate) as Date[],
    minor: minorInterval ? (minorInterval.range(startDate, endDate) as Date[]) : [],
  };
}

function buildRanges(ticks: Date[], endDate: Date) {
  return ticks.map((tick, index) => ({
    start: tick,
    end: ticks[index + 1] ?? endDate,
  }));
}

function formatMajorTick(start: Date, end: Date, preset: ViewPreset): string {
  switch (preset) {
    case "hourAndDay":
      return formatDay(start);
    case "dayAndWeek": {
      const endDisplay = new Date(end.getTime() - 1);
      return `${formatWeek(start)} - ${formatWeek(endDisplay)}`;
    }
    case "weekAndMonth":
      return formatMonth(start);
    case "monthAndYear":
      return formatYear(start);
    default:
      return formatDay(start);
  }
}

function formatMinorTick(date: Date, preset: ViewPreset, fmt: TimeFormatMode = "24h"): string {
  switch (preset) {
    case "hourAndDay":
      return fmt === "12h" ? formatHour12(date) : formatHour24(date);
    case "dayAndWeek":
      return `${formatDayShort(date)} ${formatDayNum(date)}`;
    case "weekAndMonth":
      return formatWeek(date);
    case "monthAndYear":
      return formatMonthShort(date);
    default:
      return formatDayShort(date);
  }
}

export default function TimeHeader({
  scale,
  height,
  preset,
  startDate,
  endDate,
  timeFormat: timeFmt = "24h",
}: TimeHeaderProps) {
  const { majorRanges, minorRanges } = useMemo(() => {
    const tickData = getTicks(preset, startDate, endDate);
    return {
      majorRanges: buildRanges(tickData.major, endDate),
      minorRanges: buildRanges(tickData.minor, endDate),
    };
  }, [preset, startDate, endDate]);

  const width = scale.range()[1];
  const separatorY = Math.round(height * 0.5);

  return (
    <div
      className="scheduler-time-header relative select-none"
      style={{
        height,
        width,
        minWidth: width,
      }}
    >
      <div className="absolute inset-0">
        {/* Major tier (top half) */}
        <div className="absolute left-0 right-0 top-0" style={{ height: separatorY }}>
          {majorRanges.map((range, i) => {
            const x1 = scale(range.start);
            const x2 = scale(range.end);
            const cellWidth = x2 - x1;
            if (cellWidth < 50) return null;

            return (
              <div
                key={`major-${i}`}
                className="absolute top-0 flex items-center justify-center"
                style={{
                  left: x1,
                  width: cellWidth,
                  height: separatorY,
                  borderRight: "1px solid var(--scheduler-grid-line-major)",
                }}
              >
                <span className="text-[11px] font-semibold text-foreground/80 tracking-wide whitespace-nowrap">
                  {formatMajorTick(range.start, range.end, preset)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Separator line */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: separatorY,
            height: 1,
            background: "var(--scheduler-grid-line)",
          }}
        />

        {/* Minor tier (bottom half) */}
        <div
          className="absolute left-0 right-0"
          style={{ top: separatorY, height: height - separatorY }}
        >
          {minorRanges.map((range, i) => {
            const x1 = scale(range.start);
            const x2 = scale(range.end);
            const cellWidth = x2 - x1;
            if (cellWidth < 24) return null;

            const isTodayCell = isToday(range.start);
            const isWeekendCell = isWeekend(range.start);

            return (
              <div
                key={`minor-${i}`}
                className="absolute top-0 flex items-center justify-center"
                style={{
                  left: x1,
                  width: cellWidth,
                  height: height - separatorY,
                  borderRight: "1px solid var(--scheduler-grid-line)",
                  background: isTodayCell
                    ? "rgba(59, 130, 246, 0.08)"
                    : undefined,
                }}
              >
                <span
                  className={`text-[10px] whitespace-nowrap ${
                    isTodayCell
                      ? "font-bold text-primary"
                      : isWeekendCell
                        ? "font-medium text-foreground/45"
                        : "font-medium text-foreground/65"
                  }`}
                >
                  {formatMinorTick(range.start, preset, timeFmt)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Today accent bar at bottom */}
        {(preset === "hourAndDay" || preset === "dayAndWeek") &&
          minorRanges.map((range, i) => {
            if (!isToday(range.start)) return null;
            const x1 = scale(range.start);
            const x2 = scale(range.end);
            return (
              <div
                key={`today-accent-${i}`}
                className="absolute rounded-full bg-primary/70"
                style={{
                  left: x1 + 2,
                  bottom: 0,
                  width: x2 - x1 - 4,
                  height: 3,
                }}
              />
            );
          })}
      </div>

      {/* Current time marker */}
      <CurrentTimeMarker scale={scale} startDate={startDate} endDate={endDate} height={height} timeFormat={timeFmt} />

      {/* Bottom border */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ height: 1, background: "var(--scheduler-grid-line-major)" }}
      />
    </div>
  );
}

function CurrentTimeMarker({ scale, startDate, endDate, height, timeFormat: fmt = "24h" }: { scale: TimeHeaderProps["scale"]; startDate: Date; endDate: Date; height: number; timeFormat?: TimeFormatMode }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const inRange = now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
  if (!inRange) return null;

  const x = scale(now);
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const timeStr = fmt === "12h"
    ? `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h >= 12 ? "PM" : "AM"}`
    : `${h.toString().padStart(2, "0")}:${m}`;
  const badgeWidth = fmt === "12h" ? 56 : 44;
  return (
    <>
      {/* Line through header */}
      <div className="absolute pointer-events-none" style={{ left: x - 1, top: 0, bottom: 0, width: 2, background: "var(--destructive)", opacity: 0.9, zIndex: 20 }} />
      {/* Diamond at bottom of header */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: x - 5,
          bottom: -5,
          width: 10,
          height: 10,
          background: "var(--destructive)",
          transform: "rotate(45deg)",
          borderRadius: 2,
          zIndex: 21,
        }}
      />
      {/* Time badge */}
      <div
        className="absolute pointer-events-none flex items-center justify-center text-white font-bold tracking-wide"
        style={{
          left: x - badgeWidth / 2,
          top: 2,
          width: badgeWidth,
          height: 18,
          borderRadius: 9,
          background: "var(--destructive)",
          fontSize: 10,
          zIndex: 21,
        }}
      >
        {timeStr}
      </div>
    </>
  );
}
