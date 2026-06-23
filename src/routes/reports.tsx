import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { HAZARD_LABELS, type HazardReport, type HazardType } from "@/lib/safeground";
import { formatDistanceToNow } from "@/lib/format";
import { MapPin, Megaphone, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Hazard reports — SafeGround" },
      { name: "description", content: "Submit and browse community hazard reports: earthquake damage, flooding, landslides, ground cracks." },
    ],
  }),
  component: ReportsPage,
});

const TYPES: HazardType[] = ["earthquake-damage", "flooding", "landslide", "ground-crack"];

function ReportsPage() {
  const [reports, setReports] = useLocalStorage<HazardReport[]>("sg.reports", []);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Hazard reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share what you're seeing on the ground so your community can stay informed.
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {open ? "Close" : "New report"}
          </button>
        </div>

        {open && (
          <ReportForm
            onCancel={() => setOpen(false)}
            onSubmit={(r) => {
              setReports((prev) => [r, ...prev]);
              setOpen(false);
            }}
          />
        )}

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
              {r.imageUrl && (
                <img
                  src={r.imageUrl}
                  alt=""
                  className="aspect-video w-full object-cover bg-secondary"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="chip">
                      <Dot type={r.type} /> {HAZARD_LABELS[r.type]}
                    </span>
                    <p className="mt-3 text-sm">{r.description}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                  </span>
                  <span>{formatDistanceToNow(new Date(r.createdAt).getTime())} ago</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setReports((prev) => prev.filter((x) => x.id !== r.id))}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Dot({ type }: { type: HazardType }) {
  const color =
    type === "earthquake-damage"
      ? "bg-danger"
      : type === "flooding"
        ? "bg-primary"
        : type === "landslide"
          ? "bg-warning"
          : "bg-accent-foreground";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function ReportForm({ onSubmit, onCancel }: { onSubmit: (r: HazardReport) => void; onCancel: () => void }) {
  const [type, setType] = useState<HazardType>("earthquake-damage");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <form
      className="card-soft mt-6 p-5 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (!description.trim() || Number.isNaN(lat) || Number.isNaN(lon)) return;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
        let safeImage: string | undefined;
        if (imageUrl.trim()) {
          try {
            const u = new URL(imageUrl.trim());
            if (u.protocol === "http:" || u.protocol === "https:") safeImage = u.toString();
          } catch {
            // ignore invalid URL
          }
        }
        onSubmit({
          id: crypto.randomUUID(),
          type,
          description: description.trim().slice(0, 1000),
          latitude: lat,
          longitude: lon,
          imageUrl: safeImage,
          createdAt: new Date().toISOString(),
        });
      }}
    >
      <label className="block md:col-span-2">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Hazard type</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md border px-3 py-2 text-sm text-left transition ${
                type === t ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              <Dot type={t} />
              <span className="ml-2">{HAZARD_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </label>

      <label className="block md:col-span-2">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Description</span>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24"
          maxLength={1000}
          placeholder="What did you see? Where? When?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Latitude</span>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="-90 to 90"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Longitude</span>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="-180 to 180"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
      </label>
      <label className="block md:col-span-2">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Image URL (optional)</span>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="https://…"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          maxLength={500}
        />
      </label>

      <div className="md:col-span-2 flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary"
        >
          <MapPin className="h-4 w-4" /> {busy ? "Locating…" : "Use my location"}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Submit report
          </button>
        </div>
      </div>
    </form>
  );
}
