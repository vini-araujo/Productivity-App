"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import {
  deleteJournalEntry,
  getTodayEntry,
  listJournalEntries,
  saveTodayEntry,
  updateJournalEntry,
} from "@/features/journal/api";
import type { JournalEntry } from "@/features/journal/types";

type JournalView = "today" | "history" | "entry";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type Draft = { title: string; content: string; entryId: string | null };

const pageSize = 12;

function localDateValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function displayDate(value: string, long = false): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: long ? "full" : "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function preview(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 150
    ? `${normalized.slice(0, 150).trimEnd()}...`
    : normalized;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Journal request failed.";
}

function serializeDraft(draft: Pick<Draft, "title" | "content">): string {
  return JSON.stringify({ title: draft.title, content: draft.content });
}

function redirectIfUnauthenticated(caughtError: unknown): boolean {
  if (
    caughtError instanceof Error &&
    caughtError.message === "Authentication required"
  ) {
    window.location.assign("/login");
    return true;
  }
  return false;
}

export default function JournalPage() {
  const [todayDate] = useState(localDateValue);
  const [view, setView] = useState<JournalView>("today");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const lastSaved = useRef("");
  const latestDraft = useRef<Draft>({ title: "", content: "", entryId: null });
  const latestQueued = useRef("");
  const saveQueue = useRef(Promise.resolve(true));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getTodayEntry(todayDate)
      .then((loaded) => {
        if (!active) {
          return;
        }
        setEntry(loaded);
        setTitle(loaded?.title ?? "");
        setContent(loaded?.content ?? "");
        latestDraft.current = {
          title: loaded?.title ?? "",
          content: loaded?.content ?? "",
          entryId: null,
        };
        const loadedDraft = {
          title: loaded?.title ?? "",
          content: loaded?.content ?? "",
          entryId: null,
        };
        lastSaved.current = serializeDraft(loadedDraft);
        latestQueued.current = lastSaved.current;
        setSaveStatus(loaded ? "saved" : "idle");
      })
      .catch((caughtError: unknown) => {
        if (active && !redirectIfUnauthenticated(caughtError)) {
          setError(errorMessage(caughtError));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [todayDate]);

  const queueSave = useCallback(
    (draft: Draft): Promise<boolean> => {
      const serialized = serializeDraft(draft);
      latestQueued.current = serialized;
      setSaveStatus("saving");
      const queued = saveQueue.current.then(async () => {
        try {
          const saved = draft.entryId
            ? await updateJournalEntry(draft.entryId, {
                title: draft.title || null,
                content: draft.content,
              })
            : await saveTodayEntry(todayDate, {
                title: draft.title || null,
                content: draft.content,
              });
          lastSaved.current = serialized;
          if (mounted.current) {
            setEntry(saved);
            if (
              latestQueued.current === serialized &&
              serializeDraft(latestDraft.current) === serialized
            ) {
              setSaveStatus("saved");
              setError("");
            }
          }
          return true;
        } catch (caughtError) {
          if (mounted.current && latestQueued.current === serialized) {
            if (!redirectIfUnauthenticated(caughtError)) {
              setSaveStatus("error");
              setError(errorMessage(caughtError));
            }
          }
          return false;
        }
      });
      saveQueue.current = queued;
      return queued;
    },
    [todayDate],
  );

  async function flushDraft(): Promise<boolean> {
    const draft = latestDraft.current;
    const serialized = serializeDraft(draft);
    if (
      serialized === lastSaved.current &&
      serialized === latestQueued.current
    ) {
      return saveQueue.current;
    }
    if (!draft.content.trim()) {
      if (entry) {
        setSaveStatus("error");
        setError(
          "Journal entries cannot be blank. Use Delete this entry instead.",
        );
        return false;
      }
      return saveQueue.current;
    }
    return queueSave(draft);
  }

  async function leaveJournal(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    event.preventDefault();
    if (await flushDraft()) {
      window.location.assign(href);
    }
  }

  useEffect(() => {
    if (isLoading || !content.trim()) {
      return;
    }
    const draft = serializeDraft({ title, content });
    if (draft === lastSaved.current && draft === latestQueued.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      void queueSave({ title, content, entryId: editingEntryId });
    }, 750);
    return () => window.clearTimeout(timer);
  }, [content, editingEntryId, isLoading, queueSave, title]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      const draft = latestDraft.current;
      const serialized = serializeDraft(draft);
      if (draft.content.trim() && serialized !== lastSaved.current) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  useEffect(() => {
    if (view !== "history") {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      listJournalEntries(pageSize, offset, search)
        .then((result) => {
          if (active) {
            setHistory(result.items);
            setTotal(result.total);
          }
        })
        .catch((caughtError: unknown) => {
          if (active && !redirectIfUnauthenticated(caughtError)) {
            setError(errorMessage(caughtError));
          }
        })
        .finally(() => {
          if (active) {
            setIsHistoryLoading(false);
          }
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [offset, search, view]);

  async function openToday() {
    if (!(await flushDraft())) {
      return;
    }
    setView("today");
    setEditingEntryId(null);
    latestDraft.current = { title: "", content: "", entryId: null };
    setIsLoading(true);
    setError("");
    void getTodayEntry(todayDate)
      .then((loaded) => {
        setEntry(loaded);
        setTitle(loaded?.title ?? "");
        setContent(loaded?.content ?? "");
        latestDraft.current = {
          title: loaded?.title ?? "",
          content: loaded?.content ?? "",
          entryId: null,
        };
        const loadedDraft = {
          title: loaded?.title ?? "",
          content: loaded?.content ?? "",
          entryId: null,
        };
        lastSaved.current = serializeDraft(loadedDraft);
        latestQueued.current = lastSaved.current;
        setSaveStatus(loaded ? "saved" : "idle");
      })
      .catch((caughtError: unknown) => {
        if (!redirectIfUnauthenticated(caughtError)) {
          setError(errorMessage(caughtError));
        }
      })
      .finally(() => setIsLoading(false));
  }

  function openEntry(selected: JournalEntry) {
    setEntry(selected);
    setEditingEntryId(selected.id);
    setTitle(selected.title ?? "");
    setContent(selected.content);
    latestDraft.current = {
      title: selected.title ?? "",
      content: selected.content,
      entryId: selected.id,
    };
    lastSaved.current = serializeDraft({
      title: selected.title ?? "",
      content: selected.content,
    });
    latestQueued.current = lastSaved.current;
    setSaveStatus("saved");
    setView("entry");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openHistory() {
    if (!(await flushDraft())) {
      return;
    }
    setView("history");
    setOffset(0);
    setIsHistoryLoading(true);
    setError("");
  }

  async function removeEntry(selected: JournalEntry) {
    if (
      !window.confirm(
        `Delete the journal entry from ${displayDate(selected.entry_date)}?`,
      )
    ) {
      return;
    }
    setError("");
    try {
      await deleteJournalEntry(selected.id);
      if (selected.entry_date === todayDate) {
        setEntry(null);
        setEditingEntryId(null);
        setTitle("");
        setContent("");
        latestDraft.current = { title: "", content: "", entryId: null };
        lastSaved.current = serializeDraft({ title: "", content: "" });
        latestQueued.current = lastSaved.current;
        setSaveStatus("idle");
      }
      if (view === "entry") {
        setView("history");
      }
      setHistory((current) =>
        current.filter((item) => item.id !== selected.id),
      );
      setTotal((current) => Math.max(0, current - 1));
    } catch (caughtError) {
      if (!redirectIfUnauthenticated(caughtError)) {
        setError(errorMessage(caughtError));
      }
    }
  }

  const editorDate = view === "entry" && entry ? entry.entry_date : todayDate;
  const editorLabel = view === "entry" ? "Past entry" : "Today";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"
            href="/"
            onClick={(event) => void leaveJournal(event, "/")}
          >
            Discipline App
          </Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Journal
          </h1>
        </div>
        <Link
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
          href="/profile"
          onClick={(event) => void leaveJournal(event, "/profile")}
        >
          Profile
        </Link>
      </header>

      <section className="mt-7 rounded-2xl border border-slate-800 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          A quiet daily record
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Write what matters today. Your entry saves automatically after you
          pause, and History keeps previous days easy to find and revisit.
        </p>
      </section>

      <nav
        aria-label="Journal sections"
        className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-800 p-1"
      >
        <button
          aria-current={view === "today" ? "page" : undefined}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            view === "today"
              ? "bg-emerald-300 text-slate-950"
              : "text-slate-400 hover:text-white"
          }`}
          disabled={saveStatus === "saving"}
          onClick={() => void openToday()}
          type="button"
        >
          Today
        </button>
        <button
          aria-current={view === "history" ? "page" : undefined}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            view === "history"
              ? "bg-emerald-300 text-slate-950"
              : "text-slate-400 hover:text-white"
          }`}
          disabled={saveStatus === "saving"}
          onClick={() => void openHistory()}
          type="button"
        >
          History
        </button>
      </nav>

      {error ? (
        <p className="mt-5 rounded-xl border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {view === "history" ? (
        <section className="mt-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                History
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Previous entries
              </h2>
            </div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Search journal
              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-emerald-300 sm:w-72"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOffset(0);
                  setIsHistoryLoading(true);
                }}
                placeholder="Search title or writing"
                value={search}
              />
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {isHistoryLoading ? (
              <p className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">
                Loading journal history...
              </p>
            ) : history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">
                {search
                  ? "No entries match your search."
                  : "Your saved entries will appear here."}
              </p>
            ) : (
              history.map((item) => (
                <article
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
                  key={item.id}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => openEntry(item)}
                    type="button"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {displayDate(item.entry_date)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {item.title || "Untitled reflection"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {preview(item.content)}
                    </p>
                  </button>
                  <div className="mt-4 flex justify-end">
                    <button
                      className="text-xs font-semibold text-rose-300"
                      onClick={() => void removeEntry(item)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {total > pageSize ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                disabled={offset === 0}
                onClick={() => {
                  setIsHistoryLoading(true);
                  setOffset(Math.max(0, offset - pageSize));
                }}
                type="button"
              >
                Newer
              </button>
              <p className="text-xs text-slate-500">
                {offset + 1}-{Math.min(offset + pageSize, total)} of {total}
              </p>
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                disabled={offset + pageSize >= total}
                onClick={() => {
                  setIsHistoryLoading(true);
                  setOffset(offset + pageSize);
                }}
                type="button"
              >
                Older
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {editorLabel}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                {displayDate(editorDate, true)}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  saveStatus === "error"
                    ? "border-rose-900 text-rose-300"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "error"
                      ? "Not saved"
                      : "Start writing"}
              </span>
              {view === "entry" ? (
                <button
                  className="text-xs font-semibold text-slate-400 hover:text-white disabled:cursor-wait disabled:opacity-50"
                  disabled={saveStatus === "saving"}
                  onClick={() => void openHistory()}
                  type="button"
                >
                  Back to History
                </button>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <p className="mt-8 text-sm text-slate-400">Opening today...</p>
          ) : (
            <>
              <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Optional title
                <input
                  className="mt-2 w-full border-x-0 border-b border-t-0 border-slate-800 bg-transparent px-0 py-3 text-2xl font-semibold text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                  maxLength={200}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setTitle(nextTitle);
                    latestDraft.current = {
                      title: nextTitle,
                      content,
                      entryId: editingEntryId,
                    };
                    if (content.trim()) {
                      setSaveStatus("saving");
                    }
                  }}
                  placeholder="Give today a name"
                  value={title}
                />
              </label>
              <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                How was your day?
                <textarea
                  className="mt-3 min-h-[24rem] w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                  maxLength={50_000}
                  onChange={(event) => {
                    const nextContent = event.target.value;
                    setContent(nextContent);
                    latestDraft.current = {
                      title,
                      content: nextContent,
                      entryId: editingEntryId,
                    };
                    if (!nextContent.trim()) {
                      if (entry) {
                        setSaveStatus("error");
                        setError(
                          "Journal entries cannot be blank. Use Delete this entry instead.",
                        );
                      } else {
                        setSaveStatus("idle");
                        setError("");
                      }
                    } else {
                      setSaveStatus("saving");
                    }
                  }}
                  placeholder="Write without overthinking it..."
                  value={content}
                />
              </label>
              <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-500">
                <span>Autosaves after you pause.</span>
                <span>{content.length.toLocaleString()} characters</span>
              </div>
              {entry ? (
                <button
                  className="mt-6 text-sm font-semibold text-rose-300 disabled:cursor-wait disabled:opacity-50"
                  disabled={saveStatus === "saving"}
                  onClick={() => void removeEntry(entry)}
                  type="button"
                >
                  Delete this entry
                </button>
              ) : null}
            </>
          )}
        </section>
      )}
    </main>
  );
}
