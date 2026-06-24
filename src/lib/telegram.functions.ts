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
  appointment_date: string; // YYYY-MM-DD
  appointment_time?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
};

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set");
    return { ok: false, description: "TELEGRAM_BOT_TOKEN not configured on the server." };
  }
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    return { ok: false, description: `Network error contacting Telegram: ${e instanceof Error ? e.message : String(e)}` };
  }
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; error_code?: number };
  if (!json.ok) console.warn("Telegram send failed:", res.status, json);
  return json;
}

async function getChatId(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("telegram_chat_id").eq("id", userId).maybeSingle();
  return (data?.telegram_chat_id as string | null) ?? null;
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

    const chatId = await getChatId(context.userId);
    if (chatId) {
      const priceTxt = data.price ? ` — Rs. ${data.price}` : "";
      await sendTelegram(
        chatId,
        `🛒 <b>Purchase confirmed</b>\n<b>${data.item_name}</b>${priceTxt}\nProvider: ${data.provider_name}\nCategory: ${data.category}`,
      );
    }
    return { purchase: row, telegramSent: !!chatId };
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

    const chatId = await getChatId(context.userId);
    if (chatId) {
      const time = data.appointment_time ? ` at ${data.appointment_time}` : "";
      await sendTelegram(
        chatId,
        `📅 <b>Appointment booked</b>\n<b>${data.service_name}</b>\nProvider: ${data.provider_name}\nDate: ${data.appointment_date}${time}\nA reminder will be sent 2 days before.`,
      );
    }
    return { appointment: row, telegramSent: !!chatId };
  });

export const sendTestPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const chatId = await getChatId(context.userId);
    if (!chatId) throw new Error("Add your Telegram chat ID in your profile first.");
    const res = await sendTelegram(chatId, "✅ GeoSafe AI connected. You'll receive purchase and appointment notifications here.");
    return { ok: res.ok ?? false };
  });
