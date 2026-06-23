import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  assessRisk,
  MATERIAL_LABELS,
  type Building,
  type BuildingMaterial,
} from "@/lib/safeground";
import { Info } from "lucide-react";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk assessment — SafeGround" },
      { name: "description", content: "Quick earthquake risk score for a building based on age, material, and floors." },
    ],
  }),
  component: RiskPage,
});

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function RiskPage() {
  const [buildings] = useLocalStorage<Building[]>("sg.buildings", []);
  const [selectedId, setSelectedId] = useState<string>("custom");
  const [yearBuilt, setYearBuilt] = useState(1990);
  const [floors, setFloors] = useState(3);
  const [material, setMaterial] = useState<BuildingMaterial>("masonry");

  const params = useMemo(() => {
    if (selectedId === "custom") return { yearBuilt, floors, material };
    const b = buildings.find((x) => x.id === selectedId);
    return b ? { yearBuilt: b.yearBuilt, floors: b.floors, material: b.material } : { yearBuilt, floors, material };
  }, [selectedId, buildings, yearBuilt, floors, material]);

  const result = assessRisk(params);

  const ringColor =
    result.category === "Low"
      ? "stroke-success"
      : result.category === "Moderate"
        ? "stroke-warning"
        : "stroke-danger";

  const c = 2 * Math.PI * 52;
  const offset = c - (result.score / 100) * c;

  return (
    <AppShell>
      <div className="container-app py-8 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Risk assessment</h1>
            <p className="text-sm text-muted-foreground mt-1">
              A simple earthquake risk score based on three factors. Educational only — not a structural engineering review.
            </p>
          </div>

          <div className="card-soft p-5 space-y-4">
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Building</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="custom">Custom input</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedId === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Year built</span>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    min={1800}
                    max={new Date().getFullYear()}
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(parseInt(e.target.value || "0", 10))}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Floors</span>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    min={1}
                    max={150}
                    value={floors}
                    onChange={(e) => setFloors(parseInt(e.target.value || "1", 10))}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Material</span>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as BuildingMaterial)}
                  >
                    {MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {MATERIAL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="Built" value={String(params.yearBuilt)} />
                <Stat label="Floors" value={String(params.floors)} />
                <Stat label="Material" value={MATERIAL_LABELS[params.material]} />
              </div>
            )}

            {buildings.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Tip: <Link to="/buildings" className="text-primary underline">add a building</Link> to assess saved profiles.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          <div className="card-soft p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" className="stroke-secondary" strokeWidth="10" fill="none" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  className={`${ringColor} transition-all duration-700`}
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-5xl font-semibold tracking-tight">{result.score}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">/ 100</div>
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Risk category</div>
              <div className="font-display text-3xl font-semibold mt-1">{result.category}</div>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">{result.explanation}</p>
            </div>
          </div>

          <div className="card-soft p-6">
            <h3 className="font-display text-lg font-semibold">What's driving this score</h3>
            <ul className="mt-4 space-y-3">
              {result.factors.map((f) => (
                <li key={f.label} className="flex gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-sm text-muted-foreground">{f.impact}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm flex gap-3">
            <Info className="h-5 w-5 shrink-0 text-warning-foreground" />
            <p className="text-warning-foreground">
              This score is a community-level estimate to spark conversation about preparedness — it is
              not a substitute for inspection by a licensed structural engineer.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
