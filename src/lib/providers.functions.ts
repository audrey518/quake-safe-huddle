import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ApplyInput = {
  name: string;
  category: "materials" | "engineering" | "water" | "insurance";
  blurb?: string | null;
  location?: string | null;
  phone?: string | null;
  contact_email: string;
  license_number?: string | null;
};

export const applyAsProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ApplyInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Insert provider row (pending)
    const { data: existing } = await supabaseAdmin
      .from("providers").select("id").eq("user_id", context.userId).maybeSingle();
    if (existing) throw new Error("You already have a provider application");

    const { data: row, error } = await supabaseAdmin
      .from("providers")
      .insert({
        user_id: context.userId,
        name: data.name,
        category: data.category,
        blurb: data.blurb ?? null,
        location: data.location ?? null,
        phone: data.phone ?? null,
        contact_email: data.contact_email,
        license_number: data.license_number ?? null,
        status: "pending",
      })
      .select().single();
    if (error) throw new Error(error.message);

    // Grant provider role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: context.userId, role: "provider" },
      { onConflict: "user_id,role" },
    );
    return row;
  });

export const getMyProvider = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("providers").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { blurb?: string | null; location?: string | null; phone?: string | null; contact_email?: string | null; telegram_chat_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("providers").update(data).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: prov } = await supabase.from("providers").select("id").eq("user_id", context.userId).maybeSingle();
    if (!prov) return [];
    const { data, error } = await supabase.from("provider_items").select("*").eq("provider_id", prov.id).order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; price: number; unit?: string | null; appointment: boolean; active: boolean; stock: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prov } = await supabase.from("providers").select("id,status").eq("user_id", context.userId).maybeSingle();
    if (!prov) throw new Error("No provider profile");
    if (prov.status !== "approved") throw new Error("Awaiting admin approval");
    const stock = Math.max(0, Math.floor(Number(data.stock ?? 0)));
    if (data.id) {
      const { error } = await supabase.from("provider_items").update({
        name: data.name, price: data.price, unit: data.unit ?? null,
        appointment: data.appointment, active: data.active, stock,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("provider_items").insert({
        provider_id: prov.id,
        name: data.name, price: data.price, unit: data.unit ?? null,
        appointment: data.appointment, active: data.active, stock,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });


export const deleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("provider_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [p, a] = await Promise.all([
      supabase.from("purchases").select("*").eq("provider_user_id", context.userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("appointments").select("*").eq("provider_user_id", context.userId).order("created_at", { ascending: false }).limit(100),
    ]);
    const purchases = p.data ?? [];
    const appointments = a.data ?? [];

    // Enrich with customer details (name + email + phone) for the provider.
    const userIds = Array.from(new Set([
      ...purchases.map((r: any) => r.user_id).filter(Boolean),
      ...appointments.map((r: any) => r.user_id).filter(Boolean),
    ]));
    const customers: Record<string, { name: string; email: string | null; phone: string | null }> = {};
    if (userIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, display_name").in("id", userIds);
      for (const pr of profs ?? []) {
        customers[pr.id] = { name: (pr as any).display_name ?? "Customer", email: null, phone: null };
      }
      // Fetch emails/phones via auth admin
      await Promise.all(userIds.map(async (uid) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
          const u = data?.user;
          if (!u) return;
          customers[uid] = {
            name: customers[uid]?.name ?? ((u.user_metadata as any)?.display_name ?? u.email ?? "Customer"),
            email: u.email ?? null,
            phone: (u.phone as string | null) ?? null,
          };
        } catch { /* ignore */ }
      }));
    }
    const enrich = <T extends { user_id: string | null }>(r: T) => ({
      ...r,
      customer: (r.user_id && customers[r.user_id]) || { name: "Customer", email: null, phone: null },
    });
    return {
      purchases: purchases.map(enrich),
      appointments: appointments.map(enrich),
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; kind: "purchase" | "appointment"; status: "new" | "accepted" | "completed" | "cancelled" }) => d)
  .handler(async ({ data, context }) => {
    const table = data.kind === "purchase" ? "purchases" : "appointments";
    const { data: existing } = await context.supabase.from(table).select("status").eq("id", data.id).maybeSingle();
    if (existing?.status === "cancelled") {
      throw new Error("This order was cancelled by the customer and can no longer be updated.");
    }
    const { error } = await context.supabase.from(table).update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetRevenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("purchases")
      .select("id, item_name, price, quantity, admin_commission, provider_payout, status, created_at, provider_user_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const totalRevenue = rows.reduce((s, r) => s + Number((r as any).admin_commission ?? 0), 0);
    const grossSales = rows.reduce((s, r) => s + Number((r as any).price ?? 0), 0);
    return { rows, totalRevenue, grossSales, count: rows.length };
  });


export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date();
    since.setDate(1); since.setHours(0,0,0,0);
    const sinceIso = since.toISOString();
    const { supabase } = context;
    const [pAll, pMonth, aMonth] = await Promise.all([
      supabase.from("purchases").select("status", { count: "exact", head: false }).eq("provider_user_id", context.userId),
      supabase.from("purchases").select("price,status").eq("provider_user_id", context.userId).gte("created_at", sinceIso),
      supabase.from("appointments").select("status").eq("provider_user_id", context.userId).gte("created_at", sinceIso),
    ]);
    const purchases = pMonth.data ?? [];
    const appts = aMonth.data ?? [];
    const ordersThisMonth = purchases.length + appts.length;
    const revenueThisMonth = purchases.reduce((s, r) => s + Number(r.price ?? 0), 0);
    const pending = ((pAll.data ?? []) as { status: string }[]).filter(r => r.status === "new").length;
    return { ordersThisMonth, revenueThisMonth, pending };
  });

// Admin
export const adminListProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("providers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetProviderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "approved" | "rejected" | "pending" }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("providers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
