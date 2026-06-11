export type JournalEntry = {
  id: string;
  entry_date: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type JournalEntryList = {
  items: JournalEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type JournalEntryWrite = {
  title?: string | null;
  content: string;
};

export type JournalEntryUpdate = {
  title?: string | null;
  content?: string;
};
