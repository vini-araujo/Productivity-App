export type SupportedLocale = "en-US" | "pt-BR";

export type Profile = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  timezone: string;
  locale: SupportedLocale;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  display_name?: string | null;
  timezone?: string;
  locale?: SupportedLocale;
};
