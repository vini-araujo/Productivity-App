export type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  is_builtin: boolean;
};

export type PlanExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
  target_sets: number;
  target_to_failure: boolean;
};

export type PlanDay = {
  id: string;
  name: string;
  position: number;
  is_rest_day: boolean;
  exercises: PlanExercise[];
};

export type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  is_builtin: boolean;
  days: PlanDay[];
};

export type PlanCreate = {
  name: string;
  description?: string | null;
  days: {
    name: string;
    is_rest_day: boolean;
    exercises: {
      exercise_id: string;
      target_sets: number;
      target_to_failure: boolean;
    }[];
  }[];
};

export type WorkoutSet = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_position: number;
  position: number;
  weight: string | null;
  repetitions: number | null;
  target_to_failure: boolean;
  reached_failure: boolean;
  notes: string | null;
};

export type WorkoutSession = {
  id: string;
  workout_plan_id: string | null;
  workout_plan_day_id: string | null;
  name: string;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  sets: WorkoutSet[];
};
