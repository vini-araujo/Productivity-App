import Link from "next/link";
import type { MouseEvent } from "react";

export type FeatureTab =
  | "dashboard"
  | "tasks"
  | "calendar"
  | "gym"
  | "running"
  | "journal";

type FeatureTabsProps = {
  current: FeatureTab;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
};

const tabs: { href: string; label: string; value: FeatureTab }[] = [
  { href: "/dashboard", label: "Dashboard", value: "dashboard" },
  { href: "/tasks", label: "Tasks", value: "tasks" },
  { href: "/calendar", label: "Calendar", value: "calendar" },
  { href: "/gym", label: "Gym", value: "gym" },
  { href: "/running", label: "Running", value: "running" },
  { href: "/journal", label: "Journal", value: "journal" },
];

export function FeatureTabs({ current, onNavigate }: FeatureTabsProps) {
  return (
    <nav
      aria-label="Primary features"
      className="mt-6 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 sm:grid-cols-6"
    >
      {tabs.map((tab) => (
        <Link
          aria-current={current === tab.value ? "page" : undefined}
          className={`rounded-md px-2 py-2.5 text-center text-xs font-semibold transition sm:px-4 sm:text-sm ${
            current === tab.value
              ? "bg-slate-100 text-blue-600"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
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
