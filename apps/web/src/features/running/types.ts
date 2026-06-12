export type Run = {
  id: string;
  started_at: string;
  distance_km: string;
  duration_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RunList = {
  items: Run[];
  total: number;
  limit: number;
  offset: number;
};

export type RunWrite = {
  started_at: string;
  distance_km: number;
  duration_seconds: number;
  notes?: string | null;
};

export type RunUpdate = Partial<RunWrite>;
