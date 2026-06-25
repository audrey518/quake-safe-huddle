import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useTrustBadge } from "@/hooks/use-trust-badge";
import { Field, inputClass } from "@/components/safeground/ui";
import { Building2, CalendarClock, Droplets, LogOut, Megaphone, Mountain, Receipt, Settings, ShieldCheck, ShoppingCart, UserCircle2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — GeoSafe AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { isProfessional, isProvider, isAdmin } = useRole();
  const roleLabel = isAdmin ? "Admin" : isProvider ? "Service provider" : isProfessional ? "Professional" : "Local resident";
  const badge = useTrustBadge(user?.id);
  const qc = useQueryClient();
  const router = useRouter();

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  useEffect(() => {
    if (!nameDirty && typeof profileQ.data?.display_name === "string") {
      setDisplayName(profileQ.data.display_name);
    }
  }, [profileQ.data?.display_name, nameDirty]);

  const historyQ = useQuery({
    queryKey: ["profile-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, a] = await Promise.all([
        supabase.from("purchases").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("appointments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20),
      ]);
      return { purchases: p.data ?? [], appointments: a.data ?? [] };
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (input: { name: string }) => {
      const { error } = await supabase.from("profiles")
        .upsert({ id: user!.id, display_name: input.name }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      setNameDirty(false);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });


  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const b = badge.data;

  return (
    <AppShell>
      <div className="container-app py-8 space-y-8">
        <header className="flex items-center gap-4 sm:gap-5">
          <div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight truncate">
              {profileQ.data?.display_name || user?.email?.split("@")[0] || "Your profile"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: `color-mix(in oklab, ${b?.color ?? "var(--color-muted-foreground)"} 18%, transparent)`,
                  color: b?.color ?? "var(--color-muted-foreground)",
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> {b?.tier ?? "—"} contributor
              </span>
              <span className="chip">{roleLabel}</span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Buildings" value={String(b?.buildings ?? 0)} />
          <StatCard icon={<Droplets className="h-5 w-5" />} label="Wells" value={String(b?.wells ?? 0)} />
          <StatCard icon={<Megaphone className="h-5 w-5" />} label="Hazard reports" value={String(b?.reports ?? 0)} />
          <StatCard icon={<Mountain className="h-5 w-5" />} label="Soil records" value={String(b?.soil ?? 0)} />
        </section>

        <section className="card-soft p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Trustworthiness</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{b?.description ?? "Loading your contributions…"}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4 text-xs">
            <TierRow tier="New" range="0" active={b?.tier === "New"} />
            <TierRow tier="Contributor" range="1–2" active={b?.tier === "Contributor"} />
            <TierRow tier="Trusted" range="3–9" active={b?.tier === "Trusted"} />
            <TierRow tier="Expert" range="10+" active={b?.tier === "Expert"} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card-soft p-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Purchase history</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" /> Purchases
                </div>
                {historyQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : historyQ.data?.purchases.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {historyQ.data.purchases.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 border-b border-border/60 pb-1.5">
                        <span className="truncate">
                          {p.item_name} <span className="text-muted-foreground">· {p.provider_name}</span>
                        </span>
                        <span className="text-muted-foreground whitespace-nowrap">{p.price ? `MMK ${Number(p.price).toLocaleString()}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No purchases yet.</p>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Appointments
                </div>
                {historyQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : historyQ.data?.appointments.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {historyQ.data.appointments.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2 border-b border-border/60 pb-1.5">
                        <span className="truncate">
                          {a.service_name} <span className="text-muted-foreground">· {a.provider_name}</span>
                        </span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {a.appointment_date}
                          {a.appointment_time ? ` ${a.appointment_time}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No appointments yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="card-soft p-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Account settings</h2>
            </div>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!displayName.trim()) return;
                saveProfile.mutate({ name: displayName.trim().slice(0, 80) });
              }}
            >
              <Field label="Display name">
                <input className={inputClass()} value={displayName} onChange={(e) => { setNameDirty(true); setDisplayName(e.target.value); }} maxLength={80} />
              </Field>
              {profileQ.data && (profileQ.data as { license_number?: string | null }).license_number && (
                <Field label="Professional licence number">
                  <input className={inputClass("opacity-70")} value={(profileQ.data as { license_number?: string | null }).license_number ?? ""} disabled />
                </Field>
              )}
              <Field label="Email">
                <input className={inputClass("opacity-70")} value={user?.email ?? ""} disabled />
              </Field>
              <Field label="Role">
                <input className={inputClass("opacity-70")} value={roleLabel} disabled />
              </Field>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
                <button
                  type="submit"
                  disabled={saveProfile.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saveProfile.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>

          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TierRow({ tier, range, active }: { tier: string; range: string; active: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${active ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{tier}</div>
      <div className="font-medium">{range} contributions</div>
    </div>
  );
}
