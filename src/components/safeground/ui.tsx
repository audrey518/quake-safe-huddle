import type { RiskCategory } from "@/lib/safeground";

export function RiskPill({ category, score }: { category: RiskCategory; score: number }) {
  const tone =
    category === "Low" ? "bg-[var(--color-risk-low)]/15 text-[var(--color-risk-low)] border-[var(--color-risk-low)]/30"
    : category === "Moderate" ? "bg-[var(--color-risk-moderate)]/20 text-[oklch(0.35_0.08_60)] border-[var(--color-risk-moderate)]/40"
    : category === "High" ? "bg-[var(--color-risk-high)]/15 text-[var(--color-risk-high)] border-[var(--color-risk-high)]/40"
    : "bg-[var(--color-risk-very-high)]/15 text-[var(--color-risk-very-high)] border-[var(--color-risk-very-high)]/40";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      <span className="font-display font-semibold">{score}</span>
      {category}
    </span>
  );
}

export function MagnitudeBadge({ mag }: { mag: number }) {
  const color =
    mag >= 6 ? "bg-[var(--color-risk-very-high)] text-white"
    : mag >= 4.5 ? "bg-[var(--color-risk-high)] text-white"
    : mag >= 3 ? "bg-[var(--color-risk-moderate)] text-[oklch(0.25_0.05_60)]"
    : "bg-[var(--color-risk-low)] text-white";
  return (
    <div className={`grid h-11 w-11 place-items-center rounded-full font-display text-sm font-semibold ${color}`}>
      {mag.toFixed(1)}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function inputClass(extra = "") {
  return `w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 ${extra}`;
}

// Clears prefilled values when a user focuses an input/textarea so they can
// type immediately without manually deleting the existing text.
export const selectOnFocus: React.FocusEventHandler<HTMLElement> = (e) => {
  const t = e.target as HTMLElement;
  if (t instanceof HTMLInputElement) {
    const skip = ["date", "time", "datetime-local", "checkbox", "radio", "file", "color", "range"];
    if (!skip.includes(t.type)) {
      try { t.select(); } catch { /* noop */ }
    }
  } else if (t instanceof HTMLTextAreaElement) {
    try { t.select(); } catch { /* noop */ }
  }
};
