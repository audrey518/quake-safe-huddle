import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MapView, type MapMarker } from "@/components/safeground/map-view";
import { supabase } from "@/integrations/supabase/client";
import { fetchRecentEarthquakes } from "@/lib/usgs";
import { assessRisk, magnitudeColor, riskCategoryColor, type BuildingMaterial, type HazardType, HAZARD_LABELS } from "@/lib/safeground";
import { Activity, Building2, Droplets, Megaphone, Mountain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Map — GeoSafe AI" }] }),
  component: MapPage,
});

type LayerKey = "earthquakes" | "reports" | "buildings" | "wells" | "soil";

const LAYERS: { key: LayerKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "earthquakes", label: "Earthquakes", icon: Activity, color: "var(--color-risk-very-high)" },
  { key: "reports", label: "Hazard reports", icon: Megaphone, color: "var(--color-risk-high)" },
  { key: "buildings", label: "Buildings", icon: Building2, color: "var(--color-primary)" },
  { key: "wells", label: "Wells", icon: Droplets, color: "oklch(0.6 0.12 230)" },
  { key: "soil", label: "Soil data", icon: Mountain, color: "oklch(0.5 0.06 80)" },
];

function MapPage() {
  const [enabled, setEnabled] = useState<Record<LayerKey, boolean>>({
    earthquakes: true, reports: true, buildings: true, wells: true, soil: true,
  });

  const quakes = useQuery({ queryKey: ["usgs", "2.5_day"], queryFn: () => fetchRecentEarthquakes("2.5_day"), refetchInterval: 60_000 });
  const reports = useQuery({ queryKey: ["hazard_reports"], queryFn: async () => (await supabase.from("hazard_reports").select("*")).data ?? [] });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: async () => (await supabase.from("buildings").select("*")).data ?? [] });
  const wells = useQuery({ queryKey: ["wells"], queryFn: async () => (await supabase.from("wells").select("*")).data ?? [] });
  const soil = useQuery({ queryKey: ["soil_data"], queryFn: async () => (await supabase.from("soil_data").select("*")).data ?? [] });

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (enabled.earthquakes) for (const q of quakes.data ?? []) {
      m.push({ id: `q-${q.id}`, lat: q.latitude, lng: q.longitude, color: magnitudeColor(q.magnitude), title: q.place,
        popupHtml: `<strong>M${q.magnitude.toFixed(1)} earthquake</strong><br/>${q.place}<br/><span style="color:#666">${q.depth.toFixed(0)} km deep</span>` });
    }
    if (enabled.reports) for (const r of reports.data ?? []) {
      m.push({ id: `r-${r.id}`, lat: r.latitude, lng: r.longitude, color: "var(--color-risk-high)", title: r.kind,
        popupHtml: `<strong>${HAZARD_LABELS[r.kind as HazardType] ?? r.kind}</strong><br/>${escape(r.description)}` });
    }
    if (enabled.buildings) for (const b of buildings.data ?? []) {
      if (b.latitude == null || b.longitude == null) continue;
      const risk = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
      const materialLabel = (await import("@/lib/safeground"), b.material);
      m.push({ id: `b-${b.id}`, lat: b.latitude, lng: b.longitude, color: riskCategoryColor(risk.category), title: b.name,
        popupHtml: `<div style="min-width:200px"><strong>${escape(b.name)}</strong><br/><span style="color:#666">${escape(b.address)}</span><hr style="margin:6px 0;border:none;border-top:1px solid #eee"/><div style="display:grid;grid-template-columns:auto auto;gap:2px 8px;font-size:12px"><span style="color:#888">Built</span><span>${b.year_built}</span><span style="color:#888">Floors</span><span>${b.floors}</span><span style="color:#888">Material</span><span>${escape(materialLabel)}</span><span style="color:#888">Risk</span><span><strong>${risk.category}</strong> (${risk.score}/100)</span></div><p style="margin:6px 0 0;font-size:11px;color:#555">${escape(risk.explanation)}</p></div>` });
    }
    if (enabled.wells) for (const w of wells.data ?? []) {
      m.push({ id: `w-${w.id}`, lat: w.latitude, lng: w.longitude, color: "oklch(0.6 0.12 230)", title: w.name,
        popupHtml: `<strong>${escape(w.name)}</strong><br/>${w.well_type} well<br/>Level: ${w.current_level_m ?? "—"} m` });
    }
    if (enabled.soil) for (const s of soil.data ?? []) {
      m.push({ id: `s-${s.id}`, lat: s.latitude, lng: s.longitude, color: "oklch(0.5 0.06 80)", title: s.soil_type,
        popupHtml: `<strong>Soil: ${escape(s.soil_type)}</strong><br/>Depth: ${s.depth_m} m` });
    }
    return m;
  }, [enabled, quakes.data, reports.data, buildings.data, wells.data, soil.data]);

  const center: [number, number] = useMemo(() => {
    const first = markers[0];
    if (first) return [first.lat, first.lng];
    return [20, 0];
  }, [markers]);

  return (
    <AppShell>
      <div className="container-app py-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Map</h1>
            <p className="text-sm text-muted-foreground mt-1">All your community data, layered on one map.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LAYERS.map((l) => {
              const Icon = l.icon;
              const on = enabled[l.key];
              return (
                <button key={l.key} onClick={() => setEnabled((s) => ({ ...s, [l.key]: !s[l.key] }))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-primary bg-primary/10" : "border-border bg-background text-muted-foreground"}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  <Icon className="h-3.5 w-3.5" /> {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-soft p-2">
          <MapView markers={markers} center={center} zoom={markers.length ? 4 : 2} height={520} />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4 text-xs">
          <Legend label="Low" color="var(--color-risk-low)" />
          <Legend label="Moderate" color="var(--color-risk-moderate)" />
          <Legend label="High" color="var(--color-risk-high)" />
          <Legend label="Very high" color="var(--color-risk-very-high)" />
        </div>
      </div>
    </AppShell>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function escape(s: string | null | undefined) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
