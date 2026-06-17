export type CalendarItemKind = "task" | "workout" | "run" | "journal";

export type CalendarItem = {
  kind: CalendarItemKind;
  source_id: string;
  title: string;
  date: string;
  timestamp: string | null;
  status: string;
  detail: string | null;
  href: string;
};

export type CalendarSnapshot = {
  start_date: string;
  end_date: string;
  items: CalendarItem[];
};
