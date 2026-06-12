"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { FeatureTabs } from "@/components/navigation/feature-tabs";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "@/features/tasks/api";
import type { Task, TaskFilter, TaskPriority } from "@/features/tasks/types";

const emptyForm = {
  title: "",
  description: "",
  dueAt: "",
  priority: "medium" as TaskPriority,
};
const pageSize = 20;

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const offsetInMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetInMilliseconds)
    .toISOString()
    .slice(0, 16);
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const loadGeneration = useRef(0);

  async function loadTasks() {
    const generation = ++loadGeneration.current;
    setError("");
    try {
      const result = await listTasks(filter, pageSize, offset);
      if (generation === loadGeneration.current) {
        setTasks(result.items);
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load tasks.",
      );
    } finally {
      if (generation === loadGeneration.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    const generation = ++loadGeneration.current;
    listTasks(filter, pageSize, offset)
      .then((result) => {
        if (active && generation === loadGeneration.current) {
          setTasks(result.items);
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
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load tasks.",
        );
      })
      .finally(() => {
        if (active && generation === loadGeneration.current) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filter, offset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const data = {
      title: form.title,
      description: form.description || null,
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      priority: form.priority,
    };

    try {
      const wasEditing = editingId !== null;
      if (wasEditing) {
        await updateTask(editingId, data);
      } else {
        await createTask(data);
      }
      setForm(emptyForm);
      setEditingId(null);
      if (!wasEditing && offset > 0) {
        setIsLoading(true);
        setOffset(0);
      } else {
        await loadTasks();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save task.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function beginEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      dueAt: task.due_at ? toLocalDateTimeInput(task.due_at) : "",
      priority: task.priority,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleTask(task: Task) {
    try {
      await updateTask(task.id, { completed: task.completed_at === null });
      if (filter !== "all" && tasks.length === 1 && offset > 0) {
        setIsLoading(true);
        setOffset(Math.max(0, offset - pageSize));
      } else {
        await loadTasks();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update task.",
      );
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }
    try {
      await deleteTask(task.id);
      if (tasks.length === 1 && offset > 0) {
        setIsLoading(true);
        setOffset(Math.max(0, offset - pageSize));
      } else {
        await loadTasks();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete task.",
      );
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-10 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
            href="/"
          >
            Discipline App
          </Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Tasks
          </h1>
        </div>
        <Link
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
          href="/profile"
        >
          Profile
        </Link>
      </header>

      <FeatureTabs current="tasks" />

      <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-white">
          {editingId ? "Edit task" : "Add a task"}
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <label className="block text-sm font-medium text-slate-200 md:col-span-2">
            Title
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              maxLength={200}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              required
              value={form.title}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200 md:col-span-2">
            Description
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              maxLength={4000}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              value={form.description}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Due date
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              onChange={(event) =>
                setForm({ ...form, dueAt: event.target.value })
              }
              type="datetime-local"
              value={form.dueAt}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Priority
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              onChange={(event) =>
                setForm({
                  ...form,
                  priority: event.target.value as TaskPriority,
                })
              }
              value={form.priority}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Add task"}
            </button>
            {editingId ? (
              <button
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Your tasks</h2>
          <div className="flex rounded-full border border-slate-800 bg-slate-900 p-1">
            {(["open", "all", "completed"] as TaskFilter[]).map((option) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                  filter === option
                    ? "bg-emerald-300 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                key={option}
                onClick={() => {
                  if (filter !== option || offset !== 0) {
                    setIsLoading(true);
                    setOffset(0);
                    setFilter(option);
                  }
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-xl border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <p className="text-slate-400">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-slate-400">
              No tasks in this view.
            </p>
          ) : (
            tasks.map((task) => (
              <article
                className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5"
                key={task.id}
              >
                <div className="flex items-start gap-4">
                  <button
                    aria-label={
                      task.completed_at ? "Reopen task" : "Complete task"
                    }
                    className={`mt-1 h-6 w-6 shrink-0 rounded-full border-2 transition ${
                      task.completed_at
                        ? "border-emerald-300 bg-emerald-300"
                        : "border-slate-600 hover:border-emerald-300"
                    }`}
                    onClick={() => void toggleTask(task)}
                    type="button"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3
                        className={`font-semibold ${
                          task.completed_at
                            ? "text-slate-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {task.title}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          task.priority === "high"
                            ? "bg-rose-400/10 text-rose-300"
                            : task.priority === "low"
                              ? "bg-sky-400/10 text-sky-300"
                              : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                        {task.description}
                      </p>
                    ) : null}
                    {task.due_at ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Due {new Date(task.due_at).toLocaleString()}
                      </p>
                    ) : null}
                    <div className="mt-4 flex gap-4">
                      <button
                        className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                        onClick={() => beginEdit(task)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm font-semibold text-rose-300 hover:text-rose-200"
                        onClick={() => void removeTask(task)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        {total > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              Showing {offset + 1}-{Math.min(offset + tasks.length, total)} of{" "}
              {total}
            </p>
            <div className="flex gap-3">
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
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
