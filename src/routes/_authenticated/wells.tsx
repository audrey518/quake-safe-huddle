import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Field, inputClass } from "@/components/safeground/ui";
import { formatDistanceToNow } from "@/lib/format";
import { Droplets, MapPin, Plus, TrendingDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wells")({
  head: () => ({ meta: [{ title: "Wells & Groundwater — GeoSafe AI" }] }),
  component: WellsPage,
});

const TYPES = ["Domestic", "Irrigation", "Monitoring", "Industrial"];

function WellsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["wells"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wells").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const readingsQ = useQuery({
    queryKey: ["well_readings", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("well_readings").select("*").eq("well_id", selected!).order("measured_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (p: { name: string; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("wells").insert({
        user_id: user!.id,
        name: p.name, latitude: p.latitude, longitude: p.longitude,
        well_type: p.well_type, total_depth_m: p.total_depth_m,
        current_level_m: p.current_level_m, measured_at: now,
      }).select("id").single();
      if (error) throw error;
      // Initial reading
      await supabase.from("well_readings").insert({ well_id: data!.id, user_id: user!.id, level_m: p.current_level_m, measured_at: now });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wells"] }); setOpen(false); toast.success("Well registered"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addReading = useMutation({
    mutationFn: async (p: { well_id: string; level_m: number }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("well_readings").insert({ well_id: p.well_id, user_id: user!.id, level_m: p.level_m, measured_at: now });
      if (error) throw error;
      await supabase.from("wells").update({ current_level_m: p.level_m, measured_at: now }).eq("id", p.well_id);
    },
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ["wells"] }); qc.invalidateQueries({ queryKey: ["well_readings", vars.well_id] }); toast.success("Reading logged"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wells").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wells"] }),
  });

  const wells = q.data ?? [];

  // Detect declining trend
  const decline = detectDecline(readingsQ.data ?? []);

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Wells & groundwater</h1>
            <p className="text-sm text-muted-foreground mt-1">Register wells and track water level over time.</p>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {open ? "Close" : "Register well"}
          </button>
        </div>

        {open && <WellForm submitting={create.isPending} onCancel={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} />}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
            {wells.length === 0 && !open && (
              <div className="card-soft p-10 text-center sm:col-span-2">
                <Droplets className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-display text-lg">No wells yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Register a well to start tracking water levels.</p>
              </div>
            )}
            {wells.map((w) => {
              const isSel = selected === w.id;
              return (
                <button key={w.id} type="button" onClick={() => setSelected(isSel ? null : w.id)}
                  className={`card-soft p-5 text-left transition ${isSel ? "ring-2 ring-primary/40" : "hover:bg-secondary/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{w.name}</h3>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{w.latitude.toFixed(3)}, {w.longitude.toFixed(3)}</p>
                    </div>
                    <span className="chip">{w.well_type}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Meta label="Depth" value={`${Number(w.total_depth_m).toFixed(1)} m`} />
                    <Meta label="Level" value={w.current_level_m != null ? `${Number(w.current_level_m).toFixed(2)} m` : "—"} />
                  </dl>
                  {w.measured_at && <div className="mt-3 text-[11px] text-muted-foreground">Last measured {formatDistanceToNow(new Date(w.measured_at).getTime())} ago</div>}
                  {w.user_id === user?.id && (
                    <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => remove.mutate(w.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <aside className="card-soft p-5">
            <h3 className="font-display text-lg font-semibold">History</h3>
            {!selected && <p className="mt-2 text-sm text-muted-foreground">Select a well to see its water-level history.</p>}
            {selected && (
              <div className="mt-3 space-y-3">
                {decline && (
                  <div className="rounded-md border border-[var(--color-risk-high)]/40 bg-[var(--color-risk-high)]/10 p-3 text-xs flex gap-2">
                    <TrendingDown className="h-4 w-4 text-[var(--color-risk-high)]" />
                    <span>Groundwater appears to be declining ({decline.toFixed(2)} m drop in last readings).</span>
                  </div>
                )}
                {wells.find((w) => w.id === selected)?.user_id === user?.id && (
                  <QuickReading onAdd={(level) => addReading.mutate({ well_id: selected, level_m: level })} />
                )}
                <ul className="divide-y divide-border max-h-80 overflow-auto">
                  {(readingsQ.data ?? []).map((r) => (
                    <li key={r.id} className="py-2 flex justify-between text-sm">
                      <span className="font-medium">{Number(r.level_m).toFixed(2)} m</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.measured_at).getTime())} ago</span>
                    </li>
                  ))}
                  {(readingsQ.data ?? []).length === 0 && <li className="py-3 text-xs text-muted-foreground">No readings yet.</li>}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

function QuickReading({ onAdd }: { onAdd: (level: number) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const n = parseFloat(v); if (!Number.isNaN(n)) { onAdd(n); setV(""); } }}
      className="flex gap-2">
      <input className={inputClass()} placeholder="New level (m)" value={v} onChange={(e) => setV(e.target.value)} type="number" step="0.01" />
      <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">Add</button>
    </form>
  );
}

function WellForm({ onSubmit, onCancel, submitting }: {
  onSubmit: (p: { name: string; latitude: number; longitude: number; well_type: string; total_depth_m: number; current_level_m: number }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [type, setType] = useState("Domestic");
  const [depth, setDepth] = useState(20);
  const [level, setLevel] = useState(5);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude.toFixed(5)); setLongitude(pos.coords.longitude.toFixed(5)); },
      () => {}, { timeout: 8000 });
  }

  return (
    <form className="card-soft mt-6 p-5 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const lat = parseFloat(latitude); const lon = parseFloat(longitude);
        if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lon)) return;
        onSubmit({ name: name.trim().slice(0, 80), latitude: lat, longitude: lon, well_type: type, total_depth_m: depth, current_level_m: level });
      }}>
      <Field label="Well name"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Type">
        <select className={inputClass()} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </Field>
      <Field label="Latitude"><input className={inputClass()} value={latitude} onChange={(e) => setLatitude(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={longitude} onChange={(e) => setLongitude(e.target.value)} required /></Field>
      <Field label="Total depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(parseFloat(e.target.value || "0"))} /></Field>
      <Field label="Current water level (m below surface)"><input type="number" step="0.01" className={inputClass()} value={level} onChange={(e) => setLevel(parseFloat(e.target.value || "0"))} /></Field>
      <div className="md:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={useMyLocation} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary">
          <MapPin className="h-4 w-4" /> Use my location
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? "Saving…" : "Register well"}
          </button>
        </div>
      </div>
    </form>
  );
}

function detectDecline(readings: { level_m: number | string; measured_at: string }[]): number | null {
  if (readings.length < 3) return null;
  const last3 = readings.slice(0, 3).map((r) => Number(r.level_m));
  // newer first: last3[0] newest
  if (last3[0] > last3[1] && last3[1] > last3[2]) {
    const drop = last3[0] - last3[2];
    if (drop >= 0.5) return drop;
  }
  return null;
}
