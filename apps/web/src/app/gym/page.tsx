"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  createExercise,
  createPlan,
  deleteWorkout,
  listExercises,
  listPlans,
  listSessions,
  startWorkout,
  updatePlan,
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
import { customerError } from "@/lib/errors";

type DraftExercise = {
  exerciseId?: string;
  name: string;
  targetSets: number;
};

type SplitDay = {
  name: string;
  exercises: DraftExercise[];
};

type DraggedExercise = {
  dayIndex: number;
  exerciseIndex: number;
};

const setupDayNames = ["Upper Day", "Lower Day"];

const defaultSplitDays = (): SplitDay[] => [
  { name: "Upper Day", exercises: [] },
  { name: "Lower Day", exercises: [] },
];

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizedKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

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
  return customerError(error, "Could not update your workouts.");
}

function formatLogDate(session: WorkoutSession): string {
  return new Date(session.started_at).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function draftFromPlan(plan: WorkoutPlan | undefined): SplitDay[] {
  if (!plan) {
    return defaultSplitDays();
  }

  const trainingDays = plan.days.filter((day) => !day.is_rest_day);
  if (trainingDays.length === 0) {
    return defaultSplitDays();
  }

  return trainingDays.map((day) => ({
    name: day.name,
    exercises: day.exercises.map((exercise) => ({
      exerciseId: exercise.exercise_id,
      name: exercise.exercise_name,
      targetSets: exercise.target_sets,
    })),
  }));
}

function daySummary(day: WorkoutPlan["days"][number]): string {
  const exerciseNames = day.exercises
    .slice(0, 3)
    .map((exercise) => exercise.exercise_name)
    .join(", ");
  if (!exerciseNames) {
    return "No exercises saved";
  }
  return day.exercises.length > 3 ? `${exerciseNames}...` : exerciseNames;
}

export default function GymPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSetupDay, setSelectedSetupDay] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState("");
  const [setupName, setSetupName] = useState("My Workout Plan");
  const [splitDays, setSplitDays] = useState<SplitDay[]>(defaultSplitDays);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [draggedExercise, setDraggedExercise] =
    useState<DraggedExercise | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const pendingSetSaves = useRef(new Set<Promise<boolean>>());
  const failedSetSaveIds = useRef(new Set<string>());

  const activeSession = sessions.find((session) => !session.completed_at);
  const history = sessions.filter((session) => session.completed_at);
  const editableSession =
    activeSession ??
    sessions.find((session) => session.id === selectedLogId) ??
    null;
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => !plan.is_builtin) ??
    plans[0];
  const trainingDays =
    selectedPlan?.days.filter((day) => !day.is_rest_day) ?? [];
  const currentSetupDay = splitDays[selectedSetupDay] ?? splitDays[0];
  const shouldShowSetup = isSetupOpen || trainingDays.length === 0;
  const loggedSetCount =
    editableSession?.sets.filter(
      (set) => set.weight !== null || set.repetitions !== null,
    ).length ?? 0;
  const totalSetCount = editableSession?.sets.length ?? 0;
  const hasDuplicateExercises = splitDays.some((day) => {
    const names = day.exercises.map((exercise) => normalizedKey(exercise.name));
    return names.filter(Boolean).length !== new Set(names.filter(Boolean)).size;
  });
  const canSaveSetup =
    setupName.trim().length > 0 &&
    splitDays.length > 0 &&
    splitDays.length <= 14 &&
    splitDays.every(
      (day) =>
        day.name.trim().length > 0 &&
        day.exercises.length > 0 &&
        day.exercises.every(
          (exercise) =>
            normalizeName(exercise.name).length > 0 &&
            Number.isFinite(exercise.targetSets) &&
            exercise.targetSets >= 1,
        ),
    ) &&
    !hasDuplicateExercises;

  useEffect(() => {
    let active = true;
    Promise.all([listExercises(), listPlans(), listSessions()])
      .then(([loadedExercises, loadedPlans, loadedSessions]) => {
        if (!active) {
          return;
        }
        const preferredPlan =
          loadedPlans.find((plan) => !plan.is_builtin) ?? loadedPlans[0];

        setExercises(loadedExercises);
        setPlans(loadedPlans);
        setSessions(loadedSessions);
        setSelectedPlanId(preferredPlan?.id ?? "");
        setSplitDays(draftFromPlan(preferredPlan));
        setSetupName(
          preferredPlan?.is_builtin
            ? "My Workout Plan"
            : (preferredPlan?.name ?? "My Workout Plan"),
        );
        setIsSetupOpen(!preferredPlan);
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

  function selectPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    setSelectedPlanId(planId);
    setSplitDays(draftFromPlan(plan));
    setSetupName(
      plan?.is_builtin ? "My Workout Plan" : (plan?.name ?? "My Workout Plan"),
    );
    setSelectedSetupDay(0);
    setError("");
    setMessage("");
  }

  async function handleCreateLog(plan: WorkoutPlan | undefined, dayId: string) {
    if (!plan) {
      return;
    }
    setError("");
    setMessage("");
    setIsStarting(true);
    failedSetSaveIds.current.clear();
    try {
      const started = await startWorkout(plan.id, dayId);
      const completed = await updateWorkout(started.id, { completed: true });
      setSessions((current) => [completed, ...current]);
      setSelectedLogId(completed.id);
      setMessage(`${completed.name} log created.`);
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

  async function saveLog(session: WorkoutSession) {
    setError("");
    setIsSavingLog(true);
    try {
      const saveResults = await Promise.all([...pendingSetSaves.current]);
      if (
        saveResults.some((wasSaved) => !wasSaved) ||
        failedSetSaveIds.current.size > 0
      ) {
        setError("Some sets could not be saved. Try those fields again.");
        return;
      }
      const completed = session.completed_at
        ? session
        : await updateWorkout(session.id, { completed: true });
      setSessions((current) =>
        current.map((item) => (item.id === completed.id ? completed : item)),
      );
      setSelectedLogId(completed.id);
      setMessage("Log saved.");
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsSavingLog(false);
    }
  }

  async function removeWorkout(session: WorkoutSession) {
    const prompt = `Delete the ${session.name} log from ${formatLogDate(session)}?`;
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
      if (selectedLogId === session.id) {
        setSelectedLogId("");
      }
      setMessage("Workout log deleted.");
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  function addExercise(dayIndex: number) {
    setSplitDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: [...day.exercises, { name: "", targetSets: 3 }],
            }
          : day,
      ),
    );
  }

  function addDay() {
    setSplitDays((current) => {
      const nextDay: SplitDay = {
        name: `Day ${current.length + 1}`,
        exercises: [],
      };
      setSelectedSetupDay(current.length);
      return [...current, nextDay];
    });
  }

  function removeDay(dayIndex: number) {
    setSplitDays((current) => {
      if (current.length <= 1) {
        return current;
      }
      const nextDays = current.filter((_, index) => index !== dayIndex);
      setSelectedSetupDay((currentIndex) =>
        Math.min(currentIndex, nextDays.length - 1),
      );
      return nextDays;
    });
  }

  function updateSplitDay(dayIndex: number, changes: Partial<SplitDay>) {
    setSplitDays((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, ...changes } : day,
      ),
    );
  }

  function updateExercise(
    dayIndex: number,
    exerciseIndex: number,
    changes: Partial<DraftExercise>,
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

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    updateSplitDay(dayIndex, {
      exercises:
        splitDays[dayIndex]?.exercises.filter(
          (_, index) => index !== exerciseIndex,
        ) ?? [],
    });
  }

  function moveExerciseTo(
    dayIndex: number,
    fromIndex: number,
    toIndex: number,
  ) {
    if (fromIndex === toIndex) {
      return;
    }
    setSplitDays((current) =>
      current.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }
        const nextExercises = [...day.exercises];
        const [exercise] = nextExercises.splice(fromIndex, 1);
        nextExercises.splice(toIndex, 0, exercise);
        return { ...day, exercises: nextExercises };
      }),
    );
  }

  async function getExerciseForName(
    rawName: string,
    availableExercises: Exercise[],
    createdExercises: Map<string, Exercise>,
  ): Promise<Exercise> {
    const name = normalizeName(rawName);
    const key = normalizedKey(name);
    const existing =
      createdExercises.get(key) ??
      availableExercises.find(
        (exercise) => normalizedKey(exercise.name) === key,
      );
    if (existing) {
      return existing;
    }
    const created = await createExercise({ name });
    createdExercises.set(key, created);
    return created;
  }

  async function saveWorkoutSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveSetup) {
      return;
    }

    setError("");
    setMessage("");
    setIsSavingPlan(true);
    try {
      const createdExercises = new Map<string, Exercise>();
      const knownExercises = [...exercises];
      const days: PlanCreate["days"] = [];

      for (const day of splitDays) {
        const dayExercises = [];
        for (const draftExercise of day.exercises) {
          const exercise = draftExercise.exerciseId
            ? (knownExercises.find(
                (item) => item.id === draftExercise.exerciseId,
              ) ??
              (await getExerciseForName(
                draftExercise.name,
                knownExercises,
                createdExercises,
              )))
            : await getExerciseForName(
                draftExercise.name,
                knownExercises,
                createdExercises,
              );
          if (!knownExercises.some((item) => item.id === exercise.id)) {
            knownExercises.push(exercise);
          }
          dayExercises.push({
            exercise_id: exercise.id,
            target_sets: draftExercise.targetSets,
            target_to_failure: false,
          });
        }

        days.push({
          name: normalizeName(day.name),
          is_rest_day: false,
          exercises: dayExercises,
        });
      }

      const data: PlanCreate = {
        name: normalizeName(setupName),
        description: "Personal workout plan.",
        days,
      };
      const selectedUserPlan = plans.find(
        (plan) => plan.id === selectedPlanId && !plan.is_builtin,
      );
      const saved = selectedUserPlan
        ? await updatePlan(selectedUserPlan.id, data)
        : await createPlan(data);

      setExercises(knownExercises);
      setPlans((current) => {
        if (current.some((plan) => plan.id === saved.id)) {
          return current.map((plan) => (plan.id === saved.id ? saved : plan));
        }
        return [...current, saved];
      });
      setSelectedPlanId(saved.id);
      setSplitDays(draftFromPlan(saved));
      setSetupName(saved.name);
      setSelectedSetupDay(0);
      setIsSetupOpen(false);
      setMessage(`${saved.name} saved.`);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsSavingPlan(false);
    }
  }

  return (
    <AppShell
      current="gym"
      description="Set your days, then log weight and reps."
      title="Gym"
    >
      {error ? (
        <p className="mt-6 rounded-md border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-50 shadow-lg shadow-rose-950/20">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-6 rounded-md border border-sky-300/40 bg-sky-500/15 px-4 py-3 text-sm text-sky-50 shadow-lg shadow-sky-950/20">
          {message}
        </p>
      ) : null}

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="ordyn-glass-soft order-2 rounded-lg p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">
                Setup
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Workout Plan
              </h2>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {plans.length > 0 ? (
                <label className="min-w-[12rem] text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Saved plan
                  <select
                    className="mt-2 w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none transition focus:border-sky-300"
                    onChange={(event) => selectPlan(event.target.value)}
                    value={selectedPlan?.id ?? ""}
                  >
                    {plans.map((plan) => (
                      <option
                        className="text-slate-950"
                        key={plan.id}
                        value={plan.id}
                      >
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/60"
                onClick={() => setIsSetupOpen((current) => !current)}
                type="button"
              >
                {shouldShowSetup ? "Hide setup" : "Edit setup"}
                <ChevronDown
                  aria-hidden="true"
                  className={`transition ${shouldShowSetup ? "rotate-180" : ""}`}
                  size={16}
                />
              </button>
            </div>
          </div>

          {shouldShowSetup ? (
            <form className="mt-5 space-y-4" onSubmit={saveWorkoutSetup}>
              <label className="block text-sm font-semibold text-slate-100">
                Plan name
                <input
                  className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white/10 px-3 text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  onChange={(event) => setSetupName(event.target.value)}
                  placeholder="My Workout Plan"
                  value={setupName}
                />
              </label>

              <div
                aria-label="Workout days"
                className="flex flex-wrap gap-1 rounded-lg border border-white/12 bg-white/[0.06] p-1"
                role="tablist"
              >
                {splitDays.map((day, index) => (
                  <button
                    aria-selected={selectedSetupDay === index}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                      selectedSetupDay === index
                        ? "bg-white text-slate-950"
                        : "text-slate-300 hover:text-white"
                    }`}
                    key={index}
                    onClick={() => setSelectedSetupDay(index)}
                    role="tab"
                    type="button"
                  >
                    {day.name || setupDayNames[index] || `Day ${index + 1}`}
                  </button>
                ))}
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={splitDays.length >= 14}
                onClick={addDay}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                Add day
              </button>

              <article className="rounded-lg border border-white/12 bg-white/[0.07] p-4 shadow-xl shadow-black/10">
                <div className="flex gap-2">
                  <input
                    aria-label="Workout day name"
                    className="h-10 min-w-0 flex-1 rounded-md border border-white/12 bg-white/10 px-3 text-base font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                    onChange={(event) =>
                      updateSplitDay(selectedSetupDay, {
                        name: event.target.value,
                      })
                    }
                    placeholder={
                      setupDayNames[selectedSetupDay] ?? "Workout day"
                    }
                    value={currentSetupDay?.name ?? ""}
                  />
                  {splitDays.length > 1 ? (
                    <button
                      aria-label={`Remove ${currentSetupDay?.name || "day"}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/12 text-slate-300 transition hover:border-rose-300/60 hover:text-rose-100"
                      onClick={() => removeDay(selectedSetupDay)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {currentSetupDay?.exercises.length ? (
                    currentSetupDay.exercises.map((exercise, exerciseIndex) => (
                      <div
                        className={`grid grid-cols-[2.5rem_1fr_4.5rem_2.5rem] gap-2 rounded-md transition ${
                          draggedExercise?.dayIndex === selectedSetupDay &&
                          draggedExercise.exerciseIndex === exerciseIndex
                            ? "bg-sky-300/10"
                            : ""
                        }`}
                        draggable
                        key={`${selectedSetupDay}-${exerciseIndex}`}
                        onDragEnd={() => setDraggedExercise(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedExercise({
                            dayIndex: selectedSetupDay,
                            exerciseIndex,
                          });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (
                            draggedExercise &&
                            draggedExercise.dayIndex === selectedSetupDay
                          ) {
                            moveExerciseTo(
                              selectedSetupDay,
                              draggedExercise.exerciseIndex,
                              exerciseIndex,
                            );
                          }
                          setDraggedExercise(null);
                        }}
                      >
                        <button
                          aria-label={`Drag ${exercise.name || "exercise"} to reorder`}
                          className="inline-flex h-10 cursor-grab items-center justify-center rounded-md border border-white/12 text-slate-300 active:cursor-grabbing"
                          title="Drag to reorder"
                          type="button"
                        >
                          <GripVertical aria-hidden="true" size={17} />
                        </button>
                        <input
                          aria-label={`Exercise ${exerciseIndex + 1} name`}
                          className="min-w-0 rounded-md border border-white/12 bg-white/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                          list="gym-exercises"
                          onChange={(event) =>
                            updateExercise(selectedSetupDay, exerciseIndex, {
                              exerciseId: undefined,
                              name: event.target.value,
                            })
                          }
                          placeholder="Exercise name"
                          value={exercise.name}
                        />
                        <input
                          aria-label={`${exercise.name || "Exercise"} sets`}
                          className="rounded-md border border-white/12 bg-white/10 px-2 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-sky-300"
                          min={1}
                          onChange={(event) =>
                            updateExercise(selectedSetupDay, exerciseIndex, {
                              targetSets: Number(event.target.value),
                            })
                          }
                          type="number"
                          value={exercise.targetSets}
                        />
                        <button
                          aria-label={`Remove ${exercise.name || "exercise"}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/12 text-slate-300 transition hover:border-rose-300/60 hover:text-rose-100"
                          onClick={() =>
                            removeExercise(selectedSetupDay, exerciseIndex)
                          }
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-300">
                      Add the first exercise for this day.
                    </p>
                  )}
                </div>

                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-300/60"
                  onClick={() => addExercise(selectedSetupDay)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                  Add exercise
                </button>
              </article>

              <datalist id="gym-exercises">
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.name} />
                ))}
              </datalist>

              {hasDuplicateExercises ? (
                <p className="text-xs text-amber-100">
                  A day cannot contain the same exercise twice.
                </p>
              ) : null}
              {splitDays.length >= 14 ? (
                <p className="text-xs text-slate-300">
                  Workout plans can contain up to 14 days.
                </p>
              ) : null}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canSaveSetup || isSavingPlan}
                type="submit"
              >
                <Save aria-hidden="true" size={16} />
                {isSavingPlan ? "Saving setup..." : "Save setup"}
              </button>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <span className="rounded-md border border-white/12 px-3 py-1.5">
                {trainingDays.length} days
              </span>
              <span className="rounded-md border border-white/12 px-3 py-1.5">
                {trainingDays.reduce(
                  (count, day) => count + day.exercises.length,
                  0,
                )}{" "}
                exercises
              </span>
            </div>
          )}
        </section>

        <section className="ordyn-glass order-1 rounded-lg p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                Log
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {editableSession ? editableSession.name : "Choose a day"}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editableSession && !activeSession ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-300/60"
                  onClick={() => setSelectedLogId("")}
                  type="button"
                >
                  <X aria-hidden="true" size={16} />
                  Close
                </button>
              ) : null}
              {editableSession ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/60"
                  onClick={() => void removeWorkout(editableSession)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-300">Loading gym...</p>
          ) : editableSession ? (
            <>
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  <span>
                    {loggedSetCount} of {totalSetCount} sets
                  </span>
                  <span>{formatLogDate(editableSession)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-emerald-300 transition-all"
                    style={{
                      width: `${
                        totalSetCount
                          ? (loggedSetCount / totalSetCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {groupSets(editableSession.sets).map(([exerciseName, sets]) => (
                  <article
                    className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.07]"
                    key={exerciseName}
                  >
                    <h3 className="border-b border-white/10 px-4 py-3 text-base font-semibold text-white">
                      {exerciseName}
                    </h3>
                    <div className="divide-y divide-white/10">
                      {sets.map((set) => (
                        <div
                          className="grid grid-cols-[2.5rem_1fr_1fr] items-end gap-3 px-3 py-4 sm:px-4"
                          key={set.id}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-sm font-semibold text-slate-200">
                            {set.position + 1}
                          </span>
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Weight
                            <input
                              className="mt-1.5 h-12 w-full rounded-md border border-white/12 bg-white/10 px-3 text-center text-lg font-semibold text-white outline-none transition focus:border-emerald-300"
                              disabled={isSavingLog}
                              inputMode="decimal"
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
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Reps
                            <input
                              className="mt-1.5 h-12 w-full rounded-md border border-white/12 bg-white/10 px-3 text-center text-lg font-semibold text-white outline-none transition focus:border-emerald-300"
                              disabled={isSavingLog}
                              inputMode="numeric"
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
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                disabled={isSavingLog}
                onClick={() => void saveLog(editableSession)}
                type="button"
              >
                <Save aria-hidden="true" size={18} />
                {isSavingLog ? "Saving log..." : "Save log"}
              </button>
            </>
          ) : trainingDays.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-white/20 px-5 py-10 text-center text-sm text-slate-300">
              Add exercises and save your setup first.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {trainingDays.map((day) => (
                <button
                  className="group rounded-lg border border-white/12 bg-white/[0.08] px-5 py-5 text-left shadow-xl shadow-black/10 transition hover:border-emerald-300/60 hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-50"
                  disabled={isStarting || Boolean(activeSession)}
                  key={day.id}
                  onClick={() => void handleCreateLog(selectedPlan, day.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-2xl font-semibold text-white">
                      {day.name}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-300 text-slate-950 transition group-hover:translate-x-0.5">
                      <Play aria-hidden="true" fill="currentColor" size={16} />
                    </span>
                  </span>
                  <span className="mt-2 block text-sm text-slate-300">
                    {day.exercises.length} exercises
                  </span>
                  <span className="mt-4 block text-sm text-slate-400">
                    {daySummary(day)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="ordyn-glass-soft mt-6 rounded-lg p-5 sm:p-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                History
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Saved logs
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
              {history.length} saved
              <ChevronDown aria-hidden="true" size={16} />
            </span>
          </summary>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <p className="rounded-lg border border-dashed border-white/20 px-5 py-8 text-center text-sm text-slate-300">
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/20 px-5 py-8 text-center text-sm text-slate-300">
                Saved logs will appear here.
              </p>
            ) : (
              history.map((session) => {
                const recordedSets = session.sets.filter(
                  (set) => set.weight !== null || set.repetitions !== null,
                );
                return (
                  <article
                    className={`overflow-hidden rounded-lg border bg-white/[0.06] transition ${
                      selectedLogId === session.id
                        ? "border-emerald-300/60"
                        : "border-white/12"
                    }`}
                    key={session.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {session.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatLogDate(session)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                        <span className="rounded-md border border-white/12 px-3 py-1.5">
                          {recordedSets.length} sets
                        </span>
                        <span className="rounded-md border border-white/12 px-3 py-1.5">
                          {groupSets(session.sets).length} exercises
                        </span>
                        <button
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
                          onClick={() => setSelectedLogId(session.id)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          aria-label={`Delete ${session.name} log`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/12 text-rose-100 transition hover:border-rose-300/60"
                          onClick={() => void removeWorkout(session)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </details>
      </section>
    </AppShell>
  );
}
