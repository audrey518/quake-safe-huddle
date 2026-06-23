import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Building2, Megaphone, ShieldAlert, Waves } from "lucide-react";
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

  const largestQuake = quakes?.slice().sort((a, b) => b.magnitude - a.magnitude)[0];

  return (
    <AppShell>
      <section className="border-b border-border bg-gradient-to-b from-secondary/60 to-background">
        <div className="container-app py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            Live earthquake feed
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Know the ground <span className="text-primary">beneath you.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            SafeGround turns public earthquake data and community reports into a simple,
            home-level view of risk — so residents, students, and neighbors can prepare together.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/buildings"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Building2 className="h-4 w-4" /> Add a building
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <Megaphone className="h-4 w-4" /> Report a hazard
            </Link>
          </div>
        </div>
      </section>

      <section className="container-app py-8 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Quakes today (M2.5+)"
          value={quakesLoading ? "…" : String(quakes?.length ?? 0)}
          hint={largestQuake ? `Largest M${largestQuake.magnitude.toFixed(1)} — ${largestQuake.place}` : "USGS global feed"}
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5" />}
          label="Community reports"
          value={String(reports.length)}
          hint={reports.length === 0 ? "Be the first to report" : `${HAZARD_LABELS[reports[0].type]} most recent`}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Buildings tracked"
          value={String(buildings.length)}
          hint={topRisk ? `${topRisk.b.name} — ${topRisk.r.category} risk` : "No buildings yet"}
        />
      </section>

      <section className="container-app pb-12 grid gap-6 lg:grid-cols-3">
        <div className="card-soft p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent earthquakes</h2>
            <Link to="/earthquakes" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(quakes ?? []).slice(0, 6).map((q) => (
              <li key={q.id} className="flex items-center gap-4 py-3">
                <MagnitudeBadge mag={q.magnitude} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{q.place}</div>
                  <div className="text-xs text-muted-foreground">
                    {q.depth.toFixed(0)} km deep · {formatDistanceToNow(q.time)} ago
                  </div>
                </div>
              </li>
            ))}
            {!quakesLoading && (quakes?.length ?? 0) === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No recent quakes.</li>
            )}
            {quakesLoading && (
              <li className="py-6 text-center text-sm text-muted-foreground">Loading USGS feed…</li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Buildings</h2>
              <Link to="/buildings" className="text-xs text-primary hover:underline">Manage</Link>
            </div>
            {buildings.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Add your home or workplace to see a quick earthquake risk summary.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {buildings.slice(0, 3).map((b) => {
                  const r = assessRisk(b);
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{b.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.address}</div>
                      </div>
                      <RiskPill category={r.category} score={r.score} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card-soft p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Latest hazards</h2>
              <Link to="/reports" className="text-xs text-primary hover:underline">All</Link>
            </div>
            {reports.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                <Waves className="h-4 w-4" /> No community reports yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reports.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded-md bg-secondary/60 px-3 py-2">
                    <div className="text-sm font-medium">{HAZARD_LABELS[r.type]}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{r.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary">
          {icon}
        </span>
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{hint}</div>
    </div>
  );
}

export function MagnitudeBadge({ mag }: { mag: number }) {
  const color =
    mag >= 6 ? "bg-danger text-danger-foreground" : mag >= 4.5 ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground";
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
        : category === "High"
          ? "bg-danger/15 text-danger border-danger/30"
          : "bg-danger text-danger-foreground border-danger";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>
      <span className="font-display font-semibold">{score}</span>
      {category}
    </span>
  );
}
