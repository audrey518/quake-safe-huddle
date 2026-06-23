import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { assessRisk, MATERIAL_LABELS, type BuildingMaterial } from "@/lib/safeground";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Field, inputClass, RiskPill } from "@/components/safeground/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/buildings")({
  head: () => ({ meta: [{ title: "Buildings — GeoSafe AI" }] }),
  component: BuildingsPage,
});

const MATERIALS: BuildingMaterial[] = ["reinforced-concrete", "masonry", "wood", "steel", "adobe"];

function BuildingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial }) => {
      const r = assessRisk({ yearBuilt: payload.year_built, floors: payload.floors, material: payload.material });
      const { error } = await supabase.from("buildings").insert({
        user_id: user!.id,
        ...payload,
        risk_score: r.score,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      setOpen(false);
      toast.success("Building saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });

  const buildings = q.data ?? [];

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Buildings</h1>
            <p className="text-sm text-muted-foreground mt-1">Track the buildings you care about and see their risk snapshot.</p>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {open ? "Close" : "Add building"}
          </button>
        </div>

        {open && <BuildingForm submitting={create.isPending} onCancel={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} />}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.length === 0 && !open && (
            <div className="card-soft p-10 text-center md:col-span-2 lg:col-span-3">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-lg">No buildings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your first building to see a risk summary.</p>
            </div>
          )}
          {buildings.map((b) => {
            const r = assessRisk({ yearBuilt: b.year_built, floors: b.floors, material: b.material as BuildingMaterial });
            const isOwner = b.user_id === user?.id;
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
                  <Meta label="Built" value={String(b.year_built)} />
                  <Meta label="Floors" value={String(b.floors)} />
                  <Meta label="Material" value={MATERIAL_LABELS[b.material as BuildingMaterial]?.split(" ")[0] ?? b.material} />
                </dl>
                <p className="mt-4 text-xs text-muted-foreground line-clamp-2">{r.explanation}</p>
                {isOwner && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => remove.mutate(b.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--color-risk-very-high)]">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}
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

function BuildingForm({ onSubmit, onCancel, submitting }: {
  onSubmit: (b: { name: string; address: string; year_built: number; floors: number; material: BuildingMaterial }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
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
          name: name.trim().slice(0, 80),
          address: address.trim().slice(0, 200),
          year_built: Math.min(new Date().getFullYear(), Math.max(1800, yearBuilt)),
          floors: Math.min(150, Math.max(1, floors)),
          material,
        });
      }}
    >
      <Field label="Building name"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
      <Field label="Address"><input className={inputClass()} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} /></Field>
      <Field label="Year built"><input type="number" className={inputClass()} min={1800} max={new Date().getFullYear()} value={yearBuilt} onChange={(e) => setYearBuilt(parseInt(e.target.value || "0", 10))} /></Field>
      <Field label="Number of floors"><input type="number" className={inputClass()} min={1} max={150} value={floors} onChange={(e) => setFloors(parseInt(e.target.value || "1", 10))} /></Field>
      <Field label="Material" className="md:col-span-2">
        <select className={inputClass()} value={material} onChange={(e) => setMaterial(e.target.value as BuildingMaterial)}>
          {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {submitting ? "Saving…" : "Save building"}
        </button>
      </div>
    </form>
  );
}
