import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { HAZARD_LABELS, type HazardType } from "@/lib/safeground";
import { formatDistanceToNow } from "@/lib/format";
import { Field, inputClass } from "@/components/safeground/ui";
import { MapPin, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Hazard reports — GeoSafe AI" }] }),
  component: ReportsPage,
});

const TYPES: HazardType[] = ["earthquake-damage", "flooding", "landslide", "ground-crack"];

function ReportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["hazard_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hazard_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (p: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => {
      const { error } = await supabase.from("hazard_reports").insert({ user_id: user!.id, ...p });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hazard_reports"] }); setOpen(false); toast.success("Report submitted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hazard_reports").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hazard_reports"] }),
  });

  const reports = q.data ?? [];

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Hazard reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Share what you're seeing on the ground.</p>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {open ? "Close" : "New report"}
          </button>
        </div>

        {open && <ReportForm submitting={create.isPending} onCancel={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} />}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {reports.length === 0 && !open && (
            <div className="card-soft p-10 text-center md:col-span-2">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-lg">No reports yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Submit the first community hazard report.</p>
            </div>
          )}
          {reports.map((r) => (
            <article key={r.id} className="card-soft overflow-hidden flex flex-col">
              {r.image_url && (
                <img src={r.image_url} alt="" className="aspect-video w-full object-cover bg-secondary" onError={(e) => ((e.currentTarget.style.display = "none"))} />
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div>
                  <span className="chip"><Dot type={r.kind as HazardType} /> {HAZARD_LABELS[r.kind as HazardType] ?? r.kind}</span>
                  <p className="mt-3 text-sm">{r.description}</p>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</span>
                  <span>{formatDistanceToNow(new Date(r.created_at).getTime())} ago</span>
                </div>
                {r.user_id === user?.id && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => remove.mutate(r.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Dot({ type }: { type: HazardType }) {
  const c = type === "earthquake-damage" ? "bg-[var(--color-risk-very-high)]"
    : type === "flooding" ? "bg-primary"
    : type === "landslide" ? "bg-[var(--color-risk-high)]"
    : "bg-[var(--color-risk-moderate)]";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />;
}

function ReportForm({ onSubmit, onCancel, submitting }: {
  onSubmit: (r: { kind: HazardType; severity: string; latitude: number; longitude: number; description: string; image_url?: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [type, setType] = useState<HazardType>("earthquake-damage");
  const [severity, setSeverity] = useState("moderate");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude.toFixed(5)); setLongitude(pos.coords.longitude.toFixed(5)); setBusy(false); },
      () => setBusy(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <form
      className="card-soft mt-6 p-5 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const lat = parseFloat(latitude); const lon = parseFloat(longitude);
        if (!description.trim() || Number.isNaN(lat) || Number.isNaN(lon)) return;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
        let safeImage: string | undefined;
        if (imageUrl.trim()) {
          try { const u = new URL(imageUrl.trim()); if (u.protocol === "http:" || u.protocol === "https:") safeImage = u.toString(); } catch {}
        }
        onSubmit({ kind: type, severity, description: description.trim().slice(0, 1000), latitude: lat, longitude: lon, image_url: safeImage });
      }}
    >
      <Field label="Hazard type" className="md:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map((t) => (
            <button type="button" key={t} onClick={() => setType(t)}
              className={`rounded-md border px-3 py-2 text-sm text-left transition ${type === t ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
              <Dot type={t} /><span className="ml-2">{HAZARD_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Severity">
        <select className={inputClass()} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
        </select>
      </Field>
      <Field label="Image URL (optional)">
        <input className={inputClass()} placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea className={inputClass("min-h-24")} maxLength={1000} placeholder="What did you see? Where? When?" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </Field>
      <Field label="Latitude"><input className={inputClass()} placeholder="-90 to 90" value={latitude} onChange={(e) => setLatitude(e.target.value)} required /></Field>
      <Field label="Longitude"><input className={inputClass()} placeholder="-180 to 180" value={longitude} onChange={(e) => setLongitude(e.target.value)} required /></Field>
      <div className="md:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={useMyLocation} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary">
          <MapPin className="h-4 w-4" /> {busy ? "Locating…" : "Use my location"}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </form>
  );
}
