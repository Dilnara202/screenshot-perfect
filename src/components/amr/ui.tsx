import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/amr";
import { STATUS_LABEL } from "@/lib/amr";

export function Card({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string | undefined }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
        {icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>}
        <span className="min-w-0">{title}</span>
      </h2>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const selectCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-hidden focus:ring-2 focus:ring-ring";

export const statusCls: Record<Status, string> = {
  S: "bg-success-soft text-success border-success/30",
  I: "bg-warning-soft text-warning border-warning/40",
  R: "bg-danger-soft text-danger border-danger/30",
};

export function StatusBadge({ status, large }: { status: Status; large?: boolean }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border font-semibold whitespace-nowrap", statusCls[status], large ? "px-5 py-2 text-lg" : "px-2.5 py-0.5 text-xs")}>
      {large ? STATUS_LABEL[status] : status}
    </span>
  );
}

export const inputCls = selectCls;

export function Kpi({ label, value, hint, icon, tone = "primary" }: { label: string; value: ReactNode; hint?: string; icon: ReactNode; tone?: "primary" | "danger" | "warning" | "success" }) {
  const toneCls = { primary: "text-primary bg-primary/12", danger: "text-danger bg-danger/15", warning: "text-warning bg-warning/15", success: "text-success bg-success/15" }[tone];
  return (
    <div className="animate-rise min-w-0 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneCls)}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

export const WHO_CLS: Record<string, string> = { critical: "border-danger/40 bg-danger-soft text-danger", high: "border-warning/40 bg-warning-soft text-warning", medium: "border-primary/40 bg-primary/10 text-primary", none: "text-muted-foreground" };
