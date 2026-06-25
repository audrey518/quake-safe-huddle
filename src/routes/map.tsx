import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MapView, type MapMarker } from "@/components/safeground/map-view";
import { supabase } from "@/integrations/supabase/client";
import { fetchRecentEarthquakes, type UsgsFeed } from "@/lib/usgs";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { generateBrief } from "@/lib/ai.functions";
import {
  assessRisk,
  HAZARD_LABELS,
  MATERIAL_LABELS,
  magnitudeColor,
  riskCategoryColor,
  type BuildingMaterial,
  type HazardType,
} from "@/lib/safeground";
import { formatDistanceToNow } from "@/lib/format";
import { Field, inputClass, MagnitudeBadge, RiskPill, selectOnFocus } from "@/components/safeground/ui";
import { Activity, Building2, ChevronDown, Droplets, Globe, Lock, MapPin, Megaphone, MessageSquare, Mountain, Plus, Search, Send, Sparkles, Trash2 } from "lucide-react";
import heroImg from "@/assets/hero-map.jpg";
import { AuthorBadge } from "@/components/safeground/author-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";


type CategoryKey = "earthquakes" | "buildings" | "wells" | "reports" | "soil";
const CATS: CategoryKey[] = ["earthquakes", "buildings", "wells", "reports", "soil"];

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "InfoHub — GeoSafe AI" }] }),
  validateSearch: (s: Record<string, unknown>): { cat?: CategoryKey } => {
    const c = s.cat;
    return { cat: typeof c === "string" && (CATS as string[]).includes(c) ? (c as CategoryKey) : undefined };
  },
  component: MapHub,
});

const CATEGORIES: { key: CategoryKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "earthquakes", label: "Earthquakes", icon: Activity, color: "var(--color-risk-very-high)" },
  { key: "buildings", label: "Buildings", icon: Building2, color: "var(--color-primary)" },
  { key: "wells", label: "Wells", icon: Droplets, color: "oklch(0.6 0.12 230)" },
  { key: "reports", label: "Hazard reports", icon: Megaphone, color: "var(--color-risk-high)" },
  { key: "soil", label: "Soil data", icon: Mountain, color: "oklch(0.5 0.06 80)" },
];

function MapHub() {
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const category: CategoryKey = cat ?? "earthquakes";
  const setCategory = (k: CategoryKey) => navigate({ search: { cat: k }, replace: true });

  return (
    <AppShell>
      <section className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, #ecfeff 0%, #f0f9ff 50%, #f5f3ff 100%)" }}>
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, #bae6fd 0%, transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, #a5f3fc 0%, transparent 70%)" }} />
        <div className="container-app relative py-10 md:py-14">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium rounded-full px-3 py-1" style={{ background: "#ecfeff", color: "#155e75" }}>
            <Globe className="h-3.5 w-3.5" /> InfoHub
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight font-display">
            Explore data on the map.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse earthquakes, buildings, wells, hazard reports, and soil data — all in one place. Contribute what you know and help your community stay informed.
          </p>
        </div>
      </section>

      <div className="container-app py-6">

        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 mb-4">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <Icon className="h-3.5 w-3.5" /> {c.label}
              </button>
            );
          })}
        </div>

        {category === "earthquakes" && <EarthquakesPanel />}
        {category === "buildings" && <BuildingsPanel />}
        {category === "wells" && <WellsPanel />}
        {category === "reports" && <ReportsPanel />}
        {category === "soil" && <SoilPanel />}
      </div>
    </AppShell>
  );
}

/** Stack layout: form/info above, map below. */
function StackLayout({ markers, children, focusId = null }: { markers: MapMarker[]; children: React.ReactNode; focusId?: string | null }) {
  const center: [number, number] = useMemo(() => {
    const f = markers[0];
    return f ? [f.lat, f.lng] : [20, 0];
  }, [markers]);
  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="space-y-4 min-w-0">{children}</div>
      <div className="card-soft p-2 md:sticky md:top-20 md:self-start">
        <MapView markers={markers} center={center} zoom={markers.length ? 4 : 2} height={520} focusId={focusId} />
      </div>
    </div>
  );
}


function PanelHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function AddBar({ icon, title, subtitle, addLabel, onAdd, isGuest }: { icon: React.ReactNode; title: string; subtitle: string; addLabel: string; onAdd: () => void; isGuest: boolean }) {
  return (
    <div className="card-soft p-4 flex items-center justify-between gap-3 flex-wrap">
      <PanelHeader icon={icon} title={title} subtitle={subtitle} />
      <button
        onClick={onAdd}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2"
      >
        {isGuest ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isGuest ? "Sign in to add" : addLabel}
      </button>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass("pl-9")}
      />
    </div>
  );
}



