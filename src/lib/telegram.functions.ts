import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PurchaseInput = {
  category: string;
  provider_name: string;
  item_name: string;
  price?: number | null;
  notes?: string | null;
};

type AppointmentInput = {
  category: string;
  provider_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
};

const ADMIN_CHAT_IDS = ["1834136976", "1461619839", "1696784301", "6184984095"];

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!json.ok) console.warn("Telegram send failed:", chatId, res.status, json);
    return json;
  } catch (e) {
    console.warn("Telegram network error:", e);
    return { ok: false, description: String(e) };
  }
}

async function broadcastToAdmins(text: string) {
  await Promise.all(ADMIN_CHAT_IDS.map((id) => sendTelegram(id, text)));
}

async function getBuyerInfo(userId: string, fallbackEmail?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  let email = fallbackEmail ?? "";
  if (!email) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = u.user?.email ?? "";
  }
  return { name: (profile?.display_name as string | null) ?? email.split("@")[0] ?? "Unknown", email };
}

export const recordPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PurchaseInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("purchases")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const buyer = await getBuyerInfo(context.userId, context.claims?.email as string | undefined);
    const priceTxt = data.price ? ` — Rs. ${data.price}` : "";
    await broadcastToAdmins(
      `🛒 <b>New purchase</b>\n<b>${data.item_name}</b>${priceTxt}\nProvider: ${data.provider_name}\nCategory: ${data.category}\n\n<b>Buyer</b>\nName: ${buyer.name}\nEmail: ${buyer.email}`,
    );
    return { purchase: row, buyerEmail: buyer.email };
  });

export const bookAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AppointmentInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("appointments")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const buyer = await getBuyerInfo(context.userId, context.claims?.email as string | undefined);
    const time = data.appointment_time ? ` at ${data.appointment_time}` : "";
    await broadcastToAdmins(
      `📅 <b>New appointment</b>\n<b>${data.service_name}</b>\nProvider: ${data.provider_name}\nDate: ${data.appointment_date}${time}\nCategory: ${data.category}\n\n<b>Booked by</b>\nName: ${buyer.name}\nEmail: ${buyer.email}`,
    );
    return { appointment: row, buyerEmail: buyer.email };
  });
