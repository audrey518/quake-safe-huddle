import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Building2, ClipboardList, Droplets, FileText, Map, Megaphone, TrendingUp, UserCircle2, Waves } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { assessRisk, HAZARD_LABELS, type BuildingMaterial, type HazardType } from "@/lib/safeground";
import { fetchRecentEarthquakes } from "@/lib/usgs";
import { formatDistanceToNow } from "@/lib/format";
import { MagnitudeBadge, RiskPill } from "@/components/safeground/ui";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — GeoSafe AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const buildingsQ = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const reportsQ = useQuery({
    queryKey: ["hazard_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hazard_reports").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
  const wellsCountQ = useQuery({
    queryKey: ["wells-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("wells").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
  const quakesQ = useQuery({
    queryKey: ["usgs", "2.5_day"],
    queryFn: () => fetchRecentEarthquakes("2.5_day"),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const buildings = buildingsQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const quakes = quakesQ.data ?? [];

  const topRisk = buildings
    .map((b) => ({ b, r: assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial }) }))
    .sort((a, b) => b.r.score - a.r.score)[0];

  const recentMajor = quakes.find((q) => q.magnitude >= 4.5 && Date.now() - q.time < 60 * 60 * 1000);
  const greeting = user?.email?.split("@")[0] ?? "there";

  return (
    <AppShell>
      <section className="border-b border-border bg-gradient-to-b from-accent/40 via-background to-background">
        <div className="container-app py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live monitoring
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight font-display">
            Hello, {greeting}.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Live earthquake activity, community hazard reports, and groundwater observations from across your region.
          </p>
        </div>
      </section>

      <div className="container-app py-8 space-y-8">
        {recentMajor && (
          <div className="card-soft border-l-4 border-l-[var(--color-risk-very-high)] p-4 flex items-start gap-3">
            <Activity className="h-5 w-5 text-[var(--color-risk-very-high)] mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Significant quake nearby in the last hour</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                M{recentMajor.magnitude.toFixed(1)} · {recentMajor.place} · {formatDistanceToNow(recentMajor.time)} ago
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Buildings" value={String(buildings.length)} hint={topRisk ? `Top risk: ${topRisk.b.name}` : "Add a building"} />
          <StatCard icon={<Droplets className="h-5 w-5" />} label="Wells tracked" value={String(wellsCountQ.data ?? 0)} hint="Groundwater monitoring" />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Hazard reports" value={String(reports.length)} hint={reports[0] ? HAZARD_LABELS[reports[0].kind as HazardType] ?? "Recent reports" : "No reports yet"} />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Quakes (24h)" value={quakesQ.isLoading ? "—" : String(quakes.length)} hint="M2.5+ worldwide" />
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold font-display">Latest earthquakes</h2>
                </div>
                <Link to="/map" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                  Open InfoHub <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {quakes.slice(0, 5).map((q) => (
                  <li key={q.id} className="flex items-center gap-4 py-3">
                    <MagnitudeBadge mag={q.magnitude} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{q.place}</div>
                      <div className="text-xs text-muted-foreground">
                        M{q.magnitude.toFixed(1)} · {q.depth.toFixed(0)} km · {formatDistanceToNow(q.time)} ago
                      </div>
                    </div>
                  </li>
                ))}
                {quakes.length === 0 && !quakesQ.isLoading && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No recent quakes.</li>
                )}
              </ul>
            </div>

            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[var(--color-risk-high)]" />
                  <h2 className="text-lg font-semibold font-display">Latest hazard reports</h2>
                </div>
                <Link to="/map" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                  Open map <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {reports.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center">
                  <Waves className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No community reports yet.</p>
                </div>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {reports.slice(0, 6).map((r) => (
                    <li key={r.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-risk-high)]" />
                        {HAZARD_LABELS[r.kind as HazardType] ?? r.kind}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card-soft p-5 md:p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold font-display">Quick actions</h2>
              </div>
              <div className="mt-4 space-y-3">
                <ActionCard to="/map" search={{ cat: "earthquakes" }} icon={<Map className="h-5 w-5" />} title="Open Map" description="Browse data and contribute by category." />
                <ActionCard to="/map" search={{ cat: "buildings" }} icon={<Building2 className="h-5 w-5" />} title="Add Building" description="Track a home or workplace and get a risk report." />
                <ActionCard to="/map" search={{ cat: "wells" }} icon={<Droplets className="h-5 w-5" />} title="Register Well" description="Track groundwater levels nearby." />
                <ActionCard to="/map" search={{ cat: "reports" }} icon={<Megaphone className="h-5 w-5" />} title="Submit Report" description="Log damage, flooding or cracks." />
                <ActionCard to="/profile" icon={<UserCircle2 className="h-5 w-5" />} title="Your profile" description="Trust badge, history and settings." />
              </div>
            </div>

            {topRisk && (
              <div className="card-soft p-5 md:p-6 border-l-4 border-l-[var(--color-risk-high)]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Highest risk building</div>
                <div className="mt-1 font-display text-xl font-semibold">{topRisk.b.name}</div>
                <div className="mt-3"><RiskPill category={topRisk.r.category} score={topRisk.r.score} /></div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{topRisk.r.explanation}</p>
                <Link to="/map" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open map <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground line-clamp-1">{hint}</div>
    </div>
  );
}

function ActionCard({ to, search, icon, title, description }: { to: string; search?: Record<string, string>; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link to={to} search={search as never} className="group flex items-start gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-secondary/60">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium">{title}<ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
