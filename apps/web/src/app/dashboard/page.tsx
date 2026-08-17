"use client";

import {
  Activity,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Dumbbell,
  GitBranch,
  Layers3,
  Lock,
  NotebookPen,
  Plus,
  Radio,
  Route,
  Rss,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { StatusMessage } from "@/components/ui/panel";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { getActivitySummary, getCalendar } from "@/features/calendar/api";
import type {
  ActivityCounts,
  ActivityDay,
  ActivityKind,
  ActivitySummary,
  CalendarItem,
  CalendarItemKind,
  CalendarSnapshot,
} from "@/features/calendar/types";
import { createTask } from "@/features/tasks/api";
import { getDashboard } from "@/features/dashboard/api";
import type { DashboardSnapshot } from "@/features/dashboard/types";
import { cn } from "@/lib/classnames";
import { customerError } from "@/lib/errors";

type MonitorFilter =
  | "all"
  | ActivityKind
  | "posts"
  | "github"
  | "reading"
  | "learning";

type MonitorMeta = {
  label: string;
  planned?: boolean;
  value: MonitorFilter;
};

const monitorFilters: MonitorMeta[] = [
  { label: "All", value: "all" },
  { label: "Posts", planned: true, value: "posts" },
  { label: "GitHub", planned: true, value: "github" },
  { label: "Gym", value: "workout" },
  { label: "Reading", planned: true, value: "reading" },
  { label: "Learning", planned: true, value: "learning" },
];

const emptyCounts: ActivityCounts = {
  journal: 0,
  run: 0,
  task: 0,
  workout: 0,
};

const weeklyTargets: Record<ActivityKind, number> = {
  journal: 1,
  run: 5,
  task: 12,
  workout: 1,
};

const sourceConfig = {
  journal: {
    icon: NotebookPen,
    label: "Journal",
    progressTone: "lavender",
    text: "text-lavender-600",
  },
  run: {
    icon: Route,
    label: "Run",
    progressTone: "coral",
    text: "text-coral-600",
  },
  task: {
    icon: CheckCircle2,
    label: "Tasks",
    progressTone: "blue",
    text: "text-blue-600",
  },
  workout: {
    icon: Dumbbell,
    label: "Gym",
    progressTone: "emerald",
    text: "text-emerald-300",
  },
} satisfies Record<
  ActivityKind,
  {
    icon: LucideIcon;
    label: string;
    progressTone: "blue" | "coral" | "emerald" | "lavender";
    text: string;
  }
>;

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

function localDateValue(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function dateFromValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, amount: number): string {
  const date = dateFromValue(value);
  date.setDate(date.getDate() + amount);
  return localDateValue(date);
}

function startOfWeek(value: string): string {
  const date = dateFromValue(value);
  date.setDate(date.getDate() - date.getDay());
  return localDateValue(date);
}

function yearStart(year: number): string {
  return `${year}-01-01`;
}

function yearEnd(year: number): string {
  return `${year}-12-31`;
}

function displayFullDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayTime(value: string | null): string {
  if (!value) {
    return "All day";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function currentWeekCounts(
  summary: ActivitySummary | null,
  today: string,
): ActivityCounts {
  if (!summary) {
    return emptyCounts;
  }

  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  return summary.days.reduce<ActivityCounts>(
    (counts, day) => {
      if (day.date < weekStart || day.date > weekEnd) {
        return counts;
      }
      return {
        journal: counts.journal + day.counts.journal,
        run: counts.run + day.counts.run,
        task: counts.task + day.counts.task,
        workout: counts.workout + day.counts.workout,
      };
    },
    { ...emptyCounts },
  );
}

function activityTotal(
  summary: ActivitySummary | null,
  kind: ActivityKind,
): number {
  return (
    summary?.days.reduce((total, day) => total + (day.counts[kind] ?? 0), 0) ??
    0
  );
}

function buildMonitorDays(
  summary: ActivitySummary | null,
  today: string,
): ActivityDay[] {
  const weekEnd = addDays(startOfWeek(today), 6);
  const start = addDays(weekEnd, -(14 * 7 - 1));
  const byDate = new Map(summary?.days.map((day) => [day.date, day]) ?? []);
  const days: ActivityDay[] = [];

  for (let cursor = start; cursor <= weekEnd; cursor = addDays(cursor, 1)) {
    days.push(
      byDate.get(cursor) ?? {
        counts: emptyCounts,
        date: cursor,
        total: 0,
      },
    );
  }

  return days;
}

function monthLabels(days: ActivityDay[]): { index: number; label: string }[] {
  const labels: { index: number; label: string }[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const current = new Date(`${days[index].date}T00:00:00Z`);
    const prior =
      index > 0 ? new Date(`${days[index - 7].date}T00:00:00Z`) : null;
    if (!prior || current.getUTCMonth() !== prior.getUTCMonth()) {
      labels.push({
        index: index / 7,
        label: monthFormatter.format(current),
      });
    }
  }
  return labels;
}

function cellCount(day: ActivityDay, filter: MonitorFilter): number {
  if (filter === "all") {
    return day.total;
  }
  if (filter === "journal" || filter === "run" || filter === "task") {
    return day.counts[filter];
  }
  if (filter === "workout") {
    return day.counts.workout;
  }
  return 0;
}

function heatClass(count: number, planned: boolean): string {
  if (planned) {
    return "bg-white/[0.08]";
  }
  if (count <= 0) {
    return "bg-white/10";
  }
  if (count === 1) {
    return "bg-emerald-300/35";
  }
  if (count === 2) {
    return "bg-emerald-300/55";
  }
  if (count === 3) {
    return "bg-emerald-300/75";
  }
  return "bg-emerald-300";
}

function sortedCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return leftTime - rightTime;
  });
}

