import { cn } from "@/lib/classnames";

type ProgressMeterProps = {
  className?: string;
  label: string;
  max: number;
  tone?: "blue" | "coral" | "emerald" | "lavender";
  value: number;
};

const toneClass = {
  blue: "bg-blue-600",
  coral: "bg-coral-600",
  emerald: "bg-emerald-300",
  lavender: "bg-lavender-600",
};

export function ProgressMeter({
  className,
  label,
  max,
  tone = "emerald",
  value,
}: ProgressMeterProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="text-sm font-semibold text-slate-950">
          {value} / {max}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          aria-hidden="true"
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            toneClass[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
