import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Field, inputClass } from "@/components/safeground/ui";
import {
  getMyProvider, updateMyProvider, listMyItems, saveItem, deleteItem,
  listMyOrders, updateOrderStatus, getMyStats,
} from "@/lib/providers.functions";
import { toast } from "sonner";
import { CalendarClock, ShoppingCart, Store, TrendingUp, ClipboardList, Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({ meta: [{ title: "Provider Dashboard — GeoSafe AI" }] }),
  component: ProviderDashboard,
});

type Tab = "orders" | "listings" | "settings";

function ProviderDashboard() {
  const getMine = useServerFn(getMyProvider);
  const providerQ = useQuery({ queryKey: ["my-provider"], queryFn: () => getMine() });
  const [tab, setTab] = useState<Tab>("orders");

  if (providerQ.isLoading) {
    return <AppShell><div className="container-app py-8 text-sm text-muted-foreground">Loading…</div></AppShell>;
  }
  const p = providerQ.data;
  if (!p) {
    return (
      <AppShell>
        <div className="container-app py-16 max-w-md">
          <h1 className="font-display text-2xl font-semibold">Become a Provider</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have a provider profile yet. Sign out and create an account as a "Provider" to apply.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">← Back home</Link>
        </div>
      </AppShell>
    );
  }
  if (p.status === "pending") {
    return (
      <AppShell>
        <div className="container-app py-16 max-w-lg">
          <h1 className="font-display text-2xl font-semibold">Waiting for approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your application as <b>{p.name}</b> ({p.category}) is being reviewed. You'll be able to manage listings and orders once approved.</p>
        </div>
      </AppShell>
    );
  }
  if (p.status === "rejected") {
    return (
      <AppShell>
        <div className="container-app py-16 max-w-lg">
          <h1 className="font-display text-2xl font-semibold">Application not approved</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please contact the GeoSafe AI team for details.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container-app py-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2"><Store className="h-6 w-6" /> {p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.category} · {p.location ?? ""}</p>
        </header>

        <nav className="flex gap-2 border-b border-border overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {([
            ["orders", "Orders & bookings", ClipboardList],
            ["listings", "My listings", ShoppingCart],
            ["settings", "Settings", TrendingUp],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        {tab === "orders" && <OrdersTab />}
        {tab === "listings" && <ListingsTab />}
        {tab === "settings" && <SettingsTab provider={p} onSaved={() => providerQ.refetch()} />}
      </div>
    </AppShell>
  );
}

function StatCards() {
  const fn = useServerFn(getMyStats);
  const q = useQuery({ queryKey: ["my-stats"], queryFn: () => fn() });
  const s = q.data;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Orders this month" value={s?.ordersThisMonth ?? "—"} />
      <StatCard label="Revenue this month" value={s ? `MMK ${s.revenueThisMonth.toLocaleString()}` : "—"} />
      <StatCard label="Pending orders" value={s?.pending ?? "—"} />
    </div>
  );
}
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-soft p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold font-display">{value}</div>
    </div>
  );
}

