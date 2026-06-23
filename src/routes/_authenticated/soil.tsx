import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Field, inputClass } from "@/components/safeground/ui";
import { formatDistanceToNow } from "@/lib/format";
import { Lock, MapPin, Mountain, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/soil")({
  head: () => ({ meta: [{ title: "Soil information — SafeGround" }] }),
  component: SoilPage,
});

const SOIL_TYPES = ["Clay", "Silt", "Sand", "Gravel", "Loam", "Peat", "Rocky", "Mixed"];

function SoilPage() {
  const { user } = useAuth();
  const { isProfessional, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["soil_data"],
    queryFn: async () => {
      const { data, error } = await supabase.from("soil_data").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (p: { latitude: number; longitude: number; soil_type: string; depth_m: number; layers: { name: string; thickness_m: number }[]; notes: string }) => {
      const { error } = await supabase.from("soil_data").insert({ user_id: user!.id, ...p, notes: p.notes || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["soil_data"] }); setOpen(false); toast.success("Soil record added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("soil_data").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soil_data"] }),
  });

  const records = q.data ?? [];

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Soil information</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View soil type, depth, and layer data submitted by professionals.
            </p>
          </div>
          {isProfessional ? (
            <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {open ? "Close" : "Add soil record"}
            </button>
          ) : (
            !roleLoading && (
              <span className="inline-flex items-center gap-1.5 chip">
                <Lock className="h-3 w-3" /> Professionals only
              </span>
            )
          )}
        </div>

        {open && isProfessional && <SoilForm submitting={create.isPending} onCancel={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} />}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {records.length === 0 && !open && (
            <div className="card-soft p-10 text-center md:col-span-2 lg:col-span-3">
              <Mountain className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-lg">No soil data yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">{isProfessional ? "Add the first soil assessment." : "Awaiting professional contributions."}</p>
            </div>
          )}
          {records.map((s) => {
            const layers = (s.layers as { name: string; thickness_m: number }[] | null) ?? [];
            return (
              <article key={s.id} className="card-soft p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{s.soil_type}</h3>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.latitude.toFixed(3)}, {s.longitude.toFixed(3)}</p>
                  </div>
                  <span className="chip">{Number(s.depth_m).toFixed(1)} m</span>
                </div>
                {layers.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {layers.map((l, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-secondary/60 px-2 py-1.5 text-xs">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-muted-foreground">{Number(l.thickness_m).toFixed(1)} m</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.notes && <p className="mt-3 text-xs text-muted-foreground line-clamp-3">{s.notes}</p>}
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(s.created_at).getTime())} ago</span>
                  {s.user_id === user?.id && (
                    <button onClick={() => remove.mutate(s.id)} className="inline-flex items-center gap-1 hover:text-[var(--color-risk-very-high)]">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function SoilForm({ onSubmit, onCancel, submitting }: {
  onSubmit: (p: { latitude: number; longitude: number; soil_type: string; depth_m: number; layers: { name: string; thickness_m: number }[]; notes: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [soilType, setSoilType] = useState("Clay");
  const [depth, setDepth] = useState(5);
  const [notes, setNotes] = useState("");
  const [layers, setLayers] = useState<{ name: string; thickness_m: number }[]>([
    { name: "Topsoil", thickness_m: 0.5 },
  ]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude.toFixed(5)); setLongitude(pos.coords.longitude.toFixed(5));
    }, () => {}, { timeout: 8000 });
  }

  return (
    <form className="card-soft mt-6 p-5 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const lat = parseFloat(latitude); const lon = parseFloat(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return;
        onSubmit({ latitude: lat, longitude: lon, soil_type: soilType, depth_m: depth, layers: layers.filter((l) => l.name.trim()), notes: notes.slice(0, 1000) });
      }}>
      <Field label="Soil type">
        <select className={inputClass()} value={soilType} onChange={(e) => setSoilType(e.target.value)}>
          {SOIL_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Bore / inspection depth (m)"><input type="number" step="0.1" className={inputClass()} value={depth} onChange={(e) => setDepth(parseFloat(e.target.value || "0"))} /></Field>
      <Field label="Latitude"><input className={inputClass()} value={latitude} onChange={(e) => setLatitude(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} value={longitude} onChange={(e) => setLongitude(e.target.value)} required /></Field>

      <Field label="Layers" className="md:col-span-2">
        <div className="space-y-2">
          {layers.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input className={inputClass()} placeholder="Layer name (e.g. Sandy clay)" value={l.name} onChange={(e) => setLayers((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input type="number" step="0.1" className={inputClass("w-28")} placeholder="Thickness" value={l.thickness_m} onChange={(e) => setLayers((arr) => arr.map((x, j) => j === i ? { ...x, thickness_m: parseFloat(e.target.value || "0") } : x))} />
              <button type="button" onClick={() => setLayers((arr) => arr.filter((_, j) => j !== i))} className="rounded-md px-2 hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setLayers((arr) => [...arr, { name: "", thickness_m: 1 }])} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add layer
          </button>
        </div>
      </Field>

      <Field label="Notes" className="md:col-span-2">
        <textarea className={inputClass("min-h-20")} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="md:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={useMyLocation} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary">
          <MapPin className="h-4 w-4" /> Use my location
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? "Saving…" : "Save record"}
          </button>
        </div>
      </div>
    </form>
  );
}
