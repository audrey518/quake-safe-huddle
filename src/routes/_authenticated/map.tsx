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
import { Field, inputClass, MagnitudeBadge, RiskPill } from "@/components/safeground/ui";
import { Activity, Building2, Droplets, Lock, MapPin, Megaphone, MessageSquare, Mountain, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CategoryKey = "earthquakes" | "buildings" | "wells" | "reports" | "soil";
const CATS: CategoryKey[] = ["earthquakes", "buildings", "wells", "reports", "soil"];

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Map — GeoSafe AI" }] }),
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
      <div className="container-app py-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Map</h1>
            <p className="text-sm text-muted-foreground mt-1">Browse one category at a time and contribute new data.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
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
function StackLayout({ markers, children }: { markers: MapMarker[]; children: React.ReactNode }) {
  const center: [number, number] = useMemo(() => {
    const f = markers[0];
    return f ? [f.lat, f.lng] : [20, 0];
  }, [markers]);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
      <div className="card-soft p-2">
        <MapView markers={markers} center={center} zoom={markers.length ? 4 : 2} height={520} />
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
  const { data, isLoading } = useQuery({
    queryKey: ["usgs", feed],
    queryFn: () => fetchRecentEarthquakes(feed),
    refetchInterval: 60_000,
  });
  const quakes = data ?? [];
  const markers: MapMarker[] = quakes.map((q) => ({
    id: `q-${q.id}`, lat: q.latitude, lng: q.longitude, color: magnitudeColor(q.magnitude), title: q.place,
    popupHtml: `<strong>M${q.magnitude.toFixed(1)}</strong><br/>${esc(q.place)}<br/><span style="color:#666">${q.depth.toFixed(0)} km deep</span>`,
  }));

  return (
    <StackLayout markers={markers}>
      <div className="card-soft p-5">
        <PanelHeader icon={<Activity className="h-5 w-5" />} title="Live earthquakes" subtitle="Real-time USGS feed (read-only)." />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FEEDS.map((f) => (
            <button key={f.id} onClick={() => setFeed(f.id)}
              className={`rounded-full border px-2.5 py-1 text-xs ${feed === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-soft p-2 max-h-[400px] overflow-auto">
        {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}
        <ul className="divide-y divide-border">
          {quakes.slice(0, 50).map((q) => (
            <li key={q.id} className="flex items-center gap-3 p-3">
              <MagnitudeBadge mag={q.magnitude} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{q.place}</div>
                <div className="text-[11px] text-muted-foreground">{q.depth.toFixed(0)} km · {formatDistanceToNow(q.time)} ago</div>
              </div>
            </li>
          ))}
          {quakes.length === 0 && !isLoading && <li className="p-6 text-center text-sm text-muted-foreground">No earthquakes in this feed.</li>}
        </ul>
      </div>
    </StackLayout>
  );
}

/* ------------------------------ BUILDINGS ------------------------------ */

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function BuildingsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useRealtime("buildings", ["buildings"]);
  const q = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => (await supabase.from("buildings").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((b) => b.id === selectedId) ?? null;

  const create = useMutation({
    mutationFn: async (p: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial; latitude: number | null; longitude: number | null }) => {
      const r = assessRisk({ yearBuilt: p.year_built, floors: p.floors, material: p.material });
      const { data, error } = await supabase.from("buildings").insert({ user_id: user!.id, ...p, risk_score: r.score }).select("id").single();
      if (error) throw error;
      return { id: data!.id as string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["trust-badge"] });
      setSelectedId(r.id);
      toast.success("Building saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("buildings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buildings"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = items.flatMap((b) => {
    if (b.latitude == null || b.longitude == null) return [];
    const r = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
    return [{
      id: `b-${b.id}`, lat: b.latitude, lng: b.longitude, color: riskCategoryColor(r.category), title: b.name,
      popupHtml: `<strong>${esc(b.name)}</strong><br/><span style="color:#666">${esc(b.address)}</span><br/>${r.category} (${r.score}/100) · ${MATERIAL_LABELS[b.material as BuildingMaterial]}`,
    }];
  });

  return (
    <StackLayout markers={markers}>
      <div className="card-soft p-5">
        <PanelHeader icon={<Building2 className="h-5 w-5" />} title="Add a building" subtitle="Submit details to generate a risk report." />
        <BuildingForm submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
      </div>
      <div className="card-soft p-2 max-h-[460px] overflow-auto">
        <ul className="divide-y divide-border">
          {items.map((b) => {
            const r = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
            const active = b.id === selectedId;
            return (
              <li key={b.id} className={`p-3 flex items-center gap-3 cursor-pointer ${active ? "bg-primary/5" : "hover:bg-secondary/40"}`} onClick={() => setSelectedId(b.id)}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{b.address}</div>
                </div>
                <RiskPill category={r.category} score={r.score} />
                {b.user_id === user?.id && (
                  <button onClick={(e) => { e.stopPropagation(); remove.mutate(b.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
          {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No buildings yet.</li>}
        </ul>
      </div>
      {selected && (
        <div className="md:col-span-2">
          <BuildingDetail item={selected} />
        </div>
      )}
    </StackLayout>
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
        </div>
        <RiskPill category={r.category} score={r.score} />
      </div>
      <p className="text-sm text-muted-foreground">{r.explanation}</p>
      <AiBriefBlock brief={item.ai_brief} pending={ai.isPending} onGenerate={() => ai.mutate()} />
      <Comments targetType="building" targetId={item.id} />
    </div>
  );
}

function BuildingForm({ onSubmit, submitting }: {
  onSubmit: (p: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial; latitude: number | null; longitude: number | null }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [yearBuilt, setYearBuilt] = useState(2000);
  const [floors, setFloors] = useState(2);
  const [material, setMaterial] = useState<BuildingMaterial>("reinforced-concrete");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;
        const latN = lat.trim() ? Number(lat) : null;
        const lngN = lng.trim() ? Number(lng) : null;
        onSubmit({
          name: name.trim().slice(0, 80), address: address.trim().slice(0, 200),
          year_built: Math.min(new Date().getFullYear(), Math.max(1800, yearBuilt)),
          floors: Math.min(150, Math.max(1, floors)),
          material, latitude: latN, longitude: lngN,
        });
      }}
    >
      <Field label="Name" className="sm:col-span-2"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Address" className="sm:col-span-2"><input className={inputClass()} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} /></Field>
      <Field label="Year built"><input type="number" className={inputClass()} min={1800} max={new Date().getFullYear()} value={yearBuilt} onChange={(e) => setYearBuilt(parseInt(e.target.value || "0", 10))} /></Field>
      <Field label="Floors"><input type="number" className={inputClass()} min={1} max={150} value={floors} onChange={(e) => setFloors(parseInt(e.target.value || "1", 10))} /></Field>
      <Field label="Material" className="sm:col-span-2">
        <select className={inputClass()} value={material} onChange={(e) => setMaterial(e.target.value as BuildingMaterial)}>
          {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
        </select>
      </Field>
      <Field label="Latitude"><input type="number" step="any" className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
      <Field label="Longitude"><input type="number" step="any" className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
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
  const qc = useQueryClient();
  useRealtime("wells", ["wells"]);
  const q = useQuery({
    queryKey: ["wells"],
    queryFn: async () => (await supabase.from("wells").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((w) => w.id === selectedId) ?? null;

  const create = useMutation({
    mutationFn: async (p: { name: string; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("wells").insert({ user_id: user!.id, ...p, measured_at: now }).select("id").single();
      if (error) throw error;
      await supabase.from("well_readings").insert({ well_id: data!.id, user_id: user!.id, level_m: p.current_level_m, measured_at: now });
      return { id: data!.id as string };
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["wells"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); setSelectedId(r.id); toast.success("Well registered"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wells").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wells"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = items.map((w) => ({
    id: `w-${w.id}`, lat: w.latitude, lng: w.longitude, color: "oklch(0.6 0.12 230)", title: w.name,
    popupHtml: `<strong>${esc(w.name)}</strong><br/>${esc(w.well_type)}<br/>Level: ${w.current_level_m ?? "—"} m`,
  }));

  return (
    <StackLayout markers={markers}>
      <div className="card-soft p-5">
        <PanelHeader icon={<Droplets className="h-5 w-5" />} title="Register a well" subtitle="Track groundwater levels in your area." />
        <WellForm submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
      </div>
      <div className="card-soft p-2 max-h-[460px] overflow-auto">
        <ul className="divide-y divide-border">
          {items.map((w) => {
            const active = w.id === selectedId;
            return (
              <li key={w.id} className={`p-3 flex items-center gap-3 cursor-pointer ${active ? "bg-primary/5" : "hover:bg-secondary/40"}`} onClick={() => setSelectedId(w.id)}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{w.name}</div>
                  <div className="text-[11px] text-muted-foreground">{w.well_type} · Level {w.current_level_m ?? "—"} m</div>
                </div>
                {w.user_id === user?.id && (
                  <button onClick={(e) => { e.stopPropagation(); remove.mutate(w.id); }} className="text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
          {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No wells yet.</li>}
        </ul>
      </div>
      {selected && (
        <div className="md:col-span-2">
          <WellDetail item={selected} />
        </div>
      )}
    </StackLayout>
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
        <div className="text-xs text-muted-foreground">{item.well_type} · depth {item.total_depth_m ?? "—"} m · level {item.current_level_m ?? "—"} m</div>
      </div>
      <AiBriefBlock brief={item.ai_brief} pending={ai.isPending} onGenerate={() => ai.mutate()} />
      <Comments targetType="well" targetId={item.id} />
    </div>
  );
}

function WellForm({ onSubmit, submitting }: { onSubmit: (p: { name: string; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number }) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [type, setType] = useState("Domestic");
  const [depth, setDepth] = useState(20); const [level, setLevel] = useState(5);
  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (!name.trim() || Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Name and coordinates required"); return; }
        onSubmit({ name: name.trim().slice(0, 80), latitude: la, longitude: lo, well_type: type, total_depth_m: depth, current_level_m: level });
      }}>
      <Field label="Name"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Type">
        <select className={inputClass()} value={type} onChange={(e) => setType(e.target.value)}>{WELL_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </Field>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
      <Field label="Total depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(parseFloat(e.target.value || "0"))} /></Field>
      <Field label="Water level (m)"><input type="number" step="0.01" className={inputClass()} value={level} onChange={(e) => setLevel(parseFloat(e.target.value || "0"))} /></Field>
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
  const qc = useQueryClient();
  useRealtime("hazard_reports", ["hazard_reports"]);
  const q = useQuery({
    queryKey: ["hazard_reports"],
    queryFn: async () => (await supabase.from("hazard_reports").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];

  const create = useMutation({
    mutationFn: async (p: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => {
      const { error } = await supabase.from("hazard_reports").insert({ user_id: user!.id, ...p });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hazard_reports"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); toast.success("Report submitted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hazard_reports").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hazard_reports"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = items.map((r) => ({
    id: `r-${r.id}`, lat: r.latitude, lng: r.longitude, color: "var(--color-risk-high)", title: r.kind,
    popupHtml: `<strong>${esc(HAZARD_LABELS[r.kind as HazardType] ?? r.kind)}</strong><br/>${esc(r.description)}`,
  }));

  return (
    <StackLayout markers={markers}>
      <div className="card-soft p-5">
        <PanelHeader icon={<Megaphone className="h-5 w-5" />} title="Submit a hazard report" subtitle="Tell the community what you're seeing." />
        <ReportForm submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
      </div>
      <div className="card-soft p-2 max-h-[400px] overflow-auto">
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="p-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{HAZARD_LABELS[r.kind as HazardType] ?? r.kind}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(r.created_at).getTime())} ago</div>
              </div>
              {r.user_id === user?.id && (
                <button onClick={() => remove.mutate(r.id)} className="text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No reports yet.</li>}
        </ul>
      </div>
    </StackLayout>
  );
}

function ReportForm({ onSubmit, submitting }: { onSubmit: (p: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => void; submitting: boolean }) {
  const [kind, setKind] = useState<HazardType>("earthquake-damage");
  const [severity, setSeverity] = useState("moderate");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (!description.trim() || Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Description and coordinates required"); return; }
        let safe: string | undefined;
        if (imageUrl.trim()) { try { const u = new URL(imageUrl.trim()); if (u.protocol.startsWith("http")) safe = u.toString(); } catch {} }
        onSubmit({ kind, severity, description: description.trim().slice(0, 1000), latitude: la, longitude: lo, image_url: safe });
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
  const { isProfessional } = useRole();
  const qc = useQueryClient();
  useRealtime("soil_data", ["soil_data"]);
  const q = useQuery({
    queryKey: ["soil_data"],
    queryFn: async () => (await supabase.from("soil_data").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const items = q.data ?? [];

  const create = useMutation({
    mutationFn: async (p: { latitude: number; longitude: number; soil_type: string; depth_m: number; notes: string }) => {
      const { error } = await supabase.from("soil_data").insert({ user_id: user!.id, ...p, layers: [], notes: p.notes || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["soil_data"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); toast.success("Soil record added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("soil_data").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["soil_data"] }); qc.invalidateQueries({ queryKey: ["trust-badge"] }); },
  });

  const markers: MapMarker[] = items.map((s) => ({
    id: `s-${s.id}`, lat: s.latitude, lng: s.longitude, color: "oklch(0.5 0.06 80)", title: s.soil_type,
    popupHtml: `<strong>Soil: ${esc(s.soil_type)}</strong><br/>Depth: ${s.depth_m} m`,
  }));

  return (
    <StackLayout markers={markers}>
      <div className="card-soft p-5">
        <PanelHeader icon={<Mountain className="h-5 w-5" />} title="Soil data" subtitle="Submitted by professional contributors." />
        {isProfessional ? (
          <SoilForm submitting={create.isPending} onSubmit={(p) => create.mutate(p)} />
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground inline-flex items-center gap-2">
            <Lock className="h-4 w-4" /> Soil submissions are restricted to professional accounts.
          </div>
        )}
      </div>
      <div className="card-soft p-2 max-h-[400px] overflow-auto">
        <ul className="divide-y divide-border">
          {items.map((s) => (
            <li key={s.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.soil_type}</div>
                <div className="text-[11px] text-muted-foreground">Depth {Number(s.depth_m).toFixed(1)} m · {formatDistanceToNow(new Date(s.created_at).getTime())} ago</div>
              </div>
              {s.user_id === user?.id && (
                <button onClick={() => remove.mutate(s.id)} className="text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No soil data yet.</li>}
        </ul>
      </div>
    </StackLayout>
  );
}

function SoilForm({ onSubmit, submitting }: { onSubmit: (p: { latitude: number; longitude: number; soil_type: string; depth_m: number; notes: string }) => void; submitting: boolean }) {
  const [soilType, setSoilType] = useState("Clay");
  const [depth, setDepth] = useState(5);
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const la = parseFloat(lat); const lo = parseFloat(lng);
        if (Number.isNaN(la) || Number.isNaN(lo)) { toast.error("Coordinates required"); return; }
        onSubmit({ latitude: la, longitude: lo, soil_type: soilType, depth_m: depth, notes: notes.slice(0, 1000) });
      }}>
      <Field label="Soil type">
        <select className={inputClass()} value={soilType} onChange={(e) => setSoilType(e.target.value)}>
          {SOIL_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(parseFloat(e.target.value || "0"))} /></Field>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
      <Field label="Notes" className="sm:col-span-2">
        <textarea className={inputClass("min-h-20")} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </Field>
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
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
        <input className={inputClass()} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
        <button type="submit" disabled={post.isPending || !body.trim()}
          className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1">
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
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
