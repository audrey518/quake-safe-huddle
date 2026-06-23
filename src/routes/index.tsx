import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  Megaphone,
  ShieldAlert,
  TrendingUp,
  Waves,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { assessRisk, type Building, type HazardReport, HAZARD_LABELS } from "@/lib/safeground";
import { fetchRecentEarthquakes } from "@/lib/usgs";
import { formatDistanceToNow } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeGround" },
      { name: "description", content: "Earthquake activity, recent hazard reports, and your building risk at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [buildings] = useLocalStorage<Building[]>("sg.buildings", []);
  const [reports] = useLocalStorage<HazardReport[]>("sg.reports", []);

  const { data: quakes, isLoading: quakesLoading } = useQuery({
    queryKey: ["usgs", "day", "2.5"],
    queryFn: () => fetchRecentEarthquakes("2.5_day"),
    staleTime: 5 * 60 * 1000,
  });

  const topRisk = buildings
    .map((b) => ({ b, r: assessRisk(b) }))
    .sort((a, b) => b.r.score - a.r.score)[0];

  const recentQuakes = (quakes ?? []).slice(0, 5);
  const recentReports = reports.slice(0, 5);

  return (
    <AppShell>
      {/* Top Section */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/60 to-background">
        <div className="container-app py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            Live monitoring dashboard
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight font-display">
            SafeGround
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Welcome back. Here is the latest earthquake activity, community hazard reports, and your tracked buildings — all in one place.
          </p>
        </div>
      </section>

      <div className="container-app py-8 space-y-8">
        {/* Statistics Cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Building2 className="h-5 w-5" />}
            label="Total Buildings"
            value={String(buildings.length)}
            hint={topRisk ? `Highest risk: ${topRisk.b.name} — ${topRisk.r.category}` : "Add a building to begin tracking"}
            tone="primary"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Hazard Reports"
            value={String(reports.length)}
            hint={reports.length === 0 ? "No reports submitted yet" : `${HAZARD_LABELS[reports[0].type]} reported most recently`}
            tone="warning"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Recent Earthquakes"
            value={quakesLoading ? "—" : String(quakes?.length ?? 0)}
            hint={quakesLoading ? "Loading USGS feed…" : "M2.5+ events from the last 24 hours"}
            tone="danger"
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Activity */}
          <section className="lg:col-span-2 space-y-6">
            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-danger" />
                  <h2 className="text-lg font-semibold font-display">Latest earthquake events</h2>
                </div>
                <Link to="/earthquakes" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {recentQuakes.map((q) => (
                  <li key={q.id} className="flex items-center gap-4 py-3">
                    <MagnitudeBadge mag={q.magnitude} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{q.place}</div>
                      <div className="text-xs text-muted-foreground">
                        M{q.magnitude.toFixed(1)} · {q.depth.toFixed(0)} km deep · {formatDistanceToNow(q.time)} ago
                      </div>
                    </div>
                  </li>
                ))}
                {!quakesLoading && recentQuakes.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No recent quakes recorded.</li>
                )}
                {quakesLoading && (
                  <li className="py-6 text-center text-sm text-muted-foreground">Loading USGS feed…</li>
                )}
              </ul>
            </div>

            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-warning" />
                  <h2 className="text-lg font-semibold font-display">Latest hazard reports</h2>
                </div>
                <Link to="/reports" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {recentReports.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center">
                  <Waves className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No community reports yet.</p>
                </div>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {recentReports.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="inline-flex h-2 w-2 rounded-full bg-warning" />
                        {HAZARD_LABELS[r.type]}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <aside className="space-y-6">
            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold font-display">Quick actions</h2>
              </div>
              <div className="mt-4 space-y-3">
                <ActionCard
                  to="/buildings"
                  icon={<Building2 className="h-5 w-5" />}
                  title="Add Building"
                  description="Register a home or workplace to track its earthquake risk."
                />
                <ActionCard
                  to="/reports"
                  icon={<Megaphone className="h-5 w-5" />}
                  title="Submit Report"
                  description="Share a local hazard or damage observation with the community."
                />
                <ActionCard
                  to="/risk"
                  icon={<ShieldAlert className="h-5 w-5" />}
                  title="View Risk Assessment"
                  description="See a simple risk score for any saved or custom building."
                />
              </div>
            </div>

            {topRisk && (
              <div className="card-soft p-5 md:p-6 border-l-4 border-l-warning">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Highest risk building</div>
                <div className="mt-1 font-display text-xl font-semibold">{topRisk.b.name}</div>
                <div className="mt-3 flex items-center gap-3">
                  <RiskPill category={topRisk.r.category} score={topRisk.r.score} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{topRisk.r.explanation}</p>
                <Link to="/risk" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open assessment <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "warning" | "danger";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-danger/10 text-danger",
  };

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          {icon}
        </span>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground line-clamp-1">{hint}</div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-secondary/60"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium">
          {title}
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function MagnitudeBadge({ mag }: { mag: number }) {
  const color =
    mag >= 6
      ? "bg-danger text-danger-foreground"
      : mag >= 4.5
        ? "bg-warning text-warning-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <div className={`grid h-11 w-11 place-items-center rounded-full font-display text-sm font-semibold ${color}`}>
      {mag.toFixed(1)}
    </div>
  );
}

export function RiskPill({ category, score }: { category: string; score: number }) {
  const style =
    category === "Low"
      ? "bg-success/15 text-success-foreground border-success/30"
      : category === "Moderate"
        ? "bg-warning/20 text-warning-foreground border-warning/40"
        : "bg-danger/15 text-danger border-danger/30";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      <span className="font-display font-semibold">{score}</span>
      {category}
    </span>
  );
}