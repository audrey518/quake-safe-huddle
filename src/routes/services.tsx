import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Field, inputClass } from "@/components/safeground/ui";
import { CATEGORIES, type ServiceCategoryId } from "@/lib/services-data";
import { bookAppointment, recordPurchase, cancelPurchase } from "@/lib/telegram.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Briefcase, Building2, CalendarClock, CreditCard, Droplets, Lock, Minus, Plus, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ cat: z.enum(["materials", "engineering", "water", "insurance"]).optional() });

export const Route = createFileRoute("/services")({
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
  stock: number;
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
        .select("id,provider_id,name,price,unit,appointment,active,stock")
        .in("provider_id", ids)
        .eq("active", true);
      return (providers ?? []).map((p) => ({
        ...p,
        items: ((items ?? []) as Array<{provider_id:string;id:string;name:string;price:number;unit:string|null;appointment:boolean;stock:number}>)
          .filter((i) => i.provider_id === p.id)
          .map((i) => ({ id: i.id, name: i.name, price: Number(i.price), unit: i.unit, appointment: i.appointment, stock: Number(i.stock ?? 0) })),
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

  const cancelFn = useServerFn(cancelPurchase);
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Order cancelled — stock restored");
      qc.invalidateQueries({ queryKey: ["purchases", user?.id] });
      qc.invalidateQueries({ queryKey: ["providers-public", cat] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
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

        <nav className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
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
              onDone={() => {
                qc.invalidateQueries({ queryKey: ["purchases", user?.id] });
                qc.invalidateQueries({ queryKey: ["providers-public", cat] });
              }}
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
                <ul className="space-y-2 text-sm">
                  {historyQ.data.purchases.map((p) => {
                    const cancelled = p.status === "cancelled";
                    const completed = p.status === "completed";
                    return (
                      <li key={p.id} className="flex flex-col gap-1.5 border-b border-border/60 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                        <span className="min-w-0 break-words">
                          {p.item_name} × {p.quantity ?? 1}
                          <span className="text-muted-foreground"> · {p.provider_name}</span>
                          {cancelled && <span className="ml-1.5 text-[10px] uppercase text-destructive">cancelled</span>}
                          {completed && <span className="ml-1.5 text-[10px] uppercase text-emerald-600">completed</span>}
                        </span>
                        <div className="flex items-center justify-between gap-2 shrink-0 sm:justify-end">
                          <span className="text-muted-foreground whitespace-nowrap">{p.price ? `MMK ${Number(p.price).toLocaleString()}` : ""}</span>
                          {!cancelled && !completed && (
                            <button
                              onClick={() => { if (confirm("Cancel this order? Stock will be restored.")) cancel.mutate(p.id); }}
                              className="text-[11px] rounded border border-input px-2 py-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No purchases yet.</p>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Appointments
              </div>
              {historyQ.data?.appointments.length ? (
                <ul className="space-y-2 text-sm">
                  {historyQ.data.appointments.map((a) => (
                    <li key={a.id} className="flex flex-col gap-1 border-b border-border/60 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <span className="min-w-0 break-words">{a.service_name} <span className="text-muted-foreground">· {a.provider_name}</span></span>
                      <span className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">{a.appointment_date}{a.appointment_time ? ` ${a.appointment_time}` : ""}</span>
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
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold truncate">{provider.name}</h3>
        <p className="text-xs text-muted-foreground truncate">{provider.location ?? ""}{provider.phone ? ` · ${provider.phone}` : ""}</p>
        {provider.blurb && <p className="text-sm mt-1.5 text-foreground/80 line-clamp-2">{provider.blurb}</p>}
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const navigate = Route.useNavigate();

  const requireAuth = (next: () => void) => {
    if (!user) {
      toast.info("Please sign in to continue");
      navigate({ to: "/auth" });
      return;
    }
    next();
  };

  const outOfStock = !item.appointment && item.stock <= 0;

  return (
    <li className="rounded-md border border-border bg-secondary/30 p-3">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            MMK {Number(item.price).toLocaleString()}{item.unit ? ` / ${item.unit}` : ""}
            {item.appointment ? " · by appointment" : ` · ${item.stock > 0 ? `${item.stock} in stock` : "out of stock"}`}
          </div>
        </div>
        {item.appointment ? (
          <button onClick={() => requireAuth(() => setBookOpen((v) => !v))} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap w-full sm:w-auto">
            {!user ? "Sign in to book" : bookOpen ? "Close" : "Book"}
          </button>
        ) : (
          <button
            onClick={() => requireAuth(() => setCheckoutOpen(true))}
            disabled={outOfStock}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto"
          >
            {!user ? "Sign in to buy" : outOfStock ? "Sold out" : "Buy now"}
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
      {checkoutOpen && (
        <CheckoutModal
          item={item}
          provider={provider}
          category={category}
          onClose={() => setCheckoutOpen(false)}
          onDone={() => { setCheckoutOpen(false); onDone(); }}
        />
      )}
    </li>
  );
}

function CheckoutModal({
  item, provider, category, onClose, onDone,
}: {
  item: DbItem; provider: DbProvider; category: ServiceCategoryId;
  onClose: () => void; onDone: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qty, setQty] = useState(1);
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });
  const purchaseFn = useServerFn(recordPurchase);

  const discountQ = useQuery({
    queryKey: ["my-discount", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_discount", { _user_id: user!.id });
      if (error) throw error;
      const row = (data as Array<{ tier: string; discount_pct: number; contributions: number; lifetime_spent: number }> | null)?.[0];
      return row ?? { tier: "bronze", discount_pct: 0, contributions: 0, lifetime_spent: 0 };
    },
  });
  const discountPct = Number(discountQ.data?.discount_pct ?? 0);
  const tier = (discountQ.data?.tier ?? "bronze") as string;

  const buy = useMutation({
    mutationFn: () => purchaseFn({ data: {
      category, provider_name: provider.name, item_name: item.name,
      price: item.price, provider_item_id: item.id, quantity: qty,
    } }),
    onSuccess: () => {
      setStep(3);
      toast.success("Payment successful");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Payment failed"),
  });

  const subtotal = item.price * qty;
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const total = subtotal - discountAmt;
  const fmt = (n: number) => `MMK ${Math.round(n).toLocaleString()}`;
  const tierColor: Record<string, string> = {
    bronze: "text-amber-700 bg-amber-500/10",
    silver: "text-slate-500 bg-slate-400/15",
    gold: "text-yellow-600 bg-yellow-500/15",
    platinum: "text-violet-600 bg-violet-500/15",
  };

  const canPay =
    card.name.trim().length > 1 &&
    card.number.replace(/\s/g, "").length >= 12 &&
    /^\d{2}\/\d{2}$/.test(card.exp) &&
    /^\d{3,4}$/.test(card.cvc);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md card-soft p-5 bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-semibold">
            {step === 1 ? "Review order" : step === 2 ? "Payment details" : "Order confirmed"}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-1.5 mb-4 text-[10px] uppercase tracking-wider">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex-1 h-1 rounded ${step >= n ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{provider.name} · {item.stock} in stock</div>
              <div className="mt-2 text-xs">{fmt(item.price)}{item.unit ? ` / ${item.unit}` : ""}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Quantity</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded border border-input p-1.5 hover:bg-secondary"><Minus className="h-3.5 w-3.5" /></button>
                <input type="number" min={1} max={item.stock} value={qty} onChange={(e) => setQty(Math.min(item.stock, Math.max(1, Number(e.target.value) || 1)))} className={inputClass("w-20 text-center")} />
                <button onClick={() => setQty((q) => Math.min(item.stock, q + 1))} className="rounded border border-input p-1.5 hover:bg-secondary"><Plus className="h-3.5 w-3.5" /></button>
                <span className="text-xs text-muted-foreground">max {item.stock}</span>
              </div>
            </div>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`text-[10px] uppercase tracking-wider rounded-full px-1.5 py-0.5 ${tierColor[tier]}`}>{tier}</span>
                  <span className="text-muted-foreground">Loyalty discount</span>
                </span>
                <span className={discountPct > 0 ? "text-emerald-600" : "text-muted-foreground"}>
                  {discountPct > 0 ? `−${fmt(discountAmt)} (${discountPct}%)` : "—"}
                </span>
              </div>
              <div className="flex justify-between font-display text-lg font-semibold pt-1">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Continue to payment
            </button>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (canPay) buy.mutate(); }}
            className="space-y-3"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Test mode — do not enter real card numbers.
            </div>
            <Field label="Cardholder name">
              <input className={inputClass()} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} required />
            </Field>
            <Field label="Card number">
              <div className="relative">
                <CreditCard className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  className={inputClass("pl-7")}
                  value={card.number}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 19);
                    setCard({ ...card, number: digits.replace(/(.{4})/g, "$1 ").trim() });
                  }}
                  required
                />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry (MM/YY)">
                <input
                  placeholder="12/27"
                  className={inputClass()}
                  value={card.exp}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    setCard({ ...card, exp: v });
                  }}
                  required
                />
              </Field>
              <Field label="CVC">
                <input
                  inputMode="numeric"
                  placeholder="123"
                  className={inputClass()}
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  required
                />
              </Field>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span>Total due</span>
              <span className="font-display text-lg font-semibold">{fmt(total)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-md border border-input px-3 py-2 text-sm">Back</button>
              <button disabled={!canPay || buy.isPending} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {buy.isPending ? "Processing…" : `Pay ${fmt(total)}`}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 grid place-items-center text-emerald-500">✓</div>
            <div>
              <div className="font-display text-lg font-semibold">Thank you!</div>
              <p className="text-sm text-muted-foreground mt-1">
                {qty} × {item.name} for {fmt(total)}. The provider has been notified. You can cancel from "Your recent activity" if needed.
              </p>
            </div>
            <button onClick={onClose} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Done</button>
          </div>
        )}
      </div>
    </div>
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
