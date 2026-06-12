import Link from "next/link";
import type { MouseEvent } from "react";

export type FeatureTab = "dashboard" | "tasks" | "gym" | "journal";

type FeatureTabsProps = {
  current: FeatureTab;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
};

const tabs: { href: string; label: string; value: FeatureTab }[] = [
  { href: "/dashboard", label: "Dashboard", value: "dashboard" },
  { href: "/tasks", label: "Tasks", value: "tasks" },
  { href: "/gym", label: "Gym", value: "gym" },
  { href: "/journal", label: "Journal", value: "journal" },
];

export function FeatureTabs({ current, onNavigate }: FeatureTabsProps) {
  return (
    <nav
      aria-label="Primary features"
      className="mt-6 grid grid-cols-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-1"
    >
      {tabs.map((tab) => (
        <Link
          aria-current={current === tab.value ? "page" : undefined}
          className={`rounded-xl px-2 py-2.5 text-center text-xs font-semibold transition sm:px-4 sm:text-sm ${
            current === tab.value
              ? "bg-emerald-300 text-slate-950"
              : "text-slate-400 hover:bg-slate-950 hover:text-white"
          }`}
          href={tab.href}
          key={tab.value}
          onClick={
            onNavigate ? (event) => onNavigate(event, tab.href) : undefined
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
