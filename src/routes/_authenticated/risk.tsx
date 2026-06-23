import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { assessRisk, MATERIAL_LABELS, type BuildingMaterial } from "@/lib/safeground";
import { Field, inputClass } from "@/components/safeground/ui";
import { Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({ meta: [{ title: "Risk assessment — GeoSafe AI" }] }),
  component: RiskPage,
});

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function RiskPage() {
  const buildingsQ = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const buildings = buildingsQ.data ?? [];

  const [selectedId, setSelectedId] = useState("custom");
  const [yearBuilt, setYearBuilt] = useState(1990);
  const [floors, setFloors] = useState(3);
  const [material, setMaterial] = useState<BuildingMaterial>("masonry");

  const params = useMemo(() => {
    if (selectedId === "custom") return { yearBuilt, floors, material };
    const b = buildings.find((x) => x.id === selectedId);
    return b ? { yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial } : { yearBuilt, floors, material };
  }, [selectedId, buildings, yearBuilt, floors, material]);

  const result = assessRisk(params);

  const ringColor =
    result.category === "Low" ? "var(--color-risk-low)"
    : result.category === "Moderate" ? "var(--color-risk-moderate)"
    : result.category === "High" ? "var(--color-risk-high)"
    : "var(--color-risk-very-high)";

  const c = 2 * Math.PI * 52;
  const offset = c - (result.score / 100) * c;

  return (
    <AppShell>
      <div className="container-app py-8 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Risk assessment</h1>
            <p className="text-sm text-muted-foreground mt-1">Quick earthquake risk based on age, material, and floors.</p>
          </div>

          <div className="card-soft p-5 space-y-4">
            <Field label="Building">
              <select className={inputClass()} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="custom">Custom input</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>

            {selectedId === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Year built"><input type="number" className={inputClass()} min={1800} max={new Date().getFullYear()} value={yearBuilt} onChange={(e) => setYearBuilt(parseInt(e.target.value || "0", 10))} /></Field>
                <Field label="Floors"><input type="number" className={inputClass()} min={1} max={150} value={floors} onChange={(e) => setFloors(parseInt(e.target.value || "1", 10))} /></Field>
                <Field label="Material" className="sm:col-span-2">
                  <select className={inputClass()} value={material} onChange={(e) => setMaterial(e.target.value as BuildingMaterial)}>
                    {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
                  </select>
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="Built" value={String(params.yearBuilt)} />
                <Stat label="Floors" value={String(params.floors)} />
                <Stat label="Material" value={MATERIAL_LABELS[params.material]} />
              </div>
            )}

            {buildings.length === 0 && (
              <p className="text-xs text-muted-foreground">Tip: <Link to="/buildings" className="text-primary underline">add a building</Link> to assess saved profiles.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          <div className="card-soft p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" stroke="var(--color-secondary)" strokeWidth="10" fill="none" />
                <circle cx="60" cy="60" r="52" strokeWidth="10" fill="none" strokeLinecap="round" stroke={ringColor} strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
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
              <div className="font-display text-3xl font-semibold mt-1" style={{ color: ringColor }}>{result.category}</div>
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
            <p className="text-warning-foreground">Community-level estimate to spark preparedness — not a substitute for inspection by a licensed engineer.</p>
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
