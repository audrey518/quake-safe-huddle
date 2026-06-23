import { cn } from "@/lib/utils";

export function GeoSafeLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-7 w-7" role="img">
        <defs>
          <clipPath id="geosafe-logo-clip">
            <circle cx="24" cy="24" r="20" />
          </clipPath>
        </defs>
        <circle cx="24" cy="24" r="21" fill="var(--color-background)" />
        <g clipPath="url(#geosafe-logo-clip)">
          <rect x="4" y="4" width="40" height="20" fill="var(--color-accent)" />
          <path
            d="M9 18c4-6 9-8 14-5 3 2 5 5 9 3 3-1 5-3 8-2v12H9Z"
            fill="var(--color-primary)"
            opacity="0.28"
          />
          <path
            d="M10 24c6-4 12-4 18 0 4 3 8 3 12 0v8H10Z"
            fill="var(--color-secondary)"
          />
          <path d="M6 31h36" stroke="var(--color-border)" strokeWidth="2" />
          <path
            d="M8 36c4-2 8-2 12 0s8 2 12 0 6-2 10 0"
            fill="none"
            stroke="var(--color-primary)"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M8 40c4-2 8-2 12 0s8 2 12 0 6-2 10 0"
            fill="none"
            stroke="var(--color-primary)"
            strokeLinecap="round"
            strokeWidth="2"
            opacity="0.65"
          />
        </g>
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      </svg>
    </span>
  );
}