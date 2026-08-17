import {
  BookOpen,
  CheckSquare,
  Dumbbell,
  Footprints,
  Grid3X3,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/classnames";
import type {
  ActivityDay,
  ActivityKind,
  ActivitySummary,
} from "@/features/calendar/types";

export type ActivityFilter = "all" | ActivityKind;

type ActivityGridProps = {
  onFilterChange: (filter: ActivityFilter) => void;
  selectedFilter: ActivityFilter;
  summary: ActivitySummary;
  today: string;
};

type ActivityMeta = {
  icon: LucideIcon;
  label: string;
  light: string;
  ring: string;
  text: string;
  value: ActivityKind;
};

export const activityKinds: ActivityMeta[] = [
  {
    icon: Dumbbell,
    label: "Gym",
    light: "bg-blue-100",
    ring: "ring-blue-600",
    text: "text-blue-700",
    value: "workout",
  },
  {
    icon: Footprints,
    label: "Running",
    light: "bg-sky-100",
    ring: "ring-sky-400",
    text: "text-sky-400",
    value: "run",
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    light: "bg-coral-100",
    ring: "ring-coral-600",
    text: "text-coral-700",
    value: "task",
  },
  {
    icon: BookOpen,
    label: "Journal",
    light: "bg-lavender-100",
    ring: "ring-lavender-600",
    text: "text-lavender-700",
    value: "journal",
  },
];

const emptyCounts = {
  journal: 0,
  run: 0,
  task: 0,
  workout: 0,
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function dateFromValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function buildGridDays(summary: ActivitySummary): ActivityDay[] {
  const byDate = new Map(summary.days.map((day) => [day.date, day]));
  const first = dateFromValue(summary.start_date);
  const last = dateFromValue(summary.end_date);
  const gridStart = addDays(first, -first.getUTCDay());
  const gridEnd = addDays(last, 6 - last.getUTCDay());
  const days: ActivityDay[] = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const value = dateValue(cursor);
    days.push(
      byDate.get(value) ?? {
        counts: emptyCounts,
        date: value,
        total: 0,
      },
    );
  }

  return days;
}

function activityCount(day: ActivityDay, kind: ActivityKind): number {
  return day.counts[kind] ?? 0;
}

function intensityClass(kind: ActivityKind, count: number): string {
  if (count <= 0) {
    return "bg-slate-100";
  }

  const intensity = Math.min(4, count);
  if (kind === "workout") {
    return [
      "bg-blue-100",
      "bg-blue-200",
      "bg-blue-300",
      "bg-blue-500",
      "bg-blue-600",
    ][intensity];
  }
  if (kind === "run") {
    return [
      "bg-sky-100",
      "bg-sky-200",
      "bg-sky-300",
      "bg-sky-400",
      "bg-blue-600",
    ][intensity];
  }
  if (kind === "task") {
    return [
      "bg-coral-100",
      "bg-coral-100",
      "bg-coral-600/60",
      "bg-coral-600/80",
      "bg-coral-600",
    ][intensity];
  }
  return [
    "bg-lavender-100",
    "bg-lavender-100",
    "bg-lavender-600/60",
    "bg-lavender-600/80",
    "bg-lavender-600",
  ][intensity];
}

function displayDate(value: string): string {
  return dayFormatter.format(new Date(`${value}T00:00:00Z`));
}

function monthLabels(days: ActivityDay[]): { index: number; label: string }[] {
  const labels: { index: number; label: string }[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const current = dateFromValue(days[index].date);
    const prior = index > 0 ? dateFromValue(days[index - 7].date) : null;
    if (!prior || current.getUTCMonth() !== prior.getUTCMonth()) {
      labels.push({
        index: index / 7,
        label: monthFormatter.format(current),
      });
    }
  }
  return labels;
}

function filterMeta(filter: ActivityFilter) {
  if (filter === "all") {
    return {
      icon: Grid3X3,
      label: "All",
      light: "bg-blue-50",
      ring: "ring-blue-600",
      text: "text-blue-600",
      value: "all" as const,
    };
  }
  return (
    activityKinds.find((kind) => kind.value === filter) ?? activityKinds[0]
  );
}

export function ActivityGrid({
  onFilterChange,
  selectedFilter,
  summary,
  today,
}: ActivityGridProps) {
  const gridDays = buildGridDays(summary);
  const labels = monthLabels(gridDays);
  const weekCount = Math.ceil(gridDays.length / 7);
  const visibleKinds =
    selectedFilter === "all"
      ? activityKinds
      : activityKinds.filter((kind) => kind.value === selectedFilter);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Grid3X3 aria-hidden="true" size={20} strokeWidth={2.4} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Activity</h2>
            <p className="text-sm text-slate-500">A year of logged items</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            ["all", "workout", "run", "task", "journal"] as ActivityFilter[]
          ).map((filter) => {
            const meta = filterMeta(filter);
            const Icon = meta.icon;
            const isSelected = selectedFilter === filter;
            return (
              <button
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-blue-200",
                  isSelected
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-950 hover:ring-1 hover:ring-slate-200",
                )}
                key={filter}
                onClick={() => onFilterChange(filter)}
                type="button"
              >
                <Icon aria-hidden="true" size={16} strokeWidth={2.4} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-3">
        <div className="min-w-[62rem]">
          <div className="ml-28 grid h-6 text-xs font-semibold text-slate-500">
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${weekCount}, 1fr)` }}
            >
              {labels.map((label) => (
                <span
                  className="truncate"
                  key={`${label.label}-${label.index}`}
                  style={{ gridColumnStart: label.index + 1 }}
                >
                  {label.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {visibleKinds.map((kind) => {
              const Icon = kind.icon;
              return (
                <div
                  className="grid grid-cols-[6.5rem_1fr] items-center gap-4"
                  key={kind.value}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        kind.light,
                        kind.text,
                      )}
                    >
                      <Icon aria-hidden="true" size={17} strokeWidth={2.4} />
                    </span>
                    <span className="text-sm font-medium text-slate-950">
                      {kind.label}
                    </span>
                  </div>

                  <div
                    className="grid grid-flow-col grid-rows-7 gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                    }}
                  >
                    {gridDays.map((day) => {
                      const count = activityCount(day, kind.value);
                      const isToday = day.date === today;
                      const isOutsideRange =
                        day.date < summary.start_date ||
                        day.date > summary.end_date;
                      return (
                        <span
                          aria-label={`${displayDate(day.date)}: ${count} ${kind.label.toLowerCase()} item${count === 1 ? "" : "s"}`}
                          className={cn(
                            "h-3 w-3 rounded-[3px] ring-offset-1 transition hover:scale-125 hover:ring-2",
                            intensityClass(kind.value, count),
                            isToday && "ring-2 ring-blue-600",
                            isOutsideRange && "opacity-30",
                          )}
                          key={`${kind.value}-${day.date}`}
                          title={`${displayDate(day.date)}: ${count} ${kind.label}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pl-28 text-xs font-medium text-slate-500">
            <span>Today is outlined</span>
            <div className="flex items-center gap-2">
              <span>Less</span>
              {[
                "bg-slate-100",
                "bg-blue-50",
                "bg-sky-200",
                "bg-sky-400",
                "bg-blue-600",
              ].map((tone) => (
                <span
                  aria-hidden="true"
                  className={cn("h-3 w-3 rounded-[3px]", tone)}
                  key={tone}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
