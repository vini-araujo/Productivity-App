export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskList = {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
};

export type TaskCreate = {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
};

export type TaskUpdate = Partial<TaskCreate> & {
  completed?: boolean;
};

export type TaskFilter = "all" | "open" | "completed";
