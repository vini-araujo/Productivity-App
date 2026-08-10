import Link from "next/link";

const metrics = [
  { label: "Open tasks", value: "7" },
  { label: "This week", value: "18 km" },
  { label: "Journal", value: "Saved" },
];

const calendarItems = [
  { day: "Mon", label: "Upper", tone: "bg-emerald-300" },
  { day: "Tue", label: "Journal", tone: "bg-slate-500" },
  { day: "Wed", label: "Run", tone: "bg-sky-300" },
  { day: "Thu", label: "Task", tone: "bg-amber-300" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex items-center justify-between gap-4">
        <Link
          className="shrink-0 whitespace-nowrap text-base font-semibold text-white"
          href="/"
        >
          Ordyn Life
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-2">
          <Link
            className="rounded-md border border-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700 hover:bg-slate-900"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="hidden rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 sm:inline-flex"
            href="/register"
          >
            Create account
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase text-emerald-300">
            Private daily systems
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-6xl">
            Ordyn Life
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A focused workspace for planning tasks, logging training, capturing
            runs, writing privately, and seeing the whole rhythm on one
            calendar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200"
              href="/register"
            >
              Create account
            </Link>
            <Link
              className="rounded-md border border-slate-700 px-5 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section
          aria-label="Ordyn Life product preview"
          className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/10 sm:p-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">Today</p>
              <p className="mt-1 text-xs text-slate-400">
                Tasks, training, running, journal
              </p>
            </div>
            <span className="rounded-md border border-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-300">
              Private
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                key={metric.label}
              >
                <p className="text-xs font-semibold text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-white">
                Calendar snapshot
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Weekly overview
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {calendarItems.map((item) => (
                <div
                  className="min-h-24 rounded-md border border-slate-800 bg-slate-900 p-3"
                  key={item.day}
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {item.day}
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${item.tone}`}
                    />
                    <span className="truncate text-xs font-semibold text-slate-300">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              className="rounded-md border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-300"
              href="/register"
            >
              Start planning
            </Link>
            <Link
              className="rounded-md border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-300"
              href="/register"
            >
              Track training
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
