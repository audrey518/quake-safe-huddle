import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { adminListProviders, adminSetProviderStatus } from "@/lib/providers.functions";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({ meta: [{ title: "Admin · Providers — GeoSafe AI" }] }),
  component: AdminProviders,
});

function AdminProviders() {
  const list = useServerFn(adminListProviders);
  const setStatus = useServerFn(adminSetProviderStatus);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-providers"], queryFn: () => list() });
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

  return (
    <AppShell>
      <div className="container-app py-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Provider Applications</h1>
          <p className="text-sm text-muted-foreground">Approve or reject service providers.</p>
        </header>

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
