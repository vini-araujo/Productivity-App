export type DashboardTask = {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
};

export type DashboardWorkout = {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
};

export type DashboardSnapshot = {
  tasks: {
    open_count: number;
    next_tasks: DashboardTask[];
  };
  workouts: {
    active: DashboardWorkout | null;
    latest_completed: DashboardWorkout | null;
  };
  journal: {
    entry_id: string | null;
    entry_date: string;
    title: string | null;
    updated_at: string | null;
  };
};
