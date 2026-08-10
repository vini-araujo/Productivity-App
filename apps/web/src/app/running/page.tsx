"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { FeatureTabs } from "@/components/navigation/feature-tabs";
import {
  createRun,
  deleteRun,
  listRuns,
  updateRun,
} from "@/features/running/api";
import type { Run } from "@/features/running/types";
import { customerError } from "@/lib/errors";

const pageSize = 20;

function localDateTime(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

const emptyForm = () => ({
  startedAt: localDateTime(),
  distanceKm: "",
  durationMinutes: "",
  notes: "",
});

function pace(run: Run): string {
  const totalSeconds = Math.round(
    run.duration_seconds / Number(run.distance_km),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} / km`;
}

function duration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function RunningPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const loadGeneration = useRef(0);

  async function loadRuns() {
    const generation = ++loadGeneration.current;
    setIsLoading(true);
    setError("");
    try {
      const result = await listRuns(pageSize, offset);
      if (generation === loadGeneration.current) {
        setRuns(result.items);
        setTotal(result.total);
      }
    } catch (caughtError) {
      if (generation !== loadGeneration.current) {
        return;
      }
      if (
        caughtError instanceof Error &&
        caughtError.message === "Authentication required"
      ) {
        window.location.assign("/login");
        return;
      }
      setError(customerError(caughtError, "Could not load your runs."));
    } finally {
      if (generation === loadGeneration.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    const generation = ++loadGeneration.current;
    listRuns(pageSize, offset)
      .then((result) => {
        if (active && generation === loadGeneration.current) {
          setRuns(result.items);
          setTotal(result.total);
        }
      })
      .catch((caughtError: unknown) => {
        if (!active || generation !== loadGeneration.current) {
          return;
        }
        if (
          caughtError instanceof Error &&
          caughtError.message === "Authentication required"
        ) {
          window.location.assign("/login");
          return;
        }
        setError(customerError(caughtError, "Could not load your runs."));
      })
      .finally(() => {
        if (active && generation === loadGeneration.current) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [offset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const data = {
      started_at: new Date(form.startedAt).toISOString(),
      distance_km: Number(form.distanceKm),
      duration_seconds: Math.round(Number(form.durationMinutes) * 60),
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await updateRun(editingId, data);
      } else {
        await createRun(data);
      }
      setEditingId(null);
      setForm(emptyForm());
      if (offset !== 0) {
        setOffset(0);
      } else {
        await loadRuns();
      }
    } catch (caughtError) {
      setError(customerError(caughtError, "Could not save this run."));
    } finally {
      setIsSaving(false);
    }
  }

  function beginEdit(run: Run) {
    setEditingId(run.id);
    setForm({
      startedAt: localDateTime(new Date(run.started_at)),
      distanceKm: run.distance_km,
      durationMinutes: (run.duration_seconds / 60).toString(),
      notes: run.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeRun(run: Run) {
    if (!window.confirm(`Delete the ${run.distance_km} km run?`)) {
      return;
    }
    try {
      await deleteRun(run.id);
      if (runs.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - pageSize));
      } else {
        await loadRuns();
      }
    } catch (caughtError) {
      setError(customerError(caughtError, "Could not delete this run."));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link className="text-sm font-semibold text-emerald-300" href="/">
            Ordyn Life
          </Link>
          <h1 className="mt-2 text-4xl font-semibold text-white">Running</h1>
        </div>
        <Link
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
          href="/profile"
        >
          Profile
        </Link>
      </header>

      <FeatureTabs current="running" />

      <section className="mt-7 rounded-lg border border-slate-800 bg-slate-900 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Simple running log
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Record distance and duration after a run. Pace is calculated
          automatically, and every entry remains editable in your history.
        </p>
      </section>

      <section className="mt-7 rounded-lg border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-white">
          {editingId ? "Edit run" : "Log a run"}
        </h2>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <label className="text-sm font-medium text-slate-200 sm:col-span-2">
            Date and time
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              onChange={(event) =>
                setForm({ ...form, startedAt: event.target.value })
              }
              required
              type="datetime-local"
              value={form.startedAt}
            />
          </label>
          <label className="text-sm font-medium text-slate-200">
            Distance (km)
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              min="0.01"
              onChange={(event) =>
                setForm({ ...form, distanceKm: event.target.value })
              }
              required
              step="0.01"
              type="number"
              value={form.distanceKm}
            />
          </label>
          <label className="text-sm font-medium text-slate-200">
            Duration (minutes)
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              min="0.1"
              onChange={(event) =>
                setForm({ ...form, durationMinutes: event.target.value })
              }
              required
              step="0.1"
              type="number"
              value={form.durationMinutes}
            />
          </label>
          <label className="text-sm font-medium text-slate-200 sm:col-span-2">
            Notes
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              maxLength={4000}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              value={form.notes}
            />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              className="rounded-md bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Log run"}
            </button>
            {editingId ? (
              <button
                className="rounded-md border border-slate-700 px-5 py-3 font-semibold text-white"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Running history</h2>
        {error ? (
          <p className="mt-5 rounded-md border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-slate-700 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-white">
                Loading runs...
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Pulling your running history.
              </p>
            </div>
          ) : runs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 px-5 py-10 text-center text-slate-400">
              No runs logged yet.
            </p>
          ) : (
            runs.map((run) => (
              <article
                className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                key={run.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">
                      {Number(run.distance_km).toFixed(2)} km
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {new Date(run.started_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-emerald-300">
                      {pace(run)}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {duration(run.duration_seconds)}
                    </p>
                  </div>
                </div>
                {run.notes ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-slate-400">
                    {run.notes}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-4">
                  <button
                    className="text-sm font-semibold text-emerald-300"
                    onClick={() => beginEdit(run)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="text-sm font-semibold text-rose-300"
                    onClick={() => void removeRun(run)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        {total > 0 ? (
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              Showing {offset + 1}-{Math.min(offset + runs.length, total)} of{" "}
              {total}
            </p>
            <div className="flex gap-3">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                disabled={offset === 0 || isLoading}
                onClick={() => {
                  setIsLoading(true);
                  setOffset(Math.max(0, offset - pageSize));
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                disabled={offset + pageSize >= total || isLoading}
                onClick={() => {
                  setIsLoading(true);
                  setOffset(offset + pageSize);
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