/** Subscribe to realtime changes on a table and invalidate a query key. */
function useRealtime(table: string, queryKey: unknown[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`rt-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}

/* ------------------------------ EARTHQUAKES ------------------------------ */

const FEEDS: { id: UsgsFeed; label: string }[] = [
  { id: "all_hour", label: "Past hour" },
  { id: "2.5_day", label: "Last 24h" },
  { id: "4.5_day", label: "M4.5+ day" },
  { id: "significant_week", label: "Significant 7d" },
];

function EarthquakesPanel() {
  const [feed, setFeed] = useState<UsgsFeed>("2.5_day");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["usgs", feed],
    queryFn: () => fetchRecentEarthquakes(feed),
    refetchInterval: 60_000,
  });
  const quakes = data ?? [];
  const filtered = quakes.filter((q) => q.place.toLowerCase().includes(query.trim().toLowerCase()));
  const markers: MapMarker[] = filtered.map((q) => ({
    id: `q-${q.id}`, lat: q.latitude, lng: q.longitude, color: magnitudeColor(q.magnitude), title: q.place,
    popupHtml: `<strong>M${q.magnitude.toFixed(1)}</strong><br/>${esc(q.place)}<br/><span style="color:#666">${q.depth.toFixed(0)} km deep</span>`,
  }));

  return (
    <StackLayout markers={markers} focusId={selectedId ? `q-${selectedId}` : null}>
      <div className="card-soft p-5 md:col-span-2 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <PanelHeader icon={<Activity className="h-5 w-5" />} title="Live earthquakes" subtitle="Real-time USGS feed (read-only)." />
          <div className="flex flex-wrap gap-1.5">
            {FEEDS.map((f) => (
              <button key={f.id} onClick={() => setFeed(f.id)}
                className={`rounded-full border px-2.5 py-1 text-xs ${feed === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <SearchBar value={query} onChange={setQuery} placeholder="Search earthquakes by place…" />
        <div className="max-h-[400px] overflow-auto -mx-2">
          {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}
          <ul className="divide-y divide-border">
            {filtered.slice(0, 50).map((q) => {
              const active = q.id === selectedId;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(active ? null : q.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 transition ${active ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                    aria-pressed={active}
                  >
                    <MagnitudeBadge mag={q.magnitude} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{q.place}</div>
                      <div className="text-[11px] text-muted-foreground">{q.depth.toFixed(0)} km · {formatDistanceToNow(q.time)} ago</div>
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && !isLoading && <li className="p-6 text-center text-sm text-muted-foreground">{query ? "No matches." : "No earthquakes in this feed."}</li>}
          </ul>
        </div>
      </div>
    </StackLayout>
  );
}


/* ------------------------------ BUILDINGS ------------------------------ */

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function BuildingsPanel() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const { isProfessional } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useRealtime("buildings", ["buildings"]);
  const q = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => (await supabase.from("buildings").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [query, setQuery] = useState("");
  const ql = query.trim().toLowerCase();
  const filtered = ql ? items.filter((b) => (b.name?.toLowerCase().includes(ql) || b.address?.toLowerCase().includes(ql))) : items;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((b) => b.id === selectedId) ?? null;


  const create = useMutation({
    mutationFn: async (p: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial; latitude: number | null; longitude: number | null; photo_url: string | null; extras: Record<string, unknown>; professional_notes: string | null }) => {
      const r = assessRisk({ yearBuilt: p.year_built, floors: p.floors, material: p.material });
      const { data, error } = await supabase.from("buildings").insert({ user_id: user!.id, ...p, risk_score: r.score } as any).select("id").single();
      if (error) throw error;
      return { id: data!.id as string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["trust-badge"] });
      setSelectedId(r.id);
      setOpen(false);
      toast.success("Building saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });


  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("buildings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buildings"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = filtered.flatMap((b) => {
    if (b.latitude == null || b.longitude == null) return [];
    const r = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
    return [{
      id: `b-${b.id}`, lat: b.latitude, lng: b.longitude, color: riskCategoryColor(r.category), title: b.name,
      popupHtml: `<strong>${esc(b.name)}</strong><br/><span style="color:#666">${esc(b.address)}</span><br/>${r.category} (${r.score}/100) · ${MATERIAL_LABELS[b.material as BuildingMaterial]}`,
    }];
  });


  const handleAdd = () => {
    if (!user) {
      toast.info("Please sign in to add a building.");
      navigate({ to: "/auth" });
      return;
    }
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <AddBar
        icon={<Building2 className="h-5 w-5" />}
        title="Buildings"
        subtitle={items.length ? `${items.length} record${items.length === 1 ? "" : "s"}` : "No buildings yet."}
        addLabel="Add Building"
        onAdd={handleAdd}
        isGuest={!user}
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search buildings by name or address…" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="card-soft p-2 max-h-[460px] md:max-h-[600px] overflow-auto min-w-0">
        <ul className="divide-y divide-border">
          {filtered.map((b) => {
            const r = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
            const active = b.id === selectedId;
            return (
              <li key={b.id} className={active ? "bg-primary/5" : "hover:bg-secondary/40"}>
                <button
                  type="button"
                  onClick={() => setSelectedId(active ? null : b.id)}
                  className="w-full text-left p-3 flex items-center gap-3 cursor-pointer"
                  aria-expanded={active}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{b.address}</div>
                    <div className="mt-1"><AuthorBadge userId={b.user_id} /></div>
                  </div>
                  <RiskPill category={r.category} score={r.score} />
                  {b.user_id === user?.id && (
                    <span onClick={(e) => { e.stopPropagation(); remove.mutate(b.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)] inline-flex" role="button" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
                {active && (
                  <div className="px-3 pb-3">
                    <BuildingDetail item={b} />
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{ql ? "No matches." : (user ? "No buildings yet. Click \"Add Building\" to create one." : "No buildings yet. Sign in to add one.")}</li>}
        </ul>
        </div>

        <div className="card-soft p-2 md:sticky md:top-20 md:self-start">
          <MapView markers={markers} center={markers[0] ? [markers[0].lat, markers[0].lng] : [20, 0]} zoom={markers.length ? 4 : 2} height={420} focusId={selectedId ? `b-${selectedId}` : null} />
        </div>
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Add a building</DialogTitle>
            <DialogDescription>
              {isProfessional ? "Professional submission — include engineering measurements." : "Submit details and report any visible damage."}
            </DialogDescription>
          </DialogHeader>
          <BuildingForm isProfessional={isProfessional} submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}


function BuildingDetail({ item }: { item: any }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateBrief);
  const r = assessRisk({ yearBuilt: item.year_built, floors: item.floors, material: item.material as BuildingMaterial });
  const ai = useMutation({
    mutationFn: async () => gen({ data: { kind: "building", id: item.id, name: item.name, address: item.address, year_built: item.year_built, floors: item.floors, material: MATERIAL_LABELS[item.material as BuildingMaterial], risk_score: r.score, risk_category: r.category } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });
  return (
    <div className="card-soft p-5 space-y-4 border-l-4" style={{ borderLeftColor: riskCategoryColor(r.category) }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Building report</div>
          <div className="mt-1 font-display text-lg font-semibold">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.address} · {MATERIAL_LABELS[item.material as BuildingMaterial]} · {item.floors} floors · built {item.year_built}</div>
          <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">Submitted by <AuthorBadge userId={item.user_id} /></div>
        </div>
        <RiskPill category={r.category} score={r.score} />
      </div>
      <p className="text-sm text-muted-foreground">{r.explanation}</p>
      <ExtrasBlock extras={item.extras} photoUrl={item.photo_url} />
      <ProfessionalNotesBlock notes={item.professional_notes} />
      <AiBriefBlock brief={item.ai_brief} pending={ai.isPending} onGenerate={() => ai.mutate()} />
      <Comments targetType="building" targetId={item.id} />
    </div>
  );
}


function BuildingForm({ onSubmit, submitting, isProfessional }: {
  onSubmit: (p: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial; latitude: number | null; longitude: number | null; photo_url: string | null; extras: Record<string, unknown>; professional_notes: string | null }) => void;
  submitting: boolean;
  isProfessional: boolean;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [floors, setFloors] = useState("");
  const [material, setMaterial] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  // local
  const [damage, setDamage] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  // professional
  const [structural, setStructural] = useState("");
  const [foundation, setFoundation] = useState("");
  const [inspection, setInspection] = useState("");
  const [loadCapacity, setLoadCapacity] = useState("");
  const [proNotes, setProNotes] = useState("");

  return (
    <form onFocusCapture={selectOnFocus}
      className="mt-4 grid gap-3 sm:grid-cols-2 [&_input]:min-w-0 [&_select]:min-w-0 [&_textarea]:min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;
        if (!yearBuilt.trim() || !floors.trim() || !material) { toast.error("Year built, floors and material are required"); return; }
        const latN = lat.trim() ? Number(lat) : null;
        const lngN = lng.trim() ? Number(lng) : null;
        const extras: Record<string, unknown> = isProfessional
          ? { structural_condition: structural || null, foundation_type: foundation || null, last_inspection: inspection || null, load_capacity_kn_m2: loadCapacity ? Number(loadCapacity) : null }
          : { visible_damage: damage || null };
        onSubmit({
          name: name.trim().slice(0, 80), address: address.trim().slice(0, 200),
          year_built: Math.min(new Date().getFullYear(), Math.max(1800, parseInt(yearBuilt, 10))),
          floors: Math.min(150, Math.max(1, parseInt(floors, 10))),
          material: material as BuildingMaterial, latitude: latN, longitude: lngN,
          photo_url: photoUrl.trim() ? safeUrl(photoUrl) : null,
          extras,
          professional_notes: proNotes.trim() ? proNotes.trim().slice(0, 2000) : null,
        });
      }}
    >
      <Field label="Name" className="sm:col-span-2"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Address" className="sm:col-span-2"><input className={inputClass()} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} /></Field>
      <Field label="Year built"><input type="number" className={inputClass()} min={1800} max={new Date().getFullYear()} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} /></Field>
      <Field label="Floors"><input type="number" className={inputClass()} min={1} max={150} value={floors} onChange={(e) => setFloors(e.target.value)} /></Field>
      <Field label="Material" className="sm:col-span-2">
        <select className={inputClass()} value={material} onChange={(e) => setMaterial(e.target.value)}>
          <option value="">Select…</option>
          {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
        </select>
      </Field>
      <Field label="Latitude"><input type="number" step="any" className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
      <Field label="Longitude"><input type="number" step="any" className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} /></Field>

      {isProfessional ? (
        <>
          <Field label="Structural condition" className="sm:col-span-2">
            <select className={inputClass()} value={structural} onChange={(e) => setStructural(e.target.value)}>
              <option value="">Select…</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Foundation type">
            <select className={inputClass()} value={foundation} onChange={(e) => setFoundation(e.target.value)}>
              <option value="">Select…</option>
              <option value="strip">Strip</option>
              <option value="raft">Raft / mat</option>
              <option value="pile">Pile</option>
              <option value="pad">Pad</option>
            </select>
          </Field>
          <Field label="Load capacity (kN/m²)"><input type="number" step="0.1" className={inputClass()} value={loadCapacity} onChange={(e) => setLoadCapacity(e.target.value)} /></Field>
          <Field label="Last inspection date" className="sm:col-span-2"><input type="date" className={inputClass()} value={inspection} onChange={(e) => setInspection(e.target.value)} /></Field>
        </>
      ) : (
        <>
          <Field label="Visible damage" className="sm:col-span-2">
            <textarea className={inputClass("min-h-20")} maxLength={1000} value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="e.g. cracks on outer wall, leaking roof…" />
          </Field>
          <Field label="Photo URL of damaged area" className="sm:col-span-2"><input className={inputClass()} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" maxLength={500} /></Field>
        </>
      )}

      {isProfessional && (
        <Field label="Professional notes" className="sm:col-span-2">
          <textarea className={inputClass("min-h-20")} maxLength={2000} value={proNotes} onChange={(e) => setProNotes(e.target.value)} placeholder="Engineering observations, recommendations…" />
        </Field>
      )}


      <div className="sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <LocationButton onLocate={(la, lo) => { setLat(la); setLng(lo); }} />
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> {submitting ? "Saving…" : "Save & generate report"}
        </button>
      </div>
    </form>
  );
}



/* ------------------------------ WELLS ------------------------------ */

const WELL_TYPES = ["Domestic", "Irrigation", "Monitoring", "Industrial"];

function WellsPanel() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const { isProfessional } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useRealtime("wells", ["wells"]);
  const q = useQuery({
    queryKey: ["wells"],
    queryFn: async () => (await supabase.from("wells").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [query, setQuery] = useState("");
  const ql = query.trim().toLowerCase();
  const filtered = ql ? items.filter((w) => (w.name?.toLowerCase().includes(ql) || w.address?.toLowerCase().includes(ql))) : items;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((w) => w.id === selectedId) ?? null;


  const create = useMutation({
    mutationFn: async (p: { name: string; address: string | null; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number; photo_url: string | null; extras: Record<string, unknown>; professional_notes: string | null }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("wells").insert({ user_id: user!.id, ...p, measured_at: now } as any).select("id").single();
      if (error) throw error;
      await supabase.from("well_readings").insert({ well_id: data!.id, user_id: user!.id, level_m: p.current_level_m, measured_at: now });
      return { id: data!.id as string };
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["wells"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); setSelectedId(r.id); setOpen(false); toast.success("Well registered"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wells").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wells"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });


  const markers: MapMarker[] = filtered.map((w) => ({
    id: `w-${w.id}`, lat: w.latitude, lng: w.longitude, color: "oklch(0.6 0.12 230)", title: w.name,
    popupHtml: `<strong>${esc(w.name)}</strong><br/>${esc(w.well_type)}<br/>Level: ${w.current_level_m ?? "—"} m`,
  }));


  const handleAdd = () => {
    if (!user) { toast.info("Please sign in to register a well."); navigate({ to: "/auth" }); return; }
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <AddBar
        icon={<Droplets className="h-5 w-5" />}
        title="Wells"
        subtitle={items.length ? `${items.length} record${items.length === 1 ? "" : "s"}` : "No wells yet."}
        addLabel="Register Well"
        onAdd={handleAdd}
        isGuest={!user}
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search wells by name or address…" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="card-soft p-2 max-h-[460px] md:max-h-[600px] overflow-auto min-w-0">
        <ul className="divide-y divide-border">

          {filtered.map((w) => {
            const active = w.id === selectedId;
            return (
              <li key={w.id} className={active ? "bg-primary/5" : "hover:bg-secondary/40"}>
                <button
                  type="button"
                  onClick={() => setSelectedId(active ? null : w.id)}
                  className="w-full text-left p-3 flex items-center gap-3 cursor-pointer"
                  aria-expanded={active}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    {w.address && <div className="text-[11px] text-muted-foreground truncate">{w.address}</div>}
                    <div className="text-[11px] text-muted-foreground">{w.well_type} · Level {w.current_level_m ?? "—"} m</div>
                    <div className="mt-1"><AuthorBadge userId={w.user_id} /></div>
                  </div>
                  {w.user_id === user?.id && (
                    <span onClick={(e) => { e.stopPropagation(); remove.mutate(w.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)] inline-flex" role="button" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
                {active && (
                  <div className="px-3 pb-3">
                    <WellDetail item={w} />
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{ql ? "No matches." : "No wells yet."}</li>}
        </ul>
      </div>

      <div className="card-soft p-2 md:sticky md:top-20 md:self-start">

        <MapView markers={markers} center={markers[0] ? [markers[0].lat, markers[0].lng] : [20, 0]} zoom={markers.length ? 4 : 2} height={420} focusId={selectedId ? `w-${selectedId}` : null} />
      </div>
      </div>



      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Register a well</DialogTitle>
            <DialogDescription>
              {isProfessional ? "Professional submission — include hydrogeological measurements." : "Track groundwater levels and report visible issues."}
            </DialogDescription>
          </DialogHeader>
          <WellForm isProfessional={isProfessional} submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}


function WellDetail({ item }: { item: any }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateBrief);
  const ai = useMutation({
    mutationFn: async () => gen({ data: { kind: "well", id: item.id, name: item.name, well_type: item.well_type, total_depth_m: Number(item.total_depth_m ?? 0), current_level_m: Number(item.current_level_m ?? 0) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wells"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });
  return (
    <div className="card-soft p-5 space-y-4 border-l-4" style={{ borderLeftColor: "oklch(0.6 0.12 230)" }}>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Well report</div>
        <div className="mt-1 font-display text-lg font-semibold">{item.name}</div>
        {item.address && <div className="text-xs text-muted-foreground">{item.address}</div>}
        <div className="text-xs text-muted-foreground">{item.well_type} · depth {item.total_depth_m ?? "—"} m · level {item.current_level_m ?? "—"} m</div>
        <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">Submitted by <AuthorBadge userId={item.user_id} /></div>
      </div>
      <ExtrasBlock extras={item.extras} photoUrl={item.photo_url} />
      <ProfessionalNotesBlock notes={item.professional_notes} />
      <AiBriefBlock brief={item.ai_brief} pending={ai.isPending} onGenerate={() => ai.mutate()} />
      <Comments targetType="well" targetId={item.id} />
    </div>
  );
}


function WellForm({ onSubmit, submitting, isProfessional }: { onSubmit: (p: { name: string; address: string | null; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number; photo_url: string | null; extras: Record<string, unknown>; professional_notes: string | null }) => void; submitting: boolean; isProfessional: boolean }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [type, setType] = useState("");
  const [depth, setDepth] = useState(""); const [level, setLevel] = useState("");
  // local
  const [issues, setIssues] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  // professional
  const [ph, setPh] = useState("");
  const [yieldLpm, setYieldLpm] = useState("");
  const [drilling, setDrilling] = useState("");
  const [casingDiameter, setCasingDiameter] = useState("");
  const [proNotes, setProNotes] = useState("");
  return (
    <form onFocusCapture={selectOnFocus} className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (!name.trim() || Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Name and coordinates required"); return; }
        if (!type) { toast.error("Please select a well type"); return; }
        const extras: Record<string, unknown> = isProfessional
          ? { water_ph: ph ? Number(ph) : null, yield_lpm: yieldLpm ? Number(yieldLpm) : null, drilling_method: drilling || null, casing_diameter_mm: casingDiameter ? Number(casingDiameter) : null }
          : { visible_issues: issues || null };
        onSubmit({
          name: name.trim().slice(0, 80),
          address: address.trim() ? address.trim().slice(0, 200) : null,
          latitude: la, longitude: lo, well_type: type, total_depth_m: depth ? parseFloat(depth) : 0, current_level_m: level ? parseFloat(level) : 0,
          photo_url: photoUrl.trim() ? safeUrl(photoUrl) : null, extras,
          professional_notes: proNotes.trim() ? proNotes.trim().slice(0, 2000) : null,
        });
      }}>
      <Field label="Name"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Type">
        <select className={inputClass()} value={type} onChange={(e) => setType(e.target.value)}><option value="">Select…</option>{WELL_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </Field>
      <Field label="Address" className="sm:col-span-2"><input className={inputClass()} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Street, city, area…" /></Field>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
      <Field label="Total depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(e.target.value)} /></Field>
      <Field label="Water level (m)"><input type="number" step="0.01" className={inputClass()} value={level} onChange={(e) => setLevel(e.target.value)} /></Field>

      {isProfessional ? (
        <>
          <Field label="Water pH"><input type="number" step="0.1" className={inputClass()} value={ph} onChange={(e) => setPh(e.target.value)} /></Field>
          <Field label="Yield (L/min)"><input type="number" step="0.1" className={inputClass()} value={yieldLpm} onChange={(e) => setYieldLpm(e.target.value)} /></Field>
          <Field label="Drilling method">
            <select className={inputClass()} value={drilling} onChange={(e) => setDrilling(e.target.value)}>
              <option value="">Select…</option>
              <option value="rotary">Rotary</option>
              <option value="percussion">Percussion</option>
              <option value="auger">Auger</option>
              <option value="hand-dug">Hand-dug</option>
            </select>
          </Field>
          <Field label="Casing diameter (mm)"><input type="number" step="1" className={inputClass()} value={casingDiameter} onChange={(e) => setCasingDiameter(e.target.value)} /></Field>
        </>
      ) : (
        <>
          <Field label="Visible issues / damage" className="sm:col-span-2">
            <textarea className={inputClass("min-h-20")} maxLength={1000} value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="e.g. low water, cloudy water, broken cover…" />
          </Field>
          <Field label="Photo URL of damaged area" className="sm:col-span-2"><input className={inputClass()} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" maxLength={500} /></Field>
        </>
      )}

      {isProfessional && (
        <Field label="Professional notes" className="sm:col-span-2">
          <textarea className={inputClass("min-h-20")} maxLength={2000} value={proNotes} onChange={(e) => setProNotes(e.target.value)} placeholder="Hydrogeological observations, recommendations…" />
        </Field>
      )}


      <div className="sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <LocationButton onLocate={(la, lo) => { setLat(la); setLng(lo); }} />
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> {submitting ? "Saving…" : "Register well"}
        </button>
      </div>
    </form>
  );
}



/* ------------------------------ REPORTS ------------------------------ */

const HAZARD_TYPES: HazardType[] = ["earthquake-damage", "flooding", "landslide", "ground-crack"];

function ReportsPanel() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useRealtime("hazard_reports", ["hazard_reports"]);
  const q = useQuery({
    queryKey: ["hazard_reports"],
    queryFn: async () => (await supabase.from("hazard_reports").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ql = query.trim().toLowerCase();
  const filtered = ql ? items.filter((r) => {
    const label = (HAZARD_LABELS[r.kind as HazardType] ?? r.kind ?? "").toLowerCase();
    return label.includes(ql) || (r.description ?? "").toLowerCase().includes(ql);
  }) : items;



  const create = useMutation({
    mutationFn: async (p: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => {
      const { error } = await supabase.from("hazard_reports").insert({ user_id: user!.id, ...p });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hazard_reports"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); setOpen(false); toast.success("Report submitted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hazard_reports").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hazard_reports"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = filtered.map((r) => ({
    id: `r-${r.id}`, lat: r.latitude, lng: r.longitude, color: "var(--color-risk-high)", title: r.kind,
    popupHtml: `<strong>${esc(HAZARD_LABELS[r.kind as HazardType] ?? r.kind)}</strong><br/>${esc(r.description)}`,
  }));


  const handleAdd = () => {
    if (!user) { toast.info("Please sign in to submit a report."); navigate({ to: "/auth" }); return; }
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <AddBar
        icon={<Megaphone className="h-5 w-5" />}
        title="Hazard reports"
        subtitle={items.length ? `${items.length} report${items.length === 1 ? "" : "s"}` : "No reports yet."}
        addLabel="Submit Report"
        onAdd={handleAdd}
        isGuest={!user}
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search reports by type or description…" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="card-soft p-2 max-h-[460px] md:max-h-[600px] overflow-auto min-w-0">
        <ul className="divide-y divide-border">
          {filtered.map((r) => {
            const active = r.id === selectedId;
            return (
              <li key={r.id} className={active ? "bg-primary/5" : "hover:bg-secondary/40"}>
                <button
                  type="button"
                  onClick={() => setSelectedId(active ? null : r.id)}
                  className="w-full text-left p-3 flex items-start gap-3 cursor-pointer"
                  aria-expanded={active}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{HAZARD_LABELS[r.kind as HazardType] ?? r.kind}</div>
                    {!active && <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(r.created_at).getTime())} ago</div>
                    <div className="mt-1"><AuthorBadge userId={r.user_id} /></div>
                  </div>
                  {r.user_id === user?.id && (
                    <span onClick={(e) => { e.stopPropagation(); remove.mutate(r.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)] inline-flex" role="button" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
                {active && (
                  <div className="px-3 pb-3">
                    <ReportDetail item={r} />
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{ql ? "No matches." : "No reports yet."}</li>}


        </ul>
      </div>
      <div className="card-soft p-2 md:sticky md:top-20 md:self-start">
        <MapView markers={markers} center={markers[0] ? [markers[0].lat, markers[0].lng] : [20, 0]} zoom={markers.length ? 4 : 2} height={420} />
      </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Submit a hazard report</DialogTitle>
            <DialogDescription>Tell the community what you're seeing.</DialogDescription>
          </DialogHeader>
          <ReportForm submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportDetail({ item }: { item: any }) {
  return (
    <div className="card-soft p-4 space-y-3 border-l-4" style={{ borderLeftColor: "var(--color-risk-high)" }}>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Hazard report</div>
        <div className="mt-1 font-display text-base font-semibold">{HAZARD_LABELS[item.kind as HazardType] ?? item.kind}</div>
        <div className="text-[11px] text-muted-foreground">Severity: {item.severity} · {formatDistanceToNow(new Date(item.created_at).getTime())} ago</div>
        <div className="text-[11px] text-muted-foreground">Coords: {Number(item.latitude).toFixed(3)}, {Number(item.longitude).toFixed(3)}</div>
        <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">Submitted by <AuthorBadge userId={item.user_id} /></div>
      </div>
      <p className="text-sm whitespace-pre-line">{item.description}</p>
      {item.image_url && (
        <a href={item.image_url} target="_blank" rel="noreferrer" className="block">
          <img src={item.image_url} alt="Report" className="max-h-64 w-full object-cover rounded-md border border-border" />
        </a>
      )}
      
    </div>
  );
}


function ReportForm({ onSubmit, submitting }: { onSubmit: (p: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => void; submitting: boolean }) {
  const [kind, setKind] = useState<HazardType | "">("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  return (
    <form onFocusCapture={selectOnFocus} className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (!kind) { toast.error("Please select a hazard type"); return; }
        if (!severity) { toast.error("Please select a severity"); return; }
        if (!description.trim() || Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Description and coordinates required"); return; }
        let safe: string | undefined;
        if (imageUrl.trim()) { try { const u = new URL(imageUrl.trim()); if (u.protocol.startsWith("http")) safe = u.toString(); } catch {} }
        onSubmit({ kind: kind as HazardType, severity, description: description.trim().slice(0, 1000), latitude: la, longitude: lo, image_url: safe });
      }}>
      <Field label="Type" className="sm:col-span-2">
        <div className="grid grid-cols-2 gap-2">
          {HAZARD_TYPES.map((t) => (
            <button type="button" key={t} onClick={() => setKind(t)}
              className={`rounded-md border px-3 py-2 text-xs text-left transition ${kind === t ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
              {HAZARD_LABELS[t]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Severity">
        <select className={inputClass()} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Select…</option>
          <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
        </select>
      </Field>
      <Field label="Image URL (optional)"><input className={inputClass()} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" maxLength={500} /></Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea className={inputClass("min-h-20")} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </Field>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
      <div className="sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <LocationButton onLocate={(la, lo) => { setLat(la); setLng(lo); }} />
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------ SOIL ------------------------------ */

const SOIL_TYPES = ["Clay", "Silt", "Sand", "Gravel", "Loam", "Peat", "Rocky", "Mixed"];

function SoilPanel() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const { isProfessional } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useRealtime("soil_data", ["soil_data"]);
  const q = useQuery({
    queryKey: ["soil_data"],
    queryFn: async () => (await supabase.from("soil_data").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [query, setQuery] = useState("");
  const ql = query.trim().toLowerCase();
  const filtered = ql ? items.filter((s) => ((s.name ?? "").toLowerCase().includes(ql) || (s.address ?? "").toLowerCase().includes(ql) || (s.soil_type ?? "").toLowerCase().includes(ql))) : items;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((s) => s.id === selectedId) ?? null;


  const create = useMutation({
    mutationFn: async (p: { name: string | null; address: string | null; latitude: number; longitude: number; soil_type: string; depth_m: number; notes: string; photo_url: string | null; extras: Record<string, unknown> }) => {
      const { data, error } = await supabase.from("soil_data").insert({ user_id: user!.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude, soil_type: p.soil_type, depth_m: p.depth_m, layers: [], notes: p.notes || null, photo_url: p.photo_url, extras: p.extras } as any).select("id").single();
      if (error) throw error;
      return { id: data!.id as string };
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["soil_data"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); setSelectedId(r.id); setOpen(false); toast.success("Soil record added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("soil_data").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["soil_data"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = filtered.map((s) => ({
    id: `s-${s.id}`, lat: s.latitude, lng: s.longitude, color: "oklch(0.5 0.06 80)", title: s.soil_type,
    popupHtml: `<strong>Soil: ${esc(s.soil_type)}</strong><br/>Depth: ${s.depth_m} m`,
  }));


  const handleAdd = () => {
    if (!user) { toast.info("Please sign in to add soil data."); navigate({ to: "/auth" }); return; }
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <AddBar
        icon={<Mountain className="h-5 w-5" />}
        title="Soil data"
        subtitle={items.length ? `${items.length} record${items.length === 1 ? "" : "s"}` : "No soil data yet."}
        addLabel="Add Soil Data"
        onAdd={handleAdd}
        isGuest={!user}
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search soil records by name, address or type…" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="card-soft p-2 max-h-[460px] md:max-h-[600px] overflow-auto min-w-0">
        <ul className="divide-y divide-border">
          {filtered.map((s) => {
            const active = s.id === selectedId;
            return (
              <li key={s.id} className={active ? "bg-primary/5" : "hover:bg-secondary/40"}>
                <button
                  type="button"
                  onClick={() => setSelectedId(active ? null : s.id)}
                  className="w-full text-left p-3 flex items-center gap-3 cursor-pointer"
                  aria-expanded={active}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{s.name || s.soil_type}</div>
                    {s.address && <div className="text-[11px] text-muted-foreground truncate">{s.address}</div>}
                    <div className="text-[11px] text-muted-foreground">{s.soil_type} · Depth {Number(s.depth_m).toFixed(1)} m · {formatDistanceToNow(new Date(s.created_at).getTime())} ago</div>
                    <div className="mt-1"><AuthorBadge userId={s.user_id} /></div>
                  </div>
                  {s.user_id === user?.id && (
                    <span onClick={(e) => { e.stopPropagation(); remove.mutate(s.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)] inline-flex" role="button" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
                {active && (
                  <div className="px-3 pb-3">
                    <SoilDetail item={s} />
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{ql ? "No matches." : "No soil data yet."}</li>}

        </ul>
      </div>
      <div className="card-soft p-2 md:sticky md:top-20 md:self-start">
        <MapView markers={markers} center={markers[0] ? [markers[0].lat, markers[0].lng] : [20, 0]} zoom={markers.length ? 4 : 2} height={420} />
      </div>
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Add soil data</DialogTitle>
            <DialogDescription>
              {isProfessional ? "Professional soil profile — add measurements & notes." : "Report visible soil conditions in your area."}
            </DialogDescription>
          </DialogHeader>
          <SoilForm isProfessional={isProfessional} submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}


function SoilDetail({ item }: { item: any }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateBrief);
  const ai = useMutation({
    mutationFn: async () => gen({ data: { kind: "soil", id: item.id, soil_type: item.soil_type, depth_m: Number(item.depth_m ?? 0), notes: item.notes ?? null, extras: item.extras ?? null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soil_data"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });
  return (
    <div className="card-soft p-5 space-y-4 border-l-4" style={{ borderLeftColor: "oklch(0.5 0.06 80)" }}>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Soil report</div>
        <div className="mt-1 font-display text-lg font-semibold">{item.name || item.soil_type}</div>
        {item.address && <div className="text-xs text-muted-foreground">{item.address}</div>}
        <div className="text-xs text-muted-foreground">{item.soil_type} · Depth {Number(item.depth_m).toFixed(1)} m</div>
        <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">Submitted by <AuthorBadge userId={item.user_id} /></div>
      </div>

      {item.notes && (
        <div className="rounded-md border border-border bg-background p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{item.notes}</p>
        </div>
      )}
      <ExtrasBlock extras={item.extras} photoUrl={item.photo_url} />
      <AiBriefBlock brief={item.ai_brief} pending={ai.isPending} onGenerate={() => ai.mutate()} />
    </div>
  );
}

function SoilForm({ onSubmit, submitting, isProfessional }: { onSubmit: (p: { name: string | null; address: string | null; latitude: number; longitude: number; soil_type: string; depth_m: number; notes: string; photo_url: string | null; extras: Record<string, unknown> }) => void; submitting: boolean; isProfessional: boolean }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [soilType, setSoilType] = useState("");
  const [depth, setDepth] = useState("");
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [notes, setNotes] = useState("");
  // local
  const [visible, setVisible] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  // professional
  const [bearing, setBearing] = useState("");
  const [moisture, setMoisture] = useState("");
  const [permeability, setPermeability] = useState("");
  const [spt, setSpt] = useState("");
  return (
    <form onFocusCapture={selectOnFocus} className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (!name.trim() || !address.trim()) { toast.error("Name and address required"); return; }
        if (!soilType) { toast.error("Please select a soil type"); return; }
        if (Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Coordinates required"); return; }
        const extras: Record<string, unknown> = isProfessional
          ? { bearing_capacity_kpa: bearing ? Number(bearing) : null, moisture_pct: moisture ? Number(moisture) : null, permeability_cm_s: permeability ? Number(permeability) : null, spt_n_value: spt ? Number(spt) : null }
          : { visible_condition: visible || null };
        onSubmit({
          name: name.trim().slice(0, 80),
          address: address.trim().slice(0, 200),
          latitude: la, longitude: lo, soil_type: soilType, depth_m: depth ? parseFloat(depth) : 0, notes: notes.slice(0, 1000),
          photo_url: photoUrl.trim() ? safeUrl(photoUrl) : null, extras,
        });
      }}>
      <Field label="Name" className="sm:col-span-2"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="e.g. North field borehole #2" /></Field>
      <Field label="Address" className="sm:col-span-2"><input className={inputClass()} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} placeholder="Street, city, area…" /></Field>

      <Field label="Soil type">
        <select className={inputClass()} value={soilType} onChange={(e) => setSoilType(e.target.value)}>
          <option value="">Select…</option>
          {SOIL_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(e.target.value)} /></Field>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>


      {isProfessional ? (
        <>
          <Field label="Bearing capacity (kPa)"><input type="number" step="0.1" className={inputClass()} value={bearing} onChange={(e) => setBearing(e.target.value)} /></Field>
          <Field label="Moisture content (%)"><input type="number" step="0.1" className={inputClass()} value={moisture} onChange={(e) => setMoisture(e.target.value)} /></Field>
          <Field label="Permeability (cm/s)"><input type="number" step="0.0001" className={inputClass()} value={permeability} onChange={(e) => setPermeability(e.target.value)} /></Field>
          <Field label="SPT N-value"><input type="number" step="1" className={inputClass()} value={spt} onChange={(e) => setSpt(e.target.value)} /></Field>
          <Field label="Professional notes" className="sm:col-span-2">
            <textarea className={inputClass("min-h-20")} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Layer descriptions, observations, recommendations…" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Visible soil condition" className="sm:col-span-2">
            <textarea className={inputClass("min-h-20")} value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={1000} placeholder="e.g. cracks, erosion, waterlogging…" />
          </Field>
          <Field label="Photo URL of damaged area" className="sm:col-span-2"><input className={inputClass()} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" maxLength={500} /></Field>
          <Field label="Additional notes" className="sm:col-span-2">
            <textarea className={inputClass("min-h-16")} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </Field>
        </>
      )}

      <div className="sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <LocationButton onLocate={(la, lo) => { setLat(la); setLng(lo); }} />
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> {submitting ? "Saving…" : "Save record"}
        </button>
      </div>
    </form>
  );
}


/* ------------------------------ AI brief + Comments ------------------------------ */

function ProfessionalNotesBlock({ notes }: { notes: string | null | undefined }) {
  if (!notes) return null;
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
        <MessageSquare className="h-3.5 w-3.5" /> Professional notes
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{notes}</p>
    </div>
  );
}

function AiBriefBlock({ brief, pending, onGenerate }: { brief: string | null | undefined; pending: boolean; onGenerate: () => void }) {

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI brief
        </div>
        <button onClick={onGenerate} disabled={pending}
          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-60 inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {pending ? "Generating…" : brief ? "Regenerate" : "Generate"}
        </button>
      </div>
      {brief ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{brief}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No AI brief yet. Generate one to summarise this record in plain language.</p>
      )}
    </div>
  );
}

function Comments({ targetType, targetId }: { targetType: "building" | "well"; targetId: string }) {
  const { user } = useAuth();
  const { isProvider } = useRole();
  const qc = useQueryClient();
  const key = ["comments", targetType, targetId];
  useRealtime("comments", key);
  const q = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await supabase.from("comments").select("*").eq("target_type", targetType).eq("target_id", targetId).order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [body, setBody] = useState("");
  const post = useMutation({
    mutationFn: async () => {
      if (isProvider) throw new Error("Service providers cannot post professional comments.");
      const text = body.trim().slice(0, 1000);
      if (!text) throw new Error("Empty comment");
      const { error } = await supabase.from("comments").insert({ user_id: user!.id, target_type: targetType, target_id: targetId, body: text });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("comments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" /> Community comments ({items.length})
      </div>
      {isProvider ? (
        <div className="mt-2 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
          Service providers can read community feedback but cannot post professional comments here.
        </div>
      ) : (
        <form onFocusCapture={selectOnFocus} className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
          <input className={inputClass()} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
          <button type="submit" disabled={post.isPending || !body.trim()}
            className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1">
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
      <ul className="mt-3 space-y-2 max-h-56 overflow-auto">
        {items.map((c) => (
          <li key={c.id} className="rounded-md border border-border bg-secondary/30 p-2">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{formatDistanceToNow(new Date(c.created_at).getTime())} ago</span>
              {c.user_id === user?.id && (
                <button onClick={() => remove.mutate(c.id)} className="hover:text-[var(--color-risk-very-high)]">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1 text-sm whitespace-pre-line">{c.body}</div>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">No comments yet. Be the first.</li>}
      </ul>
    </div>
  );
}


/* ------------------------------ shared ------------------------------ */

function LocationButton({ onLocate }: { onLocate: (lat: string, lng: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy}
      onClick={() => {
        if (!navigator.geolocation) { toast.error("Geolocation unavailable"); return; }
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (p) => { onLocate(p.coords.latitude.toFixed(5), p.coords.longitude.toFixed(5)); setBusy(false); },
          (err) => { toast.error(err.message || "Could not locate"); setBusy(false); },
          { timeout: 8000 },
        );
      }}
      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      <MapPin className="h-4 w-4" /> {busy ? "Locating…" : "Use my location"}
    </button>
  );
}

function esc(s: string | null | undefined) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol.startsWith("http") ? u.toString() : null;
  } catch { return null; }
}

const EXTRA_LABELS: Record<string, string> = {
  visible_damage: "Visible damage",
  visible_issues: "Visible issues",
  visible_condition: "Visible condition",
  structural_condition: "Structural condition",
  foundation_type: "Foundation type",
  last_inspection: "Last inspection",
  load_capacity_kn_m2: "Load capacity (kN/m²)",
  water_ph: "Water pH",
  yield_lpm: "Yield (L/min)",
  drilling_method: "Drilling method",
  casing_diameter_mm: "Casing diameter (mm)",
  bearing_capacity_kpa: "Bearing capacity (kPa)",
  moisture_pct: "Moisture content (%)",
  permeability_cm_s: "Permeability (cm/s)",
  spt_n_value: "SPT N-value",
};

function ExtrasBlock({ extras, photoUrl }: { extras: Record<string, unknown> | null | undefined; photoUrl: string | null | undefined }) {
  const entries = extras ? Object.entries(extras).filter(([, v]) => v !== null && v !== undefined && v !== "") : [];
  if (entries.length === 0 && !photoUrl) return null;
  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Additional details</div>
      {entries.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-border/40 py-1">
              <dt className="text-muted-foreground">{EXTRA_LABELS[k] ?? k}</dt>
              <dd className="font-medium text-right">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img src={photoUrl} alt="Submitted" className="mt-2 max-h-64 rounded-md border border-border object-cover" />
        </a>
      )}
    </div>
  );
}

