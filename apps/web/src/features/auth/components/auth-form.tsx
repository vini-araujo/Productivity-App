"use client";

import { LockKeyhole, Sprout, Trophy } from "lucide-react";
import Image from "next/image";
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
    <main className="ordyn-public flex items-center px-5 py-10 sm:px-8">
      <section className="ordyn-glass mx-auto grid w-full max-w-6xl overflow-hidden rounded-lg lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden border-b border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Image
            alt=""
            className="absolute inset-x-0 bottom-0 h-52 w-full object-cover opacity-70"
            height={420}
            priority
            src="/brand/ordyn-plant-stationery.png"
            width={520}
          />
          <div className="relative">
            <Link
              className="flex items-center gap-3 text-base font-semibold text-slate-950"
              href="/"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Sprout aria-hidden="true" size={21} strokeWidth={2.5} />
              </span>
              Ordyn Life
            </Link>
            <h1 className="mt-8 text-4xl font-semibold tracking-normal text-slate-950">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
              {isLogin
                ? "Open your private dashboard, calendar, training logs, and journal."
                : "Start with a private account, then build your daily system from the dashboard."}
            </p>
            <div className="relative z-10 mt-8 grid gap-3 text-sm font-medium text-slate-900">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur">
                <LockKeyhole
                  aria-hidden="true"
                  className="text-blue-600"
                  size={18}
                  strokeWidth={2.5}
                />
                Private by default
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur">
                <Trophy
                  aria-hidden="true"
                  className="text-amber-400"
                  size={18}
                  strokeWidth={2.5}
                />
                Calendar and dashboard in one place
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur">
                Built for daily check-ins
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <Link
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 lg:hidden"
            href="/"
          >
            Ordyn Life
          </Link>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-950">
              Email
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-950">
              Password
              <input
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {message}
              </p>
            ) : null}

            <button
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            {isLogin ? "New to Ordyn Life?" : "Already have an account?"}{" "}
            <Link
              className="font-semibold text-blue-600 hover:text-blue-700"
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
