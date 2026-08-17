import type { ReactNode } from "react";

import { cn } from "@/lib/classnames";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return (
    <section className={cn("ordyn-glass rounded-lg", className)}>
      {children}
    </section>
  );
}

export function StatusMessage({
  children,
  className,
  tone = "neutral",
}: PanelProps & { tone?: "danger" | "neutral" | "success" }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium backdrop-blur-xl",
        tone === "danger" && "border-rose-300/35 bg-rose-950/60 text-rose-200",
        tone === "success" && "border-blue-300/35 bg-blue-950/50 text-blue-100",
        tone === "neutral" && "border-white/15 bg-white/[0.08] text-slate-500",
        className,
      )}
    >
      {children}
    </p>
  );
}
