"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FeatureTabs } from "@/components/navigation/feature-tabs";
import { getCalendar } from "@/features/calendar/api";
import type {
  CalendarItem,
  CalendarItemKind,
  CalendarSnapshot,
} from "@/features/calendar/types";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateValue(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
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
    return "border-emerald-800 text-emerald-300";
  }
  if (kind === "run") {
    return "border-sky-300 text-sky-300";
  }
  return "border-slate-700 text-slate-400";
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

export default function CalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(new Date()),
  );
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  function showMonth(month: Date) {
    setIsLoading(true);
    setError("");
    setSnapshot(null);
    setVisibleMonth(monthStart(month));
  }

  const range = useMemo(() => {
    const start = monthStart(visibleMonth);
    const end = monthEnd(visibleMonth);
    return {
      startDate: localDateValue(start),
      endDate: localDateValue(end),
    };
  }, [visibleMonth]);

  useEffect(() => {
    let active = true;
    getCalendar(range.startDate, range.endDate)
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
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load calendar.",
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [range.endDate, range.startDate]);

  const groupedItems = useMemo(
    () => groupItems(snapshot?.items ?? []),
    [snapshot],
  );
  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const selectedDays = Object.entries(groupedItems);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link className="text-sm font-semibold text-emerald-300" href="/">
            Ordyn Life
          </Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Calendar
          </h1>
        </div>
        <Link
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
          href="/profile"
        >
          Profile
        </Link>
      </header>

      <FeatureTabs current="calendar" />

      <section className="mt-7 rounded-2xl border border-slate-800 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Date-based overview
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Calendar pulls from what you already log: task due dates, gym
          sessions, runs, and journal entries. Tap any item to return to the
          feature that owns it.
        </p>
      </section>

      <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Showing
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {monthLabel(visibleMonth)}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-950"
              onClick={() => showMonth(addMonths(visibleMonth, -1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-950"
              onClick={() => showMonth(new Date())}
              type="button"
            >
              Today
            </button>
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-950"
              onClick={() => showMonth(addMonths(visibleMonth, 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-xl border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const items = groupedItems[day] ?? [];
            const dayNumber = Number(day.slice(-2));
            const isCurrentMonth =
              day >= range.startDate && day <= range.endDate;
            const isToday = day === localDateValue();
            return (
              <div
                className={`min-h-24 rounded-2xl border p-2 ${
                  isToday
                    ? "border-emerald-300 bg-emerald-950"
                    : "border-slate-800 bg-slate-950"
                } ${isCurrentMonth ? "" : "opacity-40"}`}
                key={day}
              >
                <p className="text-right text-xs font-semibold text-slate-500">
                  {dayNumber}
                </p>
                <div className="mt-2 space-y-1">
                  {items.slice(0, 3).map((item) => (
                    <Link
                      className={`block truncate rounded-full border px-2 py-1 text-left text-[0.65rem] font-semibold ${kindClass(item.kind)}`}
                      href={item.href}
                      key={`${item.kind}-${item.source_id}`}
                      title={item.title}
                    >
                      {kindLabel(item.kind)}
                    </Link>
                  ))}
                  {items.length > 3 ? (
                    <p className="text-left text-[0.65rem] font-semibold text-slate-500">
                      +{items.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Agenda
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Logged this month
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-400">
            {snapshot?.items.length ?? 0} items
          </p>
        </div>

        {isLoading ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-400">
            Loading your calendar...
          </p>
        ) : selectedDays.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-400">
            Nothing is scheduled or logged in this month yet.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {selectedDays.map(([day, items]) => (
              <article key={day}>
                <h3 className="text-sm font-semibold text-slate-500">
                  {displayDay(day)}
                </h3>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <Link
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 transition hover:border-emerald-300 sm:flex-row sm:items-center sm:justify-between"
                      href={item.href}
                      key={`${item.kind}-${item.source_id}`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${kindClass(item.kind)}`}
                          >
                            {kindLabel(item.kind)}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {displayTime(item.timestamp)}
                          </span>
                        </div>
                        <h4 className="mt-2 font-semibold text-white">
                          {item.title}
                        </h4>
                        {item.detail ? (
                          <p className="mt-1 text-sm text-slate-400">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-emerald-300">
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
    </main>
  );
}