function CalendarIconForKind(kind: CalendarItemKind) {
  return sourceConfig[kind].icon;
}

function ActivityMonitor({
  filter,
  isLoading,
  onFilterChange,
  summary,
  today,
}: {
  filter: MonitorFilter;
  isLoading: boolean;
  onFilterChange: (filter: MonitorFilter) => void;
  summary: ActivitySummary | null;
  today: string;
}) {
  const days = buildMonitorDays(summary, today);
  const labels = monthLabels(days);
  const selected = monitorFilters.find((item) => item.value === filter);
  const isPlanned = selected?.planned ?? false;

  return (
    <section className="ordyn-glass rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity aria-hidden="true" className="text-white" size={20} />
          <h2 className="text-lg font-semibold text-white">Activity Monitor</h2>
        </div>
        <Radio aria-hidden="true" className="text-slate-500" size={19} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {monitorFilters.map((item) => {
          const isActive = item.value === filter;
          return (
            <button
              className={cn(
                "rounded-md px-3 py-2 text-xs font-semibold transition",
                isActive
                  ? "bg-blue-500/20 text-blue-200"
                  : "bg-white/[0.07] text-slate-500 hover:bg-white/[0.12] hover:text-white",
              )}
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="ml-10 grid h-6 grid-cols-[repeat(14,minmax(0,1fr))] text-xs font-medium text-slate-500">
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
        <div className="grid grid-cols-[2.25rem_1fr] gap-3">
          <div className="grid grid-rows-7 gap-1.5 text-xs font-medium text-slate-500">
            <span>Sun</span>
            <span />
            <span>Tue</span>
            <span />
            <span>Thu</span>
            <span />
            <span>Sat</span>
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5">
            {days.map((day) => {
              const count = cellCount(day, filter);
              return (
                <span
                  aria-label={`${day.date}: ${isPlanned ? "planned category" : `${count} activity item${count === 1 ? "" : "s"}`}`}
                  className={cn(
                    "ordyn-heat-cell transition hover:scale-125 hover:ring-2 hover:ring-white/35",
                    heatClass(count, isPlanned),
                    day.date === today && "ring-2 ring-blue-300",
                    isLoading && "animate-pulse",
                  )}
                  key={day.date}
                  title={`${day.date}: ${isPlanned ? "planned category" : count}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
        {isPlanned ? (
          <span>Roadmap preview. No integration connected.</span>
        ) : (
          <>
            <span>Less</span>
            {[
              "bg-white/10",
              "bg-emerald-300/35",
              "bg-emerald-300/55",
              "bg-emerald-300/75",
              "bg-emerald-300",
            ].map((tone) => (
              <span
                aria-hidden="true"
                className={cn("h-3 w-3 rounded-[3px]", tone)}
                key={tone}
              />
            ))}
            <span>More</span>
          </>
        )}
      </div>
    </section>
  );
}

function Timeline({
  items,
  isLoading,
  today,
}: {
  isLoading: boolean;
  items: CalendarItem[];
  today: string;
}) {
  const visibleItems = sortedCalendarItems(items);

  return (
    <section className="ordyn-glass flex min-h-[39rem] flex-col rounded-lg p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <CalendarDays
          aria-hidden="true"
          className="mt-1 text-white"
          size={24}
        />
        <div>
          <h2 className="text-2xl font-semibold text-white">Calendar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Read-only from your activity
          </p>
        </div>
      </div>

      <h1 className="mt-10 text-3xl font-semibold text-white sm:text-4xl">
        {displayFullDate(today)}
      </h1>

      <div className="mt-8 flex-1">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-white/15 px-5 py-12 text-center text-sm text-slate-500">
            Loading today’s activity...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-5 py-12 text-center">
            <p className="font-semibold text-white">Nothing on the timeline.</p>
            <p className="mt-2 text-sm text-slate-500">
              Add a task, finish a workout, log a run, or write a journal entry.
            </p>
          </div>
        ) : (
          <div className="relative ml-1 space-y-8 before:absolute before:left-[5.7rem] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/28">
            {visibleItems.map((item) => {
              const Icon = CalendarIconForKind(item.kind);
              const meta = sourceConfig[item.kind];
              return (
                <Link
                  className="grid grid-cols-[4.8rem_1fr] items-center gap-5"
                  href={item.href}
                  key={`${item.kind}-${item.source_id}`}
                >
                  <span className="text-sm font-medium text-slate-500">
                    {displayTime(item.timestamp)}
                  </span>
                  <span className="relative flex min-h-20 items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/[0.07] px-5 py-4 transition hover:border-blue-300/40 hover:bg-white/10">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -left-[2.72rem] h-3 w-3 rounded-full",
                        item.kind === "task" && "bg-blue-500",
                        item.kind === "workout" && "bg-emerald-300",
                        item.kind === "run" && "bg-coral-600",
                        item.kind === "journal" && "bg-lavender-600",
                      )}
                    />
                    <span className="flex min-w-0 items-center gap-4">
                      <Icon
                        aria-hidden="true"
                        className={cn("shrink-0", meta.text)}
                        size={25}
                        strokeWidth={2.4}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-white">
                          {meta.label}: {item.title}
                        </span>
                        {item.detail ? (
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {item.detail}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "hidden rounded-md border border-current/25 px-3 py-1 text-sm font-semibold sm:inline-flex",
                        meta.text,
                      )}
                    >
                      {meta.label}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="text-slate-500"
                      size={19}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Lock aria-hidden="true" size={16} />
        Calendar is read-only from your activity
      </p>
    </section>
  );
}

export default function DashboardPage() {
  const [today, setToday] = useState(localDateValue);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [calendar, setCalendar] = useState<CalendarSnapshot | null>(null);
  const [activitySummary, setActivitySummary] =
    useState<ActivitySummary | null>(null);
  const [activityFilter, setActivityFilter] = useState<MonitorFilter>("all");
  const [quickTask, setQuickTask] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  function refreshAll() {
    setToday(localDateValue());
    setError("");
    setCalendarError("");
    setActivityError("");
    setIsLoading(true);
    setIsCalendarLoading(true);
    setIsActivityLoading(true);
    setRefreshVersion((current) => current + 1);
  }

  useEffect(() => {
    let active = true;
    getDashboard(today)
      .then((loaded) => {
        if (active) {
          setSnapshot(loaded);
        }
      })
      .catch((caughtError: unknown) => {
        if (!active) {
          return;
        }
        if (
          caughtError instanceof Error &&
          caughtError.message === "Authentication required"
        ) {
          window.location.assign("/login");
          return;
        }
        setError(customerError(caughtError, "Could not load your dashboard."));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshVersion, today]);

  useEffect(() => {
    let active = true;
    getCalendar(today, today)
      .then((loaded) => {
        if (active) {
          setCalendar(loaded);
        }
      })
      .catch((caughtError: unknown) => {
        if (!active) {
          return;
        }
        if (
          caughtError instanceof Error &&
          caughtError.message === "Authentication required"
        ) {
          window.location.assign("/login");
          return;
        }
        setCalendarError(
          customerError(caughtError, "Could not load today’s calendar."),
        );
      })
      .finally(() => {
        if (active) {
          setIsCalendarLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshVersion, today]);

  useEffect(() => {
    let active = true;
    const year = new Date().getFullYear();
    getActivitySummary(yearStart(year), yearEnd(year))
      .then((loaded) => {
        if (active) {
          setActivitySummary(loaded);
        }
      })
      .catch((caughtError: unknown) => {
        if (!active) {
          return;
        }
        if (
          caughtError instanceof Error &&
          caughtError.message === "Authentication required"
        ) {
          window.location.assign("/login");
          return;
        }
        setActivityError(
          customerError(caughtError, "Could not load activity monitor."),
        );
      })
      .finally(() => {
        if (active) {
          setIsActivityLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshVersion]);

  async function handleQuickTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quickTask.trim();
    if (!title) {
      return;
    }

    setIsCreatingTask(true);
    setMessage("");
    setError("");
    try {
      await createTask({
        due_at: new Date().toISOString(),
        priority: "medium",
        title,
      });
      setQuickTask("");
      setMessage("Task added for today.");
      refreshAll();
    } catch (caughtError) {
      setError(customerError(caughtError, "Could not add this task."));
    } finally {
      setIsCreatingTask(false);
    }
  }

  const weekCounts = useMemo(
    () => currentWeekCounts(activitySummary, today),
    [activitySummary, today],
  );
  const calendarItems = calendar?.items ?? [];
  const sourceRows = (
    ["task", "workout", "run", "journal"] as ActivityKind[]
  ).map((kind) => ({
    count: activityTotal(activitySummary, kind),
    kind,
    ...sourceConfig[kind],
  }));

  return (
    <AppShell
      className="max-w-none"
      current="dashboard"
      hideHeader
      title="Dashboard"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(20rem,26rem)_minmax(31rem,1fr)_minmax(20rem,24rem)]">
        <div className="grid gap-4">
          <ActivityMonitor
            filter={activityFilter}
            isLoading={isActivityLoading}
            onFilterChange={setActivityFilter}
            summary={activitySummary}
            today={today}
          />

          <section className="ordyn-glass rounded-lg p-5">
            <div className="flex items-center gap-3">
              <Layers3 aria-hidden="true" className="text-white" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Today’s Progress
              </h2>
            </div>
            <div className="mt-5 rounded-lg border border-white/12 bg-white/[0.05] p-4">
              {(["task", "workout", "run", "journal"] as ActivityKind[]).map(
                (kind) => {
                  const config = sourceConfig[kind];
                  const Icon = config.icon;
                  return (
                    <div className="mb-5 last:mb-0" key={kind}>
                      <div className="mb-2 flex items-center gap-3">
                        <Icon
                          aria-hidden="true"
                          className={config.text}
                          size={23}
                          strokeWidth={2.4}
                        />
                        <ProgressMeter
                          className="flex-1"
                          label={config.label}
                          max={weeklyTargets[kind]}
                          tone={config.progressTone}
                          value={weekCounts[kind]}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        </div>

        <div>
          {error ? (
            <StatusMessage className="mb-4" tone="danger">
              {error}
            </StatusMessage>
          ) : null}
          {calendarError ? (
            <StatusMessage className="mb-4" tone="danger">
              {calendarError}
            </StatusMessage>
          ) : null}
          {activityError ? (
            <StatusMessage className="mb-4" tone="danger">
              {activityError}
            </StatusMessage>
          ) : null}
          <Timeline
            isLoading={isCalendarLoading}
            items={calendarItems}
            today={today}
          />
        </div>

        <div className="grid content-start gap-4">
          <section className="ordyn-glass rounded-lg p-5">
            <div className="flex items-center gap-3">
              <CheckSquare
                aria-hidden="true"
                className="text-white"
                size={21}
              />
              <h2 className="text-lg font-semibold text-white">Add Task</h2>
            </div>
            <form
              className="mt-5 flex overflow-hidden rounded-lg border border-white/15 bg-white/[0.07]"
              onSubmit={handleQuickTaskSubmit}
            >
              <input
                aria-label="Add task"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-base outline-none"
                maxLength={200}
                onChange={(event) => setQuickTask(event.target.value)}
                placeholder="Add task"
                value={quickTask}
              />
              <button
                aria-label="Add task"
                className="flex w-16 items-center justify-center border-l border-white/12 text-white transition hover:bg-white/10 disabled:opacity-50"
                disabled={isCreatingTask || !quickTask.trim()}
                type="submit"
              >
                <Plus aria-hidden="true" size={24} />
              </button>
            </form>
            {message ? (
              <p className="mt-3 text-sm font-medium text-blue-200">
                {message}
              </p>
            ) : null}
          </section>

          <section className="ordyn-glass rounded-lg p-5">
            <div className="flex items-center gap-3">
              <Layers3 aria-hidden="true" className="text-white" size={21} />
              <h2 className="text-lg font-semibold text-white">
                Activity Sources
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              {sourceRows.map((row) => {
                const Icon = row.icon;
                return (
                  <Link
                    className="flex items-center justify-between gap-4 rounded-lg px-1 py-1 text-white transition hover:bg-white/[0.07]"
                    href={
                      row.kind === "task"
                        ? "/tasks"
                        : row.kind === "workout"
                          ? "/gym"
                          : row.kind === "run"
                            ? "/running"
                            : "/journal"
                    }
                    key={row.kind}
                  >
                    <span className="flex items-center gap-4">
                      <Icon
                        aria-hidden="true"
                        className={row.text}
                        size={25}
                        strokeWidth={2.4}
                      />
                      <span className="font-semibold">{row.label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold">
                        {isActivityLoading ? "-" : row.count}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="text-slate-500"
                        size={18}
                      />
                    </span>
                  </Link>
                );
              })}
              <Link
                className="flex items-center justify-between rounded-lg pt-2 text-sm font-medium text-slate-500 transition hover:text-white"
                href="/calendar"
              >
                View all activity
                <ChevronRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </section>

          <section className="ordyn-glass rounded-lg p-5">
            <div className="flex items-center gap-3">
              <BookOpen
                aria-hidden="true"
                className="text-lavender-600"
                size={23}
              />
              <h2 className="text-lg font-semibold text-white">Journal</h2>
            </div>
            <p className="mt-5 text-sm text-slate-500">Today’s entry</p>
            <div className="mt-4 rounded-lg border border-white/15 bg-white/[0.07] px-4 py-4 text-sm leading-6 text-white">
              {isLoading
                ? "Loading journal..."
                : snapshot?.journal.entry_id
                  ? (snapshot.journal.title ?? "Reflection captured today.")
                  : "No entry yet. Open the journal when you’re ready."}
            </div>
            <Link
              className="mt-5 flex justify-end gap-2 text-sm font-semibold text-lavender-600 transition hover:text-lavender-100"
              href="/journal"
            >
              View journal
              <ChevronRight aria-hidden="true" size={18} />
            </Link>
          </section>

          <section className="ordyn-glass-soft rounded-lg p-4 text-xs leading-5 text-slate-500">
            <div className="flex items-start gap-3">
              <GitBranch aria-hidden="true" className="mt-0.5" size={17} />
              <p>
                GitHub, posts, reading, and learning are roadmap activity
                categories. They are shown as planned, not connected.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Rss aria-hidden="true" className="mt-0.5" size={17} />
              <p>Current live data comes from tasks, gym, runs, and journal.</p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
