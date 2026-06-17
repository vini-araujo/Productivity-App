"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { signIn, signUp } from "@/features/auth/api";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        window.location.assign("/profile");
        return;
      }

      const confirmationRequired = await signUp(email, password);
      if (confirmationRequired) {
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        window.location.assign("/profile");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-emerald-950/30 sm:p-9">
        <Link
          className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
          href="/"
        >
          Ordyn Life
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {isLogin
            ? "Sign in to open your protected profile."
            : "Start building daily systems that compound."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
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
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
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
            className="w-full rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
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
      </section>
    </main>
  );
}
