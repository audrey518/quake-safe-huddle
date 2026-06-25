import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Field, inputClass } from "@/components/safeground/ui";
import { CATEGORIES, type ServiceCategoryId } from "@/lib/services-data";
import { bookAppointment, recordPurchase } from "@/lib/telegram.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Briefcase, Building2, CalendarClock, Droplets, ShieldCheck, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ cat: z.enum(["materials", "engineering", "water", "insurance"]).optional() });

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({ meta: [{ title: "Services & Products — GeoSafe AI" }] }),
  validateSearch: searchSchema,
  component: ServicesPage,
});

const ICONS: Record<ServiceCategoryId, React.ComponentType<{ className?: string }>> = {
  materials: Building2,
  engineering: Briefcase,
  water: Droplets,
  insurance: ShieldCheck,
};

type DbProvider = {
  id: string;
  name: string;
  blurb: string | null;
  location: string | null;
  phone: string | null;
  items: DbItem[];
};
type DbItem = {
  id: string;
  name: string;
  price: number;
  unit: string | null;
  appointment: boolean;
};

function ServicesPage() {
  const search = Route.useSearch();
  const cat: ServiceCategoryId = (search.cat as ServiceCategoryId) ?? "materials";
  const meta = CATEGORIES.find((c) => c.id === cat)!;

  const { user } = useAuth();
  const qc = useQueryClient();

  const providersQ = useQuery({
    queryKey: ["providers-public", cat],
    queryFn: async (): Promise<DbProvider[]> => {
      const { data: providers, error } = await supabase
        .from("providers")
        .select("id,name,blurb,location,phone")
        .eq("status", "approved")
        .eq("category", cat)
        .order("name");
      if (error) throw error;
      const ids = (providers ?? []).map((p) => p.id);
      if (!ids.length) return [];
      const { data: items } = await supabase
        .from("provider_items")
        .select("id,provider_id,name,price,unit,appointment,active")
        .in("provider_id", ids)
        .eq("active", true);
      return (providers ?? []).map((p) => ({
        ...p,
        items: ((items ?? []) as Array<{provider_id:string;id:string;name:string;price:number;unit:string|null;appointment:boolean}>)
          .filter((i) => i.provider_id === p.id)
          .map((i) => ({ id: i.id, name: i.name, price: Number(i.price), unit: i.unit, appointment: i.appointment })),
      }));
    },
  });

  const historyQ = useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, a] = await Promise.all([
        supabase.from("purchases").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("appointments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return { purchases: p.data ?? [], appointments: a.data ?? [] };
    },
  });

  const providers = providersQ.data ?? [];

  return (
    <AppShell>
      <div className="container-app py-8 space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Services & Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verified vendors. Are you a provider? <Link to="/auth" className="underline">Sign up as a Provider</Link> to list your goods and services.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c.id];
            const active = cat === c.id;
            return (
              <Link
                key={c.id}
                to="/services"
                search={{ cat: c.id }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" /> {c.label}
              </Link>
            );
          })}
        </nav>

        <section className="card-soft p-5">
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {providersQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading providers…</div>
          ) : providers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No providers in this category yet.</div>
          ) : providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              category={cat}
              onDone={() => qc.invalidateQueries({ queryKey: ["purchases", user?.id] })}
            />
          ))}
        </section>

        <section className="card-soft p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Your recent activity</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" /> Purchases
              </div>
              {historyQ.data?.purchases.length ? (
                <ul className="space-y-1.5 text-sm">
                  {historyQ.data.purchases.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 border-b border-border/60 pb-1.5">
                      <span className="truncate">{p.item_name} <span className="text-muted-foreground">· {p.provider_name}</span></span>
                      <span className="text-muted-foreground whitespace-nowrap">{p.price ? `Rs. ${p.price}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No purchases yet.</p>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Appointments
              </div>
              {historyQ.data?.appointments.length ? (
                <ul className="space-y-1.5 text-sm">
                  {historyQ.data.appointments.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 border-b border-border/60 pb-1.5">
                      <span className="truncate">{a.service_name} <span className="text-muted-foreground">· {a.provider_name}</span></span>
                      <span className="text-muted-foreground whitespace-nowrap">{a.appointment_date}{a.appointment_time ? ` ${a.appointment_time}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No appointments yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ProviderCard({ provider, category, onDone }: { provider: DbProvider; category: ServiceCategoryId; onDone: () => void }) {
  return (
    <div className="card-soft p-5 space-y-3">
      <div>
        <h3 className="font-display text-lg font-semibold">{provider.name}</h3>
        <p className="text-xs text-muted-foreground">{provider.location ?? ""}{provider.phone ? ` · ${provider.phone}` : ""}</p>
        {provider.blurb && <p className="text-sm mt-1.5 text-foreground/80">{provider.blurb}</p>}
      </div>
      <ul className="space-y-2">
        {provider.items.length === 0 && (
          <li className="text-xs text-muted-foreground">No items listed.</li>
        )}
        {provider.items.map((item) => (
          <ItemRow key={item.id} item={item} provider={provider} category={category} onDone={onDone} />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({ item, provider, category, onDone }: { item: DbItem; provider: DbProvider; category: ServiceCategoryId; onDone: () => void }) {
  const [bookOpen, setBookOpen] = useState(false);
  const purchaseFn = useServerFn(recordPurchase);
  const buy = useMutation({
    mutationFn: () => purchaseFn({ data: {
      category, provider_name: provider.name, item_name: item.name, price: item.price,
      provider_item_id: item.id,
    } }),
    onSuccess: () => {
      toast.success("Purchase recorded — provider notified");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });

  return (
    <li className="rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-xs text-muted-foreground">Rs. {item.price}{item.unit ? ` / ${item.unit}` : ""}{item.appointment ? " · by appointment" : ""}</div>
        </div>
        {item.appointment ? (
          <button onClick={() => setBookOpen((v) => !v)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
            {bookOpen ? "Close" : "Book appointment"}
          </button>
        ) : (
          <button onClick={() => buy.mutate()} disabled={buy.isPending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 whitespace-nowrap">
            {buy.isPending ? "Processing…" : "Purchase"}
          </button>
        )}
      </div>
      {item.appointment && bookOpen && (
        <AppointmentForm
          provider={provider}
          item={item}
          category={category}
          onDone={() => { setBookOpen(false); onDone(); }}
        />
      )}
    </li>
  );
}

function AppointmentForm({ provider, item, category, onDone }: { provider: DbProvider; item: DbItem; category: ServiceCategoryId; onDone: () => void }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const bookFn = useServerFn(bookAppointment);
  const book = useMutation({
    mutationFn: () => bookFn({ data: {
      category, provider_name: provider.name, service_name: item.name,
      appointment_date: date, appointment_time: time || null,
      contact_phone: provider.phone ?? null, notes: notes || null,
      provider_item_id: item.id,
    } }),
    onSuccess: () => {
      toast.success("Appointment booked — provider notified");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Booking failed"),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (date) book.mutate(); }}
      className="mt-3 grid gap-2 sm:grid-cols-3 border-t border-border/60 pt-3"
    >
      <Field label="Date">
        <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass()} />
      </Field>
      <Field label="Time (optional)">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass()} />
      </Field>
      <Field label="Notes (optional)">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass()} />
      </Field>
      <div className="sm:col-span-3 flex justify-end">
        <button disabled={book.isPending || !date} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {book.isPending ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}
