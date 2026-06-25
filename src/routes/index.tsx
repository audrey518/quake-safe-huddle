import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, BookOpen, Building2, CheckCircle2, ClipboardList, Compass, Droplets, FileText, Map, MapPin, Megaphone, Phone, ShieldCheck, Sparkles, Store, TrendingUp, UserCircle2, Waves } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { assessRisk, HAZARD_LABELS, type BuildingMaterial, type HazardType } from "@/lib/safeground";
import { fetchRecentEarthquakes } from "@/lib/usgs";
import { formatDistanceToNow } from "@/lib/format";
import { MagnitudeBadge, RiskPill } from "@/components/safeground/ui";
import { useAuth } from "@/hooks/use-auth";
import { LEARN_CATEGORIES } from "@/lib/learn-content";
import { CATEGORIES as SERVICE_CATEGORIES, PROVIDERS } from "@/lib/services-data";
import heroImage from "@/assets/hero-geosafe.jpg";
import heroCard1 from "@/assets/hero-card-1.jpg";
import heroCard2 from "@/assets/hero-card-2.jpg";

export const Route = createFileRoute("/")({
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

  // Featured Learn posts: pick first post from first 3 categories
  const featuredPosts = LEARN_CATEGORIES.slice(0, 3).map((c) => ({
    category: c,
    post: c.posts[0],
  }));

  // Collaborated providers — pick top 4 across categories
  const featuredProviders = SERVICE_CATEGORIES.flatMap((c) =>
    (PROVIDERS[c.id] ?? []).slice(0, 1).map((p) => ({ category: c, provider: p })),
  ).slice(0, 4);

  return (
    <AppShell>
      {/* HERO — warm peach → blush → aqua wash */}
      <section className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, #fef3ec 0%, #fdf2f8 45%, #ecfeff 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, #fbcfe8 0%, transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, #bae6fd 0%, transparent 70%)" }} />

        {/* Mobile background image behind text */}
        <div className="absolute inset-0 md:hidden">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/45 to-background/85" />
        </div>

        <div className="container-app relative z-10 py-12 md:py-20 grid gap-10 lg:grid-cols-[1.05fr_1fr] items-center">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {user ? `Welcome back, ${greeting}` : "Live earthquake monitoring"}
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight font-display leading-[1.05]">
              Understand earthquake risk <span className="text-primary">around your home</span> — no engineering degree needed.
            </h1>
            <p className="mt-5 max-w-xl text-base md:text-lg text-muted-foreground">
              GeoSafe AI turns live seismic data, community hazard reports and simple building details into clear, plain-language risk for everyday residents.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Real-time quakes from USGS, mapped to your area",
                "Plain-language risk score for any building",
                "Crowd-sourced hazard reports from your neighbors",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/map" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow">
                <Compass className="h-4 w-4" /> Explore the InfoHub
              </Link>
              <Link to="/learn" className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-secondary">
                <BookOpen className="h-4 w-4" /> Learn the basics
              </Link>
            </div>
            {!user && (
              <p className="mt-4 text-xs text-muted-foreground">
                Browse freely as a guest. <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to add buildings and submit reports.
              </p>
            )}
          </div>

          <div className="relative hidden md:block">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border">
              <img
                src={heroImage}
                alt="Aerial neighborhood with seismic wave visualization"
                width={1536}
                height={1024}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-6 w-40 rounded-xl overflow-hidden shadow-xl ring-4" style={{ borderColor: "#fbcfe8" }}>
              <img src={heroCard1} alt="Risk map on phone" width={768} height={768} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="hidden md:block absolute -top-6 -right-6 w-36 rounded-xl overflow-hidden shadow-xl ring-4" style={{ borderColor: "#bae6fd" }}>
              <img src={heroCard2} alt="Engineer inspecting a home" width={768} height={768} loading="lazy" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — mint wash with color-coded steps */}
      <section className="relative border-b border-border overflow-hidden" style={{ background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)" }}>
        <div className="container-app py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium rounded-full px-3 py-1" style={{ background: "#d1fae5", color: "#065f46" }}>
              <Sparkles className="h-3.5 w-3.5" /> How it works
            </div>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">Three simple steps to get prepared</h2>
            <p className="mt-3 text-muted-foreground">No jargon, no engineering background required.</p>
          </div>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", icon: <Compass className="h-5 w-5" />, title: "Explore", text: "Open the InfoHub map and see live quakes, hazard reports, wells and buildings in your area.", tint: "#dbeafe", ink: "#1e40af" },
              { n: "02", icon: <Building2 className="h-5 w-5" />, title: "Check your home", text: "Add a building — name, year built, floors, material — and get an instant plain-language risk score.", tint: "#fce7f3", ink: "#9d174d" },
              { n: "03", icon: <ShieldCheck className="h-5 w-5" />, title: "Stay informed", text: "Follow community reports, learn what to do in the first 60 seconds, and connect with trusted providers.", tint: "#fef3c7", ink: "#92400e" },
            ].map((s) => (
              <li key={s.n} className="card-soft p-6 relative overflow-hidden">
                <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full" style={{ background: s.tint, opacity: 0.7 }} />
                <div className="absolute right-5 top-5 text-5xl font-display font-semibold leading-none" style={{ color: s.ink, opacity: 0.2 }}>{s.n}</div>
                <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: s.tint, color: s.ink }}>{s.icon}</span>
                <div className="relative mt-4 font-display text-xl font-semibold">{s.title}</div>
                <p className="relative mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>


      <div className="container-app py-10 space-y-8" style={{ background: "transparent" }}>
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
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Buildings" value={String(buildings.length)} hint={topRisk ? `Top risk: ${topRisk.b.name}` : "Add a building"} tint="#fce7f3" ink="#9d174d" />
          <StatCard icon={<Droplets className="h-5 w-5" />} label="Wells tracked" value={String(wellsCountQ.data ?? 0)} hint="Groundwater monitoring" tint="#dbeafe" ink="#1e40af" />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Hazard reports" value={String(reports.length)} hint={reports[0] ? HAZARD_LABELS[reports[0].kind as HazardType] ?? "Recent reports" : "No reports yet"} tint="#fed7aa" ink="#9a3412" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Quakes (24h)" value={quakesQ.isLoading ? "—" : String(quakes.length)} hint="M2.5+ worldwide" tint="#d1fae5" ink="#065f46" />
        </section>


        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-3">
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
                  Open InfoHub <ArrowRight className="h-4 w-4" />
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
                <ActionCard to="/map" search={{ cat: "earthquakes" }} icon={<Map className="h-5 w-5" />} title="Open InfoHub" description="Browse data and contribute by category." />
                <ActionCard to="/map" search={{ cat: "buildings" }} icon={<Building2 className="h-5 w-5" />} title="Add Building" description="Track a home or workplace and get a risk report." />
                <ActionCard to="/map" search={{ cat: "wells" }} icon={<Droplets className="h-5 w-5" />} title="Register Well" description="Track groundwater levels nearby." />
                <ActionCard to="/map" search={{ cat: "reports" }} icon={<Megaphone className="h-5 w-5" />} title="Submit Report" description="Log damage, flooding or cracks." />
                {user ? (
                  <ActionCard to="/profile" icon={<UserCircle2 className="h-5 w-5" />} title="Your profile" description="Trust badge, history and settings." />
                ) : (
                  <ActionCard to="/auth" icon={<UserCircle2 className="h-5 w-5" />} title="Join the community" description="Sign in to add buildings, submit reports and earn a trust badge." />
                )}
              </div>
            </div>

            {topRisk && (
              <div className="card-soft p-5 md:p-6 border-l-4 border-l-[var(--color-risk-high)]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Highest risk building</div>
                <div className="mt-1 font-display text-xl font-semibold">{topRisk.b.name}</div>
                <div className="mt-3"><RiskPill category={topRisk.r.category} score={topRisk.r.score} /></div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{topRisk.r.explanation}</p>
                <Link to="/map" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open InfoHub <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>


      {/* FEATURED LEARN */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container-app py-12 md:py-16">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">Learn</div>
              <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight">Start with the essentials</h2>
              <p className="mt-3 text-muted-foreground">Plain-language guides written for residents — no engineering background needed.</p>
            </div>
            <Link to="/learn" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
              All articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {featuredPosts.map(({ category, post }) => (
              <Link
                key={post.slug}
                to="/learn/$category/$post"
                params={{ category: category.slug, post: post.slug }}
                className="group card-soft p-6 hover:border-primary/40 transition-colors flex flex-col"
              >
                <div className="text-[11px] uppercase tracking-wider font-medium" style={{ color: category.accent }}>
                  {category.shortTitle}
                </div>
                <div className="mt-2 font-display text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{post.readTime}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* COLLABORATED PROVIDERS */}
      <section className="border-t border-border bg-background">
        <div className="container-app py-12 md:py-16">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">Our partners</div>
              <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight">Collaborated service providers</h2>
              <p className="mt-3 text-muted-foreground">Vetted local materials suppliers, engineers, water specialists and insurers — booking and purchase available inside the app.</p>
            </div>
            <Link to="/services" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
              <Store className="h-4 w-4" /> Browse all
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProviders.map(({ category, provider }) => (
              <Link
                key={provider.id}
                to="/services"
                className="group card-soft p-5 hover:border-primary/40 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{category.label}</span>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                  {provider.name}
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{provider.blurb}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {provider.location}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT + CONTACT */}
      <section className="border-t border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-app py-14 md:py-20 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">About GeoSafe AI</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight">A community-driven platform for earthquake awareness</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              GeoSafe AI helps ordinary residents understand the earthquake risk around their homes using public seismic data,
              community hazard reports and simple building information — no engineering degree required.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="card-soft p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> Our mission
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  To democratize disaster preparedness by giving every resident, student and community member free,
                  clear and actionable insight into the seismic risk of the places they live, learn and work.
                </p>
              </div>
              <div className="card-soft p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Our vision
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  A world where neighborhoods, not just engineers, can read the ground they stand on — and where a single
                  shared map turns isolated observations into collective resilience.
                </p>
              </div>
            </div>
          </div>

          <div className="card-soft p-6 self-start">
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">Contact</div>
            <h3 className="mt-2 font-display text-xl font-semibold">Get in touch</h3>
            <p className="mt-2 text-sm text-muted-foreground">Questions, partnership ideas or feedback — we'd love to hear from you.</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <a href="mailto:levivalorant122@gmail.com" className="font-medium hover:text-primary">levivalorant122@gmail.com</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Phone className="h-4 w-4" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a href="tel:+959232322777" className="font-medium hover:text-primary">+95 9 232 322 777</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Office</div>
                  <div className="font-medium">Corner of Pyay Road and Sanchaung Road, Yangon</div>
                </div>
              </li>
            </ul>
            {!user && (
              <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Join GeoSafe AI
              </Link>
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