function OrdersTab() {
  const fn = useServerFn(listMyOrders);
  const upd = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => fn() });
  const m = useMutation({
    mutationFn: (v: { id: string; kind: "purchase" | "appointment"; status: "new"|"accepted"|"completed"|"cancelled" }) => upd({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["my-orders"] }); qc.invalidateQueries({ queryKey: ["my-stats"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  return (
    <div className="space-y-6">
      <StatCards />
      <Section title="Purchases" icon={<ShoppingCart className="h-4 w-4" />}>
        {!q.data?.purchases.length ? <Empty>No purchases yet.</Empty> : (
          <OrderTable
            rows={q.data.purchases.map((p: any) => ({ id: p.id, kind: "purchase" as const, primary: p.item_name, sub: `MMK ${Number(p.price ?? 0).toLocaleString()}${p.quantity ? ` · qty ${p.quantity}` : ""}`, when: p.created_at as string, status: (p.status ?? "new") as string, customer: p.customer }))}
            onChange={(id, status) => m.mutate({ id, kind: "purchase", status: status as "new"|"accepted"|"completed"|"cancelled" })}
          />
        )}
      </Section>
      <Section title="Bookings" icon={<CalendarClock className="h-4 w-4" />}>
        {!q.data?.appointments.length ? <Empty>No bookings yet.</Empty> : (
          <OrderTable
            rows={q.data.appointments.map((a: any) => ({ id: a.id, kind: "appointment" as const, primary: a.service_name, sub: `${a.appointment_date}${a.appointment_time ? " " + a.appointment_time : ""}`, when: a.created_at as string, status: (a.status ?? "new") as string, customer: { ...a.customer, phone: a.contact_phone ?? a.customer?.phone ?? null } }))}
            onChange={(id, status) => m.mutate({ id, kind: "appointment", status: status as "new"|"accepted"|"completed"|"cancelled" })}
          />
        )}
      </Section>
    </div>
  );
}

type CustomerInfo = { name: string; email: string | null; phone: string | null };
function OrderTable({ rows, onChange }: { rows: { id: string; kind: "purchase"|"appointment"; primary: string; sub: string; when: string; status: string; customer?: CustomerInfo }[]; onChange: (id: string, status: string) => void }) {
  const statusStyle: Record<string, { dot: string; select: string; label: string }> = {
    new:       { dot: "bg-blue-500",    select: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300", label: "New" },
    accepted:  { dot: "bg-amber-500",   select: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", label: "Accepted" },
    completed: { dot: "bg-emerald-500", select: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", label: "Completed" },
    cancelled: { dot: "bg-red-500",     select: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300", label: "Cancelled" },
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Detail</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">When</th><th className="py-2 pr-3">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = statusStyle[r.status] ?? statusStyle.new;
            const c = r.customer;
            return (
              <tr key={r.id} className="border-t border-border/60 align-top">
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
                    {r.primary}
                  </span>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{r.sub}</td>
                <td className="py-2 pr-3">
                  {c ? (
                    <div className="min-w-[180px]">
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.email && <a href={`mailto:${c.email}`} className="block text-xs text-primary hover:underline break-all">{c.email}</a>}
                      {c.phone && <a href={`tel:${c.phone}`} className="block text-xs text-muted-foreground hover:underline">{c.phone}</a>}
                      {!c.email && !c.phone && <div className="text-xs text-muted-foreground">No contact on file</div>}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{new Date(r.when).toLocaleDateString()}</td>
                <td className="py-2 pr-3">
                  <select
                    value={r.status}
                    disabled={r.status === "cancelled"}
                    onChange={(e) => onChange(r.id, e.target.value)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${st.select} disabled:cursor-not-allowed disabled:opacity-70`}
                    title={r.status === "cancelled" ? "Order was cancelled by the customer" : undefined}
                  >
                    <option value="new">New</option>
                    <option value="accepted">Accepted</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ListingsTab() {
  const fnList = useServerFn(listMyItems);
  const fnSave = useServerFn(saveItem);
  const fnDel = useServerFn(deleteItem);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-items"], queryFn: () => fnList() });
  const [editing, setEditing] = useState<{ id?: string; name: string; price: number; unit: string; appointment: boolean; active: boolean; stock: number } | null>(null);

  const save = useMutation({
    mutationFn: (v: NonNullable<typeof editing>) => fnSave({ data: { ...v, unit: v.unit || null } }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["my-items"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["my-items"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const items = useMemo(() => (q.data ?? []) as Array<{ id: string; name: string; price: number; unit: string | null; appointment: boolean; active: boolean; stock: number }>, [q.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Set stock before publishing. Active items appear in the public catalog.</p>
        <button onClick={() => setEditing({ name: "", price: 0, unit: "", appointment: false, active: false, stock: 0 })} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add item</button>
      </div>
      {editing && (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!editing.name) return;
          if (editing.active && !editing.appointment && editing.stock <= 0) {
            toast.error("Add stock quantity before publishing");
            return;
          }
          save.mutate(editing);
        }} className="card-soft p-4 grid gap-3 sm:grid-cols-2">
          <Field label="Item name *"><input className={inputClass()} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
          <Field label="Price (MMK)"><input type="number" min={0} className={inputClass()} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
          <Field label="Unit (optional)"><input className={inputClass()} value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="bag, piece, visit" /></Field>
          <Field label="Type">
            <select className={inputClass()} value={editing.appointment ? "appt" : "buy"} onChange={(e) => setEditing({ ...editing, appointment: e.target.value === "appt" })}>
              <option value="buy">Purchase</option>
              <option value="appt">Appointment / Service</option>
            </select>
          </Field>
          {!editing.appointment && (
            <Field label="Stock quantity *">
              <input type="number" min={0} className={inputClass()} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            Publish (visible in public catalog) — requires stock &gt; 0 for purchase items
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-input px-3 py-1.5 text-xs">Cancel</button>
            <button disabled={save.isPending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{save.isPending ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}
      {items.length === 0 ? <Empty>No items yet.</Empty> : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="card-soft p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{i.name} {!i.active && <span className="ml-2 text-[10px] uppercase text-muted-foreground">(inactive)</span>}</div>
                <div className="text-xs text-muted-foreground">MMK {Number(i.price).toLocaleString()}{i.unit ? ` / ${i.unit}` : ""}{i.appointment ? " · appointment" : ` · stock: ${i.stock ?? 0}`}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setEditing({ id: i.id, name: i.name, price: Number(i.price), unit: i.unit ?? "", appointment: i.appointment, active: i.active, stock: Number(i.stock ?? 0) })} className="rounded-md border border-input p-1.5 hover:bg-secondary" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete this item?")) del.mutate(i.id); }} className="rounded-md border border-input p-1.5 hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function SettingsTab({ provider, onSaved }: { provider: { blurb: string | null; location: string | null; phone: string | null; contact_email: string | null; telegram_chat_id: string | null }; onSaved: () => void }) {
  const fn = useServerFn(updateMyProvider);
  const [blurb, setBlurb] = useState(provider.blurb ?? "");
  const [location, setLocation] = useState(provider.location ?? "");
  const [phone, setPhone] = useState(provider.phone ?? "");
  const [email, setEmail] = useState(provider.contact_email ?? "");
  const [tg, setTg] = useState(provider.telegram_chat_id ?? "");
  const m = useMutation({
    mutationFn: () => fn({ data: { blurb, location, phone, contact_email: email, telegram_chat_id: tg || null } }),
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="card-soft p-4 grid gap-3 max-w-xl">
      <Field label="Short description"><textarea className={inputClass()} rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} /></Field>
      <Field label="Location"><input className={inputClass()} value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
      <Field label="Phone"><input className={inputClass()} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Field label="Contact email (order alerts)"><input type="email" className={inputClass()} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Telegram chat ID (optional)">
        <input className={inputClass()} value={tg} onChange={(e) => setTg(e.target.value)} placeholder="123456789" />
      </Field>
      <p className="text-[11px] text-muted-foreground">To get your Telegram chat ID, message <b>@userinfobot</b> on Telegram. Add this and you'll also get a Telegram alert on every new order.</p>
      <div className="flex justify-end"><button disabled={m.isPending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{m.isPending ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-soft p-4">
      <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">{icon}{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
