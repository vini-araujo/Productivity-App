"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FeatureTabs } from "@/components/navigation/feature-tabs";
import { getDashboard } from "@/features/dashboard/api";
import type {
  DashboardSnapshot,
  DashboardTask,
} from "@/features/dashboard/types";
import { customerError } from "@/lib/errors";

function localDateValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function millisecondsUntilTomorrow(): number {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1, tomorrow.getTime() - Date.now());
}

function displayToday(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayDueDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function relativeWorkoutDate(value: string): string {
  const today = localDateValue();
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  const sessionDate = new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
  const days = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() -
      new Date(`${sessionDate}T00:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  return `${days} days ago`;
}

function priorityClass(priority: DashboardTask["priority"]): string {
  if (priority === "high") {
    return "border-rose-900 text-rose-300";
  }
  if (priority === "medium") {
    return "border-amber-300 text-amber-300";
  }
  return "border-slate-700 text-slate-400";
}

export default function DashboardPage() {
  const [localDate, setLocalDate] = useState(localDateValue);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    function refreshDashboard() {
      const currentDate = localDateValue();
      if (currentDate !== localDate) {
        setIsLoading(true);
        setError("");
        setLocalDate(currentDate);
      } else if (document.visibilityState === "visible") {
        setRefreshVersion((current) => current + 1);
      }
    }

    const midnightTimer = window.setTimeout(
      refreshDashboard,
      millisecondsUntilTomorrow(),
    );
    document.addEventListener("visibilitychange", refreshDashboard);
    window.addEventListener("focus", refreshDashboard);
    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", refreshDashboard);
      window.removeEventListener("focus", refreshDashboard);
    };
  }, [localDate]);

  useEffect(() => {
    let active = true;
    getDashboard(localDate)
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
  }, [localDate, refreshVersion]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"
            href="/"
          >
            Ordyn Life
          </Link>
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">
            Today
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {displayToday(localDate)}
          </p>
        </div>
        <Link
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
          href="/profile"
        >
          Profile
        </Link>
      </header>

      <FeatureTabs current="dashboard" />

      <section className="mt-7 rounded-lg border border-slate-800 bg-slate-900 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Your daily overview
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          See what needs attention, continue your active workout, and keep
          today&apos;s reflection within reach.
        </p>
      </section>

      {error ? (
        <p className="mt-5 rounded-md border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-700 px-5 py-12 text-center">
          <p className="text-sm font-semibold text-white">
            Gathering your day...
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Loading tasks, training, runs, and journal status.
          </p>
        </div>
      ) : snapshot ? (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <Link
              className="rounded-lg border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300"
              href="/tasks"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Open tasks
              </p>
              <p className="mt-3 text-4xl font-semibold text-white">
                {snapshot.tasks.open_count}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {snapshot.tasks.open_count === 1
                  ? "One task needs attention."
                  : "Review your next priorities."}
              </p>
            </Link>
            <Link
              className="rounded-lg border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300"
              href="/gym"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Training
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {snapshot.workouts.active
                  ? snapshot.workouts.active.name
                  : "Ready when you are"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {snapshot.workouts.active
                  ? "Workout in progress. Continue logging."
                  : snapshot.workouts.latest_completed
                    ? `Last: ${snapshot.workouts.latest_completed.name}`
                    : "Start your first logged workout."}
              </p>
            </Link>
            <Link
              className="rounded-lg border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300"
              href="/journal"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Journal
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {snapshot.journal.entry_id
                  ? snapshot.journal.title || "Today is captured"
                  : "Write today"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {snapshot.journal.entry_id
                  ? "Your reflection is saved."
                  : "Take a quiet minute to reflect."}
              </p>
            </Link>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-lg border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    Focus
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Next tasks
                  </h2>
                </div>
                <Link
                  className="text-sm font-semibold text-emerald-300"
                  href="/tasks"
                >
                  Manage tasks
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {snapshot.tasks.next_tasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">
                    No open tasks. Your list is clear.
                  </p>
                ) : (
                  snapshot.tasks.next_tasks.map((task) => (
                    <Link
                      className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 transition hover:border-slate-700"
                      href="/tasks"
                      key={task.id}
                    >
                      <div>
                        <h3 className="font-semibold text-white">
                          {task.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {displayDueDate(task.due_at)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-lg border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Training status
                </p>
                {snapshot.workouts.active ? (
                  <>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      {snapshot.workouts.active.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Started{" "}
                      {relativeWorkoutDate(snapshot.workouts.active.started_at)}
                      .
                    </p>
                    <Link
                      className="mt-5 inline-flex rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
                      href="/gym"
                    >
                      Continue workout
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      No active workout
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {snapshot.workouts.latest_completed
                        ? `${snapshot.workouts.latest_completed.name} completed ${relativeWorkoutDate(snapshot.workouts.latest_completed.completed_at ?? snapshot.workouts.latest_completed.started_at)}.`
                        : "Choose a workout when you are ready."}
                    </p>
                    <Link
                      className="mt-5 inline-flex rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
                      href="/gym"
                    >
                      Open gym
                    </Link>
                  </>
                )}
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Latest run
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {snapshot.latest_run
                    ? `${Number(snapshot.latest_run.distance_km).toFixed(2)} km`
                    : "No runs logged"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {snapshot.latest_run
                    ? `Completed ${relativeWorkoutDate(snapshot.latest_run.started_at)} in ${Math.round(snapshot.latest_run.duration_seconds / 60)} minutes.`
                    : "Log your first run when you are ready."}
                </p>
                <Link
                  className="mt-5 inline-flex rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
                  href="/running"
                >
                  {snapshot.latest_run ? "Open running history" : "Log a run"}
                </Link>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
