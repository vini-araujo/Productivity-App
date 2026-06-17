"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { FeatureTabs } from "@/components/navigation/feature-tabs";
import {
  createPlan,
  deleteWorkout,
  listExercises,
  listPlans,
  listSessions,
  startWorkout,
  updateWorkout,
  updateWorkoutSet,
} from "@/features/workouts/api";
import type {
  Exercise,
  PlanCreate,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSet,
} from "@/features/workouts/types";

type GymView = "workout" | "history";

type SplitDay = {
  name: string;
  exercises: { exerciseId: string; targetSets: number }[];
};

function groupSets(sets: WorkoutSet[]): [string, WorkoutSet[]][] {
  const groups = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    const current = groups.get(set.exercise_name) ?? [];
    current.push(set);
    groups.set(set.exercise_name, current);
  }
  return [...groups.entries()];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Workout request failed.";
}

function formatDuration(session: WorkoutSession): string {
  if (!session.completed_at) {
    return "In progress";
  }
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(session.completed_at).getTime() -
        new Date(session.started_at).getTime()) /
        60_000,
    ),
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function GymPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showSplitBuilder, setShowSplitBuilder] = useState(false);
  const [splitName, setSplitName] = useState("");
  const [splitDays, setSplitDays] = useState<SplitDay[]>([
    { name: "Day 1", exercises: [] },
  ]);
  const [view, setView] = useState<GymView>("workout");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const pendingSetSaves = useRef(new Set<Promise<boolean>>());
  const failedSetSaveIds = useRef(new Set<string>());

  const activeSession = sessions.find((session) => !session.completed_at);
  const history = sessions.filter((session) => session.completed_at);
  const selectedPlan =
    plans.find((plan) => plan.id === activeSession?.workout_plan_id) ??
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => !plan.is_builtin) ??
    plans[0];
  const completedSetCount =
    activeSession?.sets.filter(
      (set) => set.weight !== null || set.repetitions !== null,
    ).length ?? 0;
  const totalSetCount = activeSession?.sets.length ?? 0;
  const canSaveSplit =
    splitName.trim().length > 0 &&
    splitDays.length > 0 &&
    splitDays.every(
      (day) => day.name.trim().length > 0 && day.exercises.length > 0,
    );

  useEffect(() => {
    let active = true;
    Promise.all([listExercises(), listPlans(), listSessions()])
      .then(([loadedExercises, loadedPlans, loadedSessions]) => {
        if (!active) {
          return;
        }
        setExercises(loadedExercises);
        setPlans(loadedPlans);
        setSessions(loadedSessions);
        setSelectedPlanId(
          loadedSessions.find((session) => !session.completed_at)
            ?.workout_plan_id ??
            loadedPlans.find((plan) => !plan.is_builtin)?.id ??
            loadedPlans[0]?.id ??
            "",
        );
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
        setError(errorMessage(caughtError));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleStart(plan: WorkoutPlan, dayId: string) {
    setError("");
    setMessage("");
    setIsStarting(true);
    failedSetSaveIds.current.clear();
    try {
      const started = await startWorkout(plan.id, dayId);
      setSessions((current) => [started, ...current]);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsStarting(false);
    }
  }

  function updateLocalSet(setId: string, changes: Partial<WorkoutSet>) {
    setSessions((current) =>
      current.map((session) => ({
        ...session,
        sets: session.sets.map((set) =>
          set.id === setId ? { ...set, ...changes } : set,
        ),
      })),
    );
  }

  async function saveSet(
    setId: string,
    changes: { weight?: number | null; repetitions?: number | null },
  ): Promise<boolean> {
    try {
      const updated = await updateWorkoutSet(setId, changes);
      updateLocalSet(setId, updated);
      failedSetSaveIds.current.delete(setId);
      return true;
    } catch (caughtError) {
      failedSetSaveIds.current.add(setId);
      setError(errorMessage(caughtError));
      return false;
    }
  }

  function queueSetSave(
    setId: string,
    changes: { weight?: number | null; repetitions?: number | null },
  ) {
    const pendingSave = saveSet(setId, changes);
    pendingSetSaves.current.add(pendingSave);
    void pendingSave.finally(() => pendingSetSaves.current.delete(pendingSave));
  }

  async function finishWorkout(session: WorkoutSession) {
    setError("");
    setIsFinishing(true);
    try {
      const saveResults = await Promise.all([...pendingSetSaves.current]);
      if (
        saveResults.some((wasSaved) => !wasSaved) ||
        failedSetSaveIds.current.size > 0
      ) {
        setError("Some sets could not be saved. Retry them before finishing.");
        return;
      }
      const completed = await updateWorkout(session.id, { completed: true });
      setSessions((current) =>
        current.map((item) => (item.id === completed.id ? completed : item)),
      );
      setMessage("Workout completed.");
      setView("history");
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsFinishing(false);
    }
  }

  async function removeWorkout(session: WorkoutSession, active: boolean) {
    const prompt = active
      ? "Cancel this workout? Entered sets will be permanently deleted."
      : `Delete the ${session.name} workout from ${new Date(
          session.started_at,
        ).toLocaleDateString()}?`;
    if (!window.confirm(prompt)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await deleteWorkout(session.id);
      setSessions((current) =>
        current.filter((item) => item.id !== session.id),
      );
      setMessage(active ? "Workout cancelled." : "Workout deleted.");
      if (active) {
        setView("workout");
      }
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  function addSplitExercise(dayIndex: number) {
    const firstExercise = exercises[0];
    if (!firstExercise) {
      return;
    }
    setSplitDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { exerciseId: firstExercise.id, targetSets: 2 },
              ],
            }
          : day,
      ),
    );
  }

  function updateSplitDay(dayIndex: number, changes: Partial<SplitDay>) {
    setSplitDays((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, ...changes } : day,
      ),
    );
  }

  function updateSplitExercise(
    dayIndex: number,
    exerciseIndex: number,
    changes: Partial<SplitDay["exercises"][number]>,
  ) {
    setSplitDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, itemIndex) =>
                itemIndex === exerciseIndex
                  ? { ...exercise, ...changes }
                  : exercise,
              ),
            }
          : day,
      ),
    );
  }

  async function savePersonalizedSplit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data: PlanCreate = {
      name: splitName,
      days: splitDays.map((day) => ({
        name: day.name,
        is_rest_day: false,
        exercises: day.exercises.map((exercise) => ({
          exercise_id: exercise.exerciseId,
          target_sets: exercise.targetSets,
          target_to_failure: false,
        })),
      })),
    };
    try {
      const created = await createPlan(data);
      setPlans((current) => [...current, created]);
      setSelectedPlanId(created.id);
      setShowSplitBuilder(false);
      setSplitName("");
      setSplitDays([{ name: "Day 1", exercises: [] }]);
      setMessage(`${created.name} is ready.`);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"
            href="/"
          >
            Ordyn Life
          </Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Gym
          </h1>
        </div>
        <Link
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
          href="/profile"
        >
          Profile
        </Link>
      </header>

      <FeatureTabs current="gym" />

      <section className="mt-7 rounded-2xl border border-slate-800 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          How it works
        </p>
        <ol className="mt-3 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
          <li>
            <span className="font-semibold text-white">1. Choose</span>
            <span className="mt-1 block">Start Upper or Lower.</span>
          </li>
          <li>
            <span className="font-semibold text-white">2. Log</span>
            <span className="mt-1 block">
              Enter weight and reps for each set.
            </span>
          </li>
          <li>
            <span className="font-semibold text-white">3. Finish</span>
            <span className="mt-1 block">
              Save it, then review it in History.
            </span>
          </li>
        </ol>
      </section>

      <nav
        aria-label="Gym sections"
        className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-800 p-1"
      >
        {(["workout", "history"] as GymView[]).map((option) => (
          <button
            aria-current={view === option ? "page" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              view === option
                ? "bg-emerald-300 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
            key={option}
            onClick={() => setView(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="mt-5 rounded-xl border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      {view === "workout" ? (
        <>
          <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Choose your workout
              </p>
              {!activeSession ? (
                <button
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-300"
                  onClick={() => setShowSplitBuilder((current) => !current)}
                  type="button"
                >
                  {showSplitBuilder ? "Close" : "+ Personalized split"}
                </button>
              ) : null}
            </div>
            {isLoading ? (
              <p className="mt-4 text-sm text-slate-400">Loading workout...</p>
            ) : plans.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No workout plans are available.
              </p>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedPlan?.name}
                </h2>

                {showSplitBuilder && !activeSession ? (
                  <form
                    className="mt-5 rounded-2xl border border-slate-800 p-4"
                    onSubmit={savePersonalizedSplit}
                  >
                    <label className="text-sm font-semibold text-white">
                      Split name
                      <input
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-300"
                        onChange={(event) => setSplitName(event.target.value)}
                        placeholder="Push / Pull / Legs"
                        required
                        value={splitName}
                      />
                    </label>

                    <div className="mt-4 space-y-4">
                      {splitDays.map((day, dayIndex) => (
                        <div
                          className="rounded-xl border border-slate-800 p-3"
                          key={dayIndex}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              aria-label={`Day ${dayIndex + 1} name`}
                              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-white outline-none focus:border-emerald-300"
                              onChange={(event) =>
                                updateSplitDay(dayIndex, {
                                  name: event.target.value,
                                })
                              }
                              required
                              value={day.name}
                            />
                            {splitDays.length > 1 ? (
                              <button
                                className="text-xs font-semibold text-rose-300"
                                onClick={() =>
                                  setSplitDays((current) =>
                                    current.filter(
                                      (_, index) => index !== dayIndex,
                                    ),
                                  )
                                }
                                type="button"
                              >
                                Remove day
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-3 space-y-2">
                            {day.exercises.map((exercise, exerciseIndex) => (
                              <div
                                className="grid grid-cols-[1fr_5rem_auto] gap-2"
                                key={exerciseIndex}
                              >
                                <select
                                  aria-label={`${day.name} exercise ${exerciseIndex + 1}`}
                                  className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                                  onChange={(event) =>
                                    updateSplitExercise(
                                      dayIndex,
                                      exerciseIndex,
                                      { exerciseId: event.target.value },
                                    )
                                  }
                                  value={exercise.exerciseId}
                                >
                                  {exercises.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  aria-label={`${day.name} exercise ${exerciseIndex + 1} sets`}
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm text-white"
                                  min={1}
                                  onChange={(event) =>
                                    updateSplitExercise(
                                      dayIndex,
                                      exerciseIndex,
                                      {
                                        targetSets: Number(event.target.value),
                                      },
                                    )
                                  }
                                  type="number"
                                  value={exercise.targetSets}
                                />
                                <button
                                  className="px-2 text-sm font-semibold text-rose-300"
                                  onClick={() =>
                                    updateSplitDay(dayIndex, {
                                      exercises: day.exercises.filter(
                                        (_, index) => index !== exerciseIndex,
                                      ),
                                    })
                                  }
                                  type="button"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            className="mt-3 text-sm font-semibold text-emerald-300"
                            onClick={() => addSplitExercise(dayIndex)}
                            type="button"
                          >
                            + Add exercise
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
                        onClick={() =>
                          setSplitDays((current) => [
                            ...current,
                            {
                              name: `Day ${current.length + 1}`,
                              exercises: [],
                            },
                          ])
                        }
                        type="button"
                      >
                        Add day
                      </button>
                      <button
                        className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canSaveSplit}
                        type="submit"
                      >
                        Save split
                      </button>
                    </div>
                    {!canSaveSplit ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Give the split a name and add at least one exercise to
                        every day.
                      </p>
                    ) : null}
                  </form>
                ) : activeSession ? (
                  <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-emerald-800 bg-emerald-950/30 px-4 py-4">
                    <div>
                      <p className="text-sm text-slate-400">
                        Currently training
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {activeSession.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Continue entering your sets below.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-950">
                      Active
                    </span>
                  </div>
                ) : (
                  <>
                    {plans.length > 1 ? (
                      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Workout plan
                        <select
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base font-semibold text-white outline-none focus:border-emerald-300"
                          onChange={(event) =>
                            setSelectedPlanId(event.target.value)
                          }
                          value={selectedPlan?.id ?? ""}
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {selectedPlan?.days
                        .filter((day) => !day.is_rest_day)
                        .map((day) => (
                          <button
                            className="group rounded-2xl border-2 border-slate-700 bg-slate-950 px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md disabled:opacity-50"
                            disabled={isStarting}
                            key={day.id}
                            onClick={() =>
                              void handleStart(selectedPlan, day.id)
                            }
                            type="button"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-xl font-semibold text-white">
                                {day.name}
                              </span>
                              <span
                                aria-hidden="true"
                                className="text-xl font-semibold text-emerald-300 transition group-hover:translate-x-1"
                              >
                                →
                              </span>
                            </span>
                            <span className="mt-1 block text-sm text-slate-400">
                              {day.exercises.length} exercises
                            </span>
                            <span className="mt-5 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950">
                              Choose {day.name}
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {activeSession ? (
            <section className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Log sets
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    {activeSession.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {completedSetCount} of {totalSetCount} sets entered
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold text-rose-300"
                  onClick={() => void removeWorkout(activeSession, true)}
                  type="button"
                >
                  Exit workout
                </button>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all"
                  style={{
                    width: `${totalSetCount ? (completedSetCount / totalSetCount) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="mt-5 space-y-4">
                {groupSets(activeSession.sets).map(([exerciseName, sets]) => (
                  <article
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
                    key={exerciseName}
                  >
                    <h3 className="border-b border-slate-800 px-4 py-4 text-lg font-semibold text-white">
                      {exerciseName}
                    </h3>
                    <div className="divide-y divide-slate-800">
                      {sets.map((set) => (
                        <div
                          className="grid grid-cols-[2.5rem_1fr_1fr] items-end gap-3 px-3 py-4 sm:px-4"
                          key={set.id}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-slate-300">
                            {set.position + 1}
                          </span>
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Weight
                            <input
                              className="mt-1.5 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-center text-lg font-semibold text-white outline-none focus:border-emerald-300"
                              inputMode="decimal"
                              disabled={isFinishing}
                              min={0}
                              onBlur={(event) =>
                                queueSetSave(set.id, {
                                  weight: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                              onChange={(event) =>
                                updateLocalSet(set.id, {
                                  weight: event.target.value || null,
                                })
                              }
                              type="number"
                              value={set.weight ?? ""}
                            />
                          </label>
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Reps
                            <input
                              className="mt-1.5 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-center text-lg font-semibold text-white outline-none focus:border-emerald-300"
                              inputMode="numeric"
                              disabled={isFinishing}
                              min={0}
                              onBlur={(event) =>
                                queueSetSave(set.id, {
                                  repetitions: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                              onChange={(event) =>
                                updateLocalSet(set.id, {
                                  repetitions: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                              type="number"
                              value={set.repetitions ?? ""}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <button
                className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                disabled={isFinishing}
                onClick={() => void finishWorkout(activeSession)}
                type="button"
              >
                {isFinishing ? "Saving workout..." : "Finish and save workout"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Finishing saves this session to History. Exiting deletes it.
              </p>
            </section>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">
              Select a workout above to start logging sets.
            </p>
          )}
        </>
      ) : (
        <section className="mt-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              History
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Past workouts
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Open a workout to review its exercises, weight, and repetitions.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">
                Complete a workout and it will appear here.
              </p>
            ) : (
              history.map((session) => {
                const recordedSets = session.sets.filter(
                  (set) => set.weight !== null || set.repetitions !== null,
                );
                return (
                  <details
                    className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                    key={session.id}
                  >
                    <summary className="cursor-pointer list-none px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {session.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {new Date(session.started_at).toLocaleDateString(
                              undefined,
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-300">
                          View
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span className="rounded-full border border-slate-800 px-3 py-1.5">
                          {formatDuration(session)}
                        </span>
                        <span className="rounded-full border border-slate-800 px-3 py-1.5">
                          {groupSets(session.sets).length} exercises
                        </span>
                        <span className="rounded-full border border-slate-800 px-3 py-1.5">
                          {recordedSets.length} sets recorded
                        </span>
                      </div>
                    </summary>

                    <div className="border-t border-slate-800 px-4 py-4 sm:px-5">
                      <div className="space-y-5">
                        {groupSets(session.sets).map(([exerciseName, sets]) => (
                          <div key={exerciseName}>
                            <h4 className="font-semibold text-white">
                              {exerciseName}
                            </h4>
                            <div className="mt-2 overflow-hidden rounded-xl border border-slate-800">
                              <div className="grid grid-cols-[3rem_1fr_1fr] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <span>Set</span>
                                <span>Weight</span>
                                <span>Reps</span>
                              </div>
                              <div className="divide-y divide-slate-800">
                                {sets.map((set) => (
                                  <div
                                    className="grid grid-cols-[3rem_1fr_1fr] px-3 py-3 text-sm text-slate-300"
                                    key={set.id}
                                  >
                                    <span>{set.position + 1}</span>
                                    <span>{set.weight ?? "-"}</span>
                                    <span>{set.repetitions ?? "-"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="mt-5 text-sm font-semibold text-rose-300"
                        onClick={() => void removeWorkout(session, false)}
                        type="button"
                      >
                        Delete workout
                      </button>
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </section>
      )}
    </main>
  );
}
