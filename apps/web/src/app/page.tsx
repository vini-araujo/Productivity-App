import Link from "next/link";

const foundations = [
  "Plan-first gym workout logging",
  "Shared U/L/Rest starter split",
  "Generated weight and repetition sets",
  "Ownership enforced from validated JWTs",
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
      <section className="grid items-end gap-12 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Milestone 4
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            Build the systems that make progress repeatable.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Discipline App will bring tasks, training, journaling, and personal
            progress into one focused workspace. Gym plans now turn each
            training day into a fast, structured logging session.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200"
              href="/tasks"
            >
              Open tasks
            </Link>
            <Link
              className="rounded-full border border-emerald-800 px-6 py-3 font-semibold text-emerald-200 transition hover:bg-emerald-950"
              href="/gym"
            >
              Open gym
            </Link>
            <Link
              className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
              href="/login"
            >
              Sign in
            </Link>
            <a
              className="px-3 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
              href={`${apiUrl}/docs`}
            >
              API docs
            </a>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-950/30">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">Gym foundation</p>
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Running
            </span>
          </div>
          <ul className="mt-6 space-y-4">
            {foundations.map((foundation) => (
              <li
                className="flex items-start gap-3 text-sm leading-6 text-slate-300"
                key={foundation}
              >
                <span
                  aria-hidden="true"
                  className="mt-2 block h-2 w-2 shrink-0 rounded-full bg-emerald-300"
                />
                {foundation}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
