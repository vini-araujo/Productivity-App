"use client";

import {
  Activity,
  CalendarDays,
  Dumbbell,
  Home,
  ListTodo,
  NotebookPen,
  Route,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/classnames";

export type AppSection =
  | "dashboard"
  | "tasks"
  | "calendar"
  | "gym"
  | "running"
  | "journal"
  | "profile";

type AppShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  current: AppSection;
  description?: string;
  eyebrow?: string;
  hideHeader?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
  title: string;
};

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  value: AppSection;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Dashboard",
    value: "dashboard",
  },
  {
    href: "/tasks",
    icon: ListTodo,
    label: "Tasks",
    value: "tasks",
  },
  {
    href: "/calendar",
    icon: CalendarDays,
    label: "Calendar",
    value: "calendar",
  },
  {
    href: "/gym",
    icon: Dumbbell,
    label: "Gym",
    value: "gym",
  },
  {
    href: "/running",
    icon: Route,
    label: "Running",
    value: "running",
  },
  {
    href: "/journal",
    icon: NotebookPen,
    label: "Journal",
    value: "journal",
  },
  {
    href: "/profile",
    icon: UserRound,
    label: "Profile",
    value: "profile",
  },
];

function handleNavigate(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void,
) {
  if (onNavigate) {
    onNavigate(event, href);
  }
}

function BrandLink({
  onNavigate,
  compact = false,
}: {
  compact?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <Link
      className={cn(
        "group flex items-center gap-3 rounded-lg text-slate-950",
        compact ? "justify-center p-0" : "px-2 py-1.5",
      )}
      href="/dashboard"
      onClick={(event) => handleNavigate(event, "/dashboard", onNavigate)}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 ring-2 ring-blue-400/80 transition group-hover:ring-blue-200">
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-[3px] border-current"
        />
      </span>
      {!compact ? (
        <span className="text-lg font-semibold tracking-normal">
          Ordyn Life
        </span>
      ) : null}
    </Link>
  );
}

function NavLink({
  item,
  current,
  onNavigate,
}: {
  current: AppSection;
  item: NavItem;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const Icon = item.icon;
  const isActive = current === item.value;

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex h-12 w-12 items-center justify-center rounded-lg text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-blue-200",
        isActive
          ? "bg-blue-500/15 text-blue-300 shadow-sm ring-1 ring-blue-400/30"
          : "text-slate-500 hover:bg-white/10 hover:text-slate-950",
      )}
      href={item.href}
      onClick={(event) => handleNavigate(event, item.href, onNavigate)}
      title={item.label}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
          isActive ? "text-blue-300" : "text-slate-500",
        )}
      >
        <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
      </span>
      <span className="sr-only">{item.label}</span>
    </Link>
  );
}

function MobileNav({
  current,
  onNavigate,
}: {
  current: AppSection;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const mobileItems = navItems.filter((item) =>
    ["dashboard", "tasks", "calendar", "gym", "profile"].includes(item.value),
  );

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="ordyn-glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-lg p-1 lg:hidden"
    >
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = current === item.value;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[0.68rem] font-medium transition",
              isActive
                ? "bg-blue-500/15 text-blue-300"
                : "text-slate-500 hover:bg-white/10 hover:text-slate-950",
            )}
            href={item.href}
            key={item.value}
            onClick={(event) => handleNavigate(event, item.href, onNavigate)}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  actions,
  children,
  className,
  current,
  description,
  eyebrow = "Ordyn Life",
  hideHeader = false,
  onNavigate,
  title,
}: AppShellProps) {
  return (
    <div className="ordyn-app lg:grid lg:grid-cols-[5.75rem_1fr]">
      <aside className="hidden min-h-screen border-r border-white/10 bg-black/[0.12] px-4 py-7 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:flex-col lg:items-center">
        <div className="absolute left-6 top-6 flex items-center gap-3 whitespace-nowrap">
          <BrandLink compact onNavigate={onNavigate} />
          <span className="text-lg font-semibold text-white">Ordyn Life</span>
        </div>
        <nav aria-label="Primary features" className="mt-24 grid gap-3">
          {navItems.map((item) => (
            <NavLink
              current={current}
              item={item}
              key={item.value}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <Link
            aria-label="Activity"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
            href="/dashboard"
            title="Activity"
          >
            <Activity aria-hidden="true" size={19} strokeWidth={2.2} />
          </Link>
          <Link
            aria-label="Settings"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
            href="/profile"
            title="Settings"
          >
            <Settings aria-hidden="true" size={19} strokeWidth={2.2} />
          </Link>
          <Link
            aria-label="Profile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-semibold text-white"
            href="/profile"
            title="Profile"
          >
            A
          </Link>
        </div>
      </aside>

      <main
        className={cn(
          "mx-auto min-h-screen w-full max-w-[96rem] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:px-7 lg:pb-8",
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
          <BrandLink onNavigate={onNavigate} />
          {actions}
        </div>

        {!hideHeader ? (
          <header className="ordyn-glass rounded-lg px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-600">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                ) : null}
              </div>
              <div className="hidden lg:block">{actions}</div>
            </div>
          </header>
        ) : null}

        {children}
      </main>

      <MobileNav current={current} onNavigate={onNavigate} />
    </div>
  );
}
