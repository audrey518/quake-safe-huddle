import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { adminGetRevenue, adminListProviders, adminSetProviderStatus } from "@/lib/providers.functions";
import { toast } from "sonner";
import { Check, TrendingUp, Wallet, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({ meta: [{ title: "Admin · Providers — GeoSafe AI" }] }),
  component: AdminProviders,
});


function AdminProviders() {
  const list = useServerFn(adminListProviders);
  const setStatus = useServerFn(adminSetProviderStatus);
  const revenue = useServerFn(adminGetRevenue);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-providers"], queryFn: () => list() });
  const rev = useQuery({ queryKey: ["admin-revenue"], queryFn: () => revenue() });
  const m = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "pending" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-providers"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (q.isError) {
    return <AppShell><div className="container-app py-8 text-sm text-destructive">{(q.error as Error).message}</div></AppShell>;
  }

  const rows = (q.data ?? []) as Array<{ id: string; name: string; category: string; status: string; location: string | null; contact_email: string | null; license_number: string | null; created_at: string }>;
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");
  const revData = rev.data;

  return (
    <AppShell>
      <div className="container-app py-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Admin Control</h1>
          <p className="text-sm text-muted-foreground">Approve providers and track commission revenue from completed purchases.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <RevenueCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total commission earned"
            value={revData ? `MMK ${Math.round(revData.totalRevenue).toLocaleString()}` : "—"}
            accent="emerald"
          />
          <RevenueCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Gross sales (completed)"
            value={revData ? `MMK ${Math.round(revData.grossSales).toLocaleString()}` : "—"}
            accent="blue"
          />
          <RevenueCard
            icon={<Check className="h-4 w-4" />}
            label="Completed purchases"
            value={revData ? String(revData.count) : "—"}
            accent="amber"
          />
        </section>

        <Section title="Revenue from completed purchases">
          {!revData || revData.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Sale (MMK)</th>
                    <th className="py-2 pr-3 text-right">Provider payout</th>
                    <th className="py-2 pr-3 text-right">Admin revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revData.rows.map((r: any) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2 pr-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-3 font-medium">{r.item_name}</td>
                      <td className="py-2 pr-3 text-right">{r.quantity ?? 1}</td>
                      <td className="py-2 pr-3 text-right">{Number(r.price ?? 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{Number(r.provider_payout ?? 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-emerald-600">+{Number(r.admin_commission ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Pending (${pending.length})`}>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending applications.</p> : (
            <Table rows={pending} onAction={(id, status) => m.mutate({ id, status })} showActions />
          )}
        </Section>

        <Section title={`All providers (${others.length})`}>
          {others.length === 0 ? <p className="text-sm text-muted-foreground">No other providers.</p> : (
            <Table rows={others} onAction={(id, status) => m.mutate({ id, status })} />
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function RevenueCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "emerald" | "blue" | "amber" }) {
  const tone =
    accent === "emerald" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" :
    accent === "blue" ? "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300" :
    "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300";
  return (
    <div className={`card-soft p-4 border ${tone}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold font-display text-foreground">{value}</div>
    </div>
  );
}


function Table({ rows, onAction, showActions }: { rows: Array<{ id: string; name: string; category: string; status: string; location: string | null; contact_email: string | null; license_number: string | null }>; onAction: (id: string, status: "approved"|"rejected"|"pending") => void; showActions?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Category</th>
            <th className="py-2 pr-3">Location</th>
            <th className="py-2 pr-3">Email</th>
            <th className="py-2 pr-3">Licence</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="py-2 pr-3 font-medium">{r.name}</td>
              <td className="py-2 pr-3">{r.category}</td>
              <td className="py-2 pr-3 text-muted-foreground">{r.location ?? "—"}</td>
              <td className="py-2 pr-3 text-muted-foreground">{r.contact_email ?? "—"}</td>
              <td className="py-2 pr-3 text-muted-foreground">{r.license_number ?? "—"}</td>
              <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-semibold ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}`}>{r.status}</span></td>
              <td className="py-2 pr-3">
                {showActions || r.status !== "approved" ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => onAction(r.id, "approved")} title="Approve" className="rounded-md border border-input p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onAction(r.id, "rejected")} title="Reject" className="rounded-md border border-input p-1.5 hover:bg-destructive/10 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => onAction(r.id, "rejected")} className="text-xs text-muted-foreground hover:text-destructive">Revoke</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft p-4">
      <h2 className="font-display text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}
