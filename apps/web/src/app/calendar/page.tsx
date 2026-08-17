"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getCalendar } from "@/features/calendar/api";
import type {
  CalendarItem,
  CalendarItemKind,
  CalendarSnapshot,
} from "@/features/calendar/types";
import { customerError } from "@/lib/errors";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarKinds: CalendarItemKind[] = ["task", "workout", "run", "journal"];

type AgendaMode = "month" | "week" | "day";
type CalendarCounts = Record<CalendarItemKind, number>;

function localDateValue(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function dateFromLocalValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthEnd(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function addDays(value: string, amount: number): string {
  const date = dateFromLocalValue(value);
  date.setDate(date.getDate() + amount);
  return localDateValue(date);
}

function startOfWeek(value: string): string {
  const date = dateFromLocalValue(value);
  date.setDate(date.getDate() - date.getDay());
  return localDateValue(date);
}

function monthLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function displayDay(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayShortDay(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

function kindLabel(kind: CalendarItemKind): string {
  if (kind === "run") {
    return "Running";
  }
  if (kind === "workout") {
    return "Gym";
  }
  return kind[0].toUpperCase() + kind.slice(1);
}

function kindClass(kind: CalendarItemKind): string {
  if (kind === "task") {
    return "border-amber-300 text-amber-300";
  }
  if (kind === "workout") {
    return "border-blue-200 text-blue-600";
  }
  if (kind === "run") {
    return "border-sky-300 text-sky-300";
  }
  return "border-slate-300 text-slate-500";
}

function kindDotClass(kind: CalendarItemKind): string {
  if (kind === "task") {
    return "bg-amber-300";
  }
  if (kind === "workout") {
    return "bg-blue-600";
  }
  if (kind === "run") {
    return "bg-sky-300";
  }
  return "bg-slate-500";
}

function buildMonthDays(month: Date): string[] {
  const first = monthStart(month);
  const last = monthEnd(month);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - last.getDay()));

  const days: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(localDateValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function groupItems(items: CalendarItem[]): Record<string, CalendarItem[]> {
  return items.reduce<Record<string, CalendarItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item];
    return groups;
  }, {});
}

function isDateInRange(
  value: string,
  startDate: string,
  endDate: string,
): boolean {
  return value >= startDate && value <= endDate;
}

function countItems(items: CalendarItem[]): CalendarCounts {
  return items.reduce<CalendarCounts>(
    (counts, item) => ({
      ...counts,
      [item.kind]: counts[item.kind] + 1,
    }),
    { task: 0, workout: 0, run: 0, journal: 0 },
  );
}

function agendaTitle(
  mode: AgendaMode,
  visibleMonth: Date,
  selectedDay: string | null,
): string {
  if (mode === "day" && selectedDay) {
    return displayDay(selectedDay);
  }
  if (mode === "week" && selectedDay) {
    const weekStart = startOfWeek(selectedDay);
    return `${displayShortDay(weekStart)} - ${displayShortDay(addDays(weekStart, 6))}`;
  }
  return `${monthLabel(visibleMonth)} agenda`;
}

export default function CalendarPage() {
  const today = localDateValue();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(new Date()),
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [agendaMode, setAgendaMode] = useState<AgendaMode>("month");
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const calendarRange = useMemo(() => {
    const days = buildMonthDays(visibleMonth);
    return {
      days,
      requestStartDate: days[0],
      requestEndDate: days[days.length - 1],
      visibleStartDate: localDateValue(monthStart(visibleMonth)),
      visibleEndDate: localDateValue(monthEnd(visibleMonth)),
    };
  }, [visibleMonth]);

  function reloadCalendar() {
    setIsLoading(true);
    setError("");
    setSnapshot(null);
    setRefreshVersion((current) => current + 1);
  }

  function showMonth(month: Date) {
    setIsLoading(true);
    setError("");
    setSnapshot(null);
    setSelectedDay(null);
    setAgendaMode("month");
    setVisibleMonth(monthStart(month));
  }

  function showToday() {
    const targetMonth = monthStart(new Date());
    setSelectedDay(today);
    setAgendaMode("day");
    if (targetMonth.getTime() !== visibleMonth.getTime()) {
      setIsLoading(true);
      setError("");
      setSnapshot(null);
      setVisibleMonth(targetMonth);
    }
  }

  function showCurrentWeek() {
    setSelectedDay(today);
    setAgendaMode("week");
    if (
      !isDateInRange(
        today,
        calendarRange.requestStartDate,
        calendarRange.requestEndDate,
      )
    ) {
      setIsLoading(true);
      setError("");
      setSnapshot(null);
      setVisibleMonth(monthStart(new Date()));
    }
  }

  function showSelectedDay() {
    if (!selectedDay) {
      showToday();
      return;
    }
    setAgendaMode("day");
  }

  function selectDay(day: string) {
    setSelectedDay(day);
    setAgendaMode("day");
    if (
      !isDateInRange(
        day,
        calendarRange.visibleStartDate,
        calendarRange.visibleEndDate,
      )
    ) {
      setIsLoading(true);
      setError("");
      setSnapshot(null);
      setVisibleMonth(monthStart(dateFromLocalValue(day)));
    }
  }

  useEffect(() => {
    let active = true;
    getCalendar(calendarRange.requestStartDate, calendarRange.requestEndDate)
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
        setSnapshot(null);
        setError(customerError(caughtError, "Could not load your calendar."));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [
    calendarRange.requestEndDate,
    calendarRange.requestStartDate,
    refreshVersion,
  ]);

  const visibleMonthItems = useMemo(
    () =>
      (snapshot?.items ?? []).filter((item) =>
        isDateInRange(
          item.date,
          calendarRange.visibleStartDate,
          calendarRange.visibleEndDate,
        ),
      ),
    [calendarRange.visibleEndDate, calendarRange.visibleStartDate, snapshot],
  );
  const counts = useMemo(
    () => countItems(visibleMonthItems),
    [visibleMonthItems],
  );
  const totalVisibleItems = visibleMonthItems.length;

  const agendaItems = useMemo(() => {
    const items = snapshot?.items ?? [];
    if (agendaMode === "day" && selectedDay) {
      return items.filter((item) => item.date === selectedDay);
    }
    if (agendaMode === "week" && selectedDay) {
      const weekStart = startOfWeek(selectedDay);
      const weekEnd = addDays(weekStart, 6);
      return items.filter((item) =>
        isDateInRange(item.date, weekStart, weekEnd),
      );
    }
    return visibleMonthItems;
  }, [agendaMode, selectedDay, snapshot, visibleMonthItems]);

  const groupedItems = useMemo(
    () => groupItems(snapshot?.items ?? []),
    [snapshot],
  );
  const groupedAgendaItems = useMemo(
    () => groupItems(agendaItems),
    [agendaItems],
  );
  const agendaDays = Object.entries(groupedAgendaItems);
  const agendaHeading = agendaTitle(agendaMode, visibleMonth, selectedDay);

  return (
    <AppShell
      current="calendar"
      description={
        totalVisibleItems === 1
          ? "One source item is in view."
          : `${totalVisibleItems} source items are in view.`
      }
      title="Calendar"
    >
      <section className="mt-7 rounded-lg border border-slate-200 bg-white px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Date-based overview
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Calendar pulls from what you already log: task due dates, gym
          sessions, runs, and journal entries. Select a day to focus the agenda,
          or switch between this week and the full month.
        </p>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-4">
        {calendarKinds.map((kind) => (
          <Link
            className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300"
            href={
              kind === "task"
                ? "/tasks"
                : kind === "workout"
                  ? "/gym"
                  : kind === "run"
                    ? "/running"
                    : "/journal"
            }
            key={kind}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {kindLabel(kind)}
              </p>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${kindDotClass(kind)}`}
              />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {counts[kind]}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-7 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Showing
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {monthLabel(visibleMonth)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50"
              onClick={() => showMonth(addMonths(visibleMonth, -1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50"
              onClick={showToday}
              type="button"
            >
              Today
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50"
              onClick={() => showMonth(addMonths(visibleMonth, 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p>{error}</p>
            <button
              className="mt-3 rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
              onClick={reloadCalendar}
              type="button"
            >
              Retry calendar
            </button>
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="min-w-[42rem]">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarRange.days.map((day) => {
                const items = groupedItems[day] ?? [];
                const dayNumber = Number(day.slice(-2));
                const isCurrentMonth = isDateInRange(
                  day,
                  calendarRange.visibleStartDate,
                  calendarRange.visibleEndDate,
                );
                const isToday = day === today;
                const isSelected = day === selectedDay;
                return (
                  <button
                    aria-label={`${displayDay(day)}: ${items.length} item${
                      items.length === 1 ? "" : "s"
                    }`}
                    aria-pressed={isSelected}
                    className={`min-h-28 rounded-lg border p-2 text-left transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                      isSelected
                        ? "border-blue-300 bg-blue-50"
                        : isToday
                          ? "border-blue-200 bg-slate-50"
                          : "border-slate-200 bg-slate-50"
                    } ${isCurrentMonth ? "" : "opacity-45"}`}
                    key={day}
                    onClick={() => selectDay(day)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {dayNumber}
                      </span>
                      {items.length > 0 ? (
                        <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
                          {items.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {items.slice(0, 3).map((item) => (
                        <div
                          className="flex items-center gap-1.5"
                          key={`${item.kind}-${item.source_id}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${kindDotClass(
                              item.kind,
                            )}`}
                          />
                          <span className="truncate text-[0.7rem] font-semibold text-slate-500">
                            {item.title}
                          </span>
                        </div>
                      ))}
                      {items.length > 3 ? (
                        <p className="text-[0.65rem] font-semibold text-slate-500">
                          +{items.length - 3} more
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Agenda
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {agendaHeading}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {agendaItems.length === 1
                ? "One item"
                : `${agendaItems.length} items`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                agendaMode === "month"
                  ? "border-blue-300 bg-blue-50 text-slate-950"
                  : "border-slate-300 text-slate-950 hover:border-slate-500 hover:bg-slate-50"
              }`}
              onClick={() => {
                setAgendaMode("month");
                setSelectedDay(null);
              }}
              type="button"
            >
              Month
            </button>
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                agendaMode === "week"
                  ? "border-blue-300 bg-blue-50 text-slate-950"
                  : "border-slate-300 text-slate-950 hover:border-slate-500 hover:bg-slate-50"
              }`}
              onClick={showCurrentWeek}
              type="button"
            >
              This week
            </button>
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                agendaMode === "day"
                  ? "border-blue-300 bg-blue-50 text-slate-950"
                  : "border-slate-300 text-slate-950 hover:border-slate-500 hover:bg-slate-50"
              }`}
              onClick={showSelectedDay}
              type="button"
            >
              Selected day
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-950">
              Loading your calendar...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Pulling tasks, workouts, runs, and journal entries into one view.
            </p>
          </div>
        ) : agendaDays.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-5 py-10 text-center">
            <h3 className="text-lg font-semibold text-slate-950">
              Nothing here yet
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Add a task due date, complete a workout, log a run, or write a
              journal entry and it will show up automatically.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950"
                href="/tasks"
              >
                Add task
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950"
                href="/gym"
              >
                Open gym
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950"
                href="/running"
              >
                Log run
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950"
                href="/journal"
              >
                Write journal
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {agendaDays.map(([day, items]) => (
              <article key={day}>
                <h3 className="text-sm font-semibold text-slate-500">
                  {displayDay(day)}
                </h3>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <Link
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-blue-300 sm:flex-row sm:items-center sm:justify-between"
                      href={item.href}
                      key={`${item.kind}-${item.source_id}`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${kindClass(
                              item.kind,
                            )}`}
                          >
                            {kindLabel(item.kind)}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {displayTime(item.timestamp)}
                          </span>
                        </div>
                        <h4 className="mt-2 font-semibold text-slate-950">
                          {item.title}
                        </h4>
                        {item.detail ? (
                          <p className="mt-1 text-sm text-slate-500">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-blue-600">
                        {item.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
