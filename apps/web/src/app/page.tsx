import {
  BookOpen,
  CheckSquare,
  Dumbbell,
  Footprints,
  Sprout,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const metrics = [
  { label: "Gym", tone: "bg-blue-600", value: "7" },
  { label: "Running", tone: "bg-sky-400", value: "5" },
  { label: "Tasks", tone: "bg-coral-600", value: "12" },
  { label: "Journal", tone: "bg-lavender-600", value: "4" },
];

const featureLinks = [
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/gym", icon: Dumbbell, label: "Gym" },
  { href: "/running", icon: Footprints, label: "Running" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
];

export default function Home() {
  return (
    <main className="ordyn-public text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link className="flex items-center gap-3 font-semibold" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Sprout aria-hidden="true" size={22} strokeWidth={2.5} />
          </span>
          <span className="text-xl">Ordyn Life</span>
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-2">
          <Link
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-blue-300"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-flex"
            href="/register"
          >
            Create account
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-16 lg:pt-8">
        <div>
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200 backdrop-blur-xl">
            Private productivity workspace
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-normal text-slate-950 sm:text-7xl">
            Ordyn Life
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-slate-500 sm:text-lg">
            A simple place to manage tasks, calendar, training, running, and
            private journal entries.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              href="/register"
            >
              Create account
            </Link>
            <Link
              className="rounded-lg border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-950 transition hover:border-blue-300"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section
          aria-label="Ordyn Life product preview"
          className="ordyn-glass overflow-hidden rounded-lg"
        >
          <div className="relative min-h-64 overflow-hidden">
            <Image
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              height={500}
              priority
              src="/brand/ordyn-desk-banner.png"
              width={1100}
            />
            <div className="absolute inset-0 bg-slate-950/35" />
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Activity
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  Year overview
                </h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                Read-only calendar
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {metrics.map((metric) => (
                <div className="rounded-lg bg-slate-50 p-4" key={metric.label}>
                  <span
                    aria-hidden="true"
                    className={`block h-2 w-10 rounded-full ${metric.tone}`}
                  />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-slate-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {featureLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-950 transition hover:border-blue-300"
                    href="/register"
                    key={item.label}
                  >
                    <Icon aria-hidden="true" size={17} strokeWidth={2.4} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
