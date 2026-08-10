"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { signIn, signUp } from "@/features/auth/api";
import { customerError } from "@/lib/errors";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";
  const fallbackError = isLogin
    ? "We could not sign you in. Check your email and password, then try again."
    : "We could not create your account. Please try again.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        window.location.assign("/dashboard");
        return;
      }

      const confirmationRequired = await signUp(email, password);
      if (confirmationRequired) {
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        window.location.assign("/profile");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message.toLowerCase() : "";
      setError(
        message.includes("invalid login credentials")
          ? "Email or password is incorrect."
          : customerError(caughtError, fallbackError),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10 sm:px-8">
      <section className="grid w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl shadow-black/10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-slate-800 bg-slate-950 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Link
            className="text-base font-semibold text-white hover:text-emerald-300"
            href="/"
          >
            Ordyn Life
          </Link>
          <h1 className="mt-8 text-3xl font-semibold text-white">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {isLogin
              ? "Open your private dashboard, calendar, training logs, and journal."
              : "Start with a private account, then build your daily system from the dashboard."}
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Private by default
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Calendar and dashboard in one place
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Built for daily check-ins
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <Link
            className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 lg:hidden"
            href="/"
          >
            Ordyn Life
          </Link>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-200">
              Email
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Password
              <input
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-md border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-md border border-emerald-900 bg-emerald-950 px-4 py-3 text-sm text-emerald-200">
                {message}
              </p>
            ) : null}

            <button
              className="w-full rounded-md bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Working..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isLogin ? "New to Ordyn Life?" : "Already have an account?"}{" "}
            <Link
              className="font-semibold text-emerald-300 hover:text-emerald-200"
              href={isLogin ? "/register" : "/login"}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
