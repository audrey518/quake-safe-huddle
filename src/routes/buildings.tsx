import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  assessRisk,
  MATERIAL_LABELS,
  type Building,
  type BuildingMaterial,
} from "@/lib/safeground";
import { RiskPill } from "@/routes/index";
import { Building2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/buildings")({
  head: () => ({
    meta: [
      { title: "Buildings — SafeGround" },
      { name: "description", content: "Track buildings and see a quick earthquake risk summary for each." },
    ],
  }),
  component: BuildingsPage,
});

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function BuildingsPage() {
  const [buildings, setBuildings] = useLocalStorage<Building[]>("sg.buildings", []);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Buildings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add the buildings you care about. We'll show a simple risk snapshot for each.
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {open ? "Close" : "Add building"}
          </button>
        </div>

        {open && (
          <BuildingForm
            onCancel={() => setOpen(false)}
            onSubmit={(b) => {
              setBuildings((prev) => [b, ...prev]);
              setOpen(false);
            }}
          />
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.length === 0 && !open && (
            <div className="card-soft p-10 text-center md:col-span-2 lg:col-span-3">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-lg">No buildings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your first building to see a risk summary.</p>
            </div>
          )}
          {buildings.map((b) => {
            const r = assessRisk(b);
            return (
              <article key={b.id} className="card-soft p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">{b.address}</p>
                  </div>
                  <RiskPill category={r.category} score={r.score} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <Meta label="Built" value={String(b.yearBuilt)} />
                  <Meta label="Floors" value={String(b.floors)} />
                  <Meta label="Material" value={MATERIAL_LABELS[b.material].split(" ")[0]} />
                </dl>
                <p className="mt-4 text-xs text-muted-foreground line-clamp-2">{r.explanation}</p>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setBuildings((prev) => prev.filter((x) => x.id !== b.id))}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </article>
            );
          })}
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

function BuildingForm({ onSubmit, onCancel }: { onSubmit: (b: Building) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [yearBuilt, setYearBuilt] = useState(2000);
  const [floors, setFloors] = useState(2);
  const [material, setMaterial] = useState<BuildingMaterial>("reinforced-concrete");

  return (
    <form
      className="card-soft mt-6 p-5 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;
        onSubmit({
          id: crypto.randomUUID(),
          name: name.trim().slice(0, 80),
          address: address.trim().slice(0, 200),
          yearBuilt: Math.min(new Date().getFullYear(), Math.max(1800, yearBuilt)),
          floors: Math.min(150, Math.max(1, floors)),
          material,
          createdAt: new Date().toISOString(),
        });
      }}
    >
      <Field label="Building name">
        <input
          className="input"
          placeholder="Home, Office, School…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
        />
      </Field>
      <Field label="Address">
        <input
          className="input"
          placeholder="Street, city"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
          required
        />
      </Field>
      <Field label="Year built">
        <input
          type="number"
          className="input"
          min={1800}
          max={new Date().getFullYear()}
          value={yearBuilt}
          onChange={(e) => setYearBuilt(parseInt(e.target.value || "0", 10))}
        />
      </Field>
      <Field label="Number of floors">
        <input
          type="number"
          className="input"
          min={1}
          max={150}
          value={floors}
          onChange={(e) => setFloors(parseInt(e.target.value || "1", 10))}
        />
      </Field>
      <Field label="Building material" className="md:col-span-2">
        <select className="input" value={material} onChange={(e) => setMaterial(e.target.value as BuildingMaterial)}>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_LABELS[m]}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Save building
        </button>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-input);background:var(--color-background);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-ring) 25%, transparent);}`}</style>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
