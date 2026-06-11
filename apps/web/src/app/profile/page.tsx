"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { signOut } from "@/features/auth/api";
import { getProfile, updateProfile } from "@/features/profile/api";
import type { Profile, SupportedLocale } from "@/features/profile/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [locale, setLocale] = useState<SupportedLocale>("en-US");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((loadedProfile) => {
        setProfile(loadedProfile);
        setDisplayName(loadedProfile.display_name ?? "");
        setTimezone(loadedProfile.timezone);
        setLocale(loadedProfile.locale);
      })
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof Error &&
          caughtError.message === "Authentication required"
        ) {
          window.location.assign("/login");
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load your profile.",
        );
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const updatedProfile = await updateProfile({
        display_name: displayName,
        timezone,
        locale,
      });
      setProfile(updatedProfile);
      setMessage("Profile updated.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.assign("/");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12 sm:px-10">
      <header className="flex items-center justify-between gap-4">
        <Link
          className="font-semibold text-emerald-300 hover:text-emerald-200"
          href="/"
        >
          Discipline App
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            href="/gym"
          >
            Gym
          </Link>
          <Link
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            href="/tasks"
          >
            Tasks
          </Link>
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-12 rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-emerald-950/30 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Protected profile
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          Your foundation
        </h1>
        <p className="mt-3 text-slate-400">
          This profile is loaded from FastAPI after it validates your Supabase
          access token.
        </p>

        {profile ? (
          <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            Signed in as{" "}
            <span className="font-semibold text-white">
              {profile.email ?? profile.user_id}
            </span>
          </p>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            Display name
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should Discipline App address you?"
              type="text"
              value={displayName}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Timezone
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              maxLength={64}
              onChange={(event) => setTimezone(event.target.value)}
              required
              type="text"
              value={timezone}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Preferred language
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              onChange={(event) =>
                setLocale(event.target.value as SupportedLocale)
              }
              value={locale}
            >
              <option value="en-US">English</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          ) : null}

          <button
            className="rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || !profile}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
