"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { signOut } from "@/features/auth/api";
import { getProfile, updateProfile } from "@/features/profile/api";
import type { Profile, SupportedLocale } from "@/features/profile/types";
import { customerError } from "@/lib/errors";

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
        setError(customerError(caughtError, "Could not load your profile."));
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
      setError(customerError(caughtError, "Could not update your profile."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.assign("/");
  }

  return (
    <AppShell
      actions={
        <button
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-blue-300"
          onClick={handleSignOut}
          type="button"
        >
          Sign out
        </button>
      }
      current="profile"
      description="Keep your account details aligned with your daily workspace."
      title="Profile"
    >
      <section className="mx-auto mt-8 w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 sm:p-8">
        <p className="text-sm font-semibold uppercase text-blue-600">
          Account settings
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Your account
        </h1>
        <p className="mt-3 text-slate-500">
          Keep your daily workspace matched to your name, timezone, and
          language.
        </p>

        {profile ? (
          <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Signed in as{" "}
            <span className="font-semibold text-slate-950">
              {profile.email ?? "your account"}
            </span>
          </p>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should Ordyn Life address you?"
              type="text"
              value={displayName}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Timezone
            <input
              className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
              maxLength={64}
              onChange={(event) => setTimezone(event.target.value)}
              required
              type="text"
              value={timezone}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Preferred language
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
              onChange={(event) =>
                setLocale(event.target.value as SupportedLocale)
              }
              value={locale}
            >
              <option value="en-US">English</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </p>
          ) : null}

          <button
            className="rounded-md bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || !profile}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50"
            href="/calendar"
          >
            Calendar
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
