import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PurchaseInput = {
  category: string;
  provider_name: string;
  item_name: string;
  price?: number | null;
  notes?: string | null;
  provider_item_id?: string | null;
  quantity?: number | null;
};


type AppointmentInput = {
  category: string;
  provider_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  provider_item_id?: string | null;
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

const FROM_EMAIL = "levivalorant122@gmail.com";

function encodeRawEmail(to: string, subject: string, body: string) {
  const msg = [
    `From: GeoSafe AI <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');
  // base64url
  return Buffer.from(msg, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendBuyerEmail(to: string, subject: string, body: string) {
  if (!to) return;
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) {
    console.warn("Gmail connector not configured");
    return;
  }
  try {
    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmailKey,
        },
        body: JSON.stringify({ raw: encodeRawEmail(to, subject, body) }),
      },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("Gmail send failed:", res.status, txt);
    }
  } catch (e) {
    console.warn("Gmail network error:", e);
  }
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

async function lookupProviderFromItem(itemId: string | null | undefined) {
  if (!itemId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: item } = await supabaseAdmin
    .from("provider_items").select("provider_id").eq("id", itemId).maybeSingle();
  if (!item?.provider_id) return null;
  const { data: p } = await supabaseAdmin
    .from("providers")
    .select("id,user_id,name,contact_email,telegram_chat_id")
    .eq("id", item.provider_id).maybeSingle();
  return p ?? null;
}

async function notifyProvider(opts: {
  provider: { contact_email: string | null; telegram_chat_id: string | null } | null;
  subject: string;
  body: string;
  telegramText: string;
}) {
  if (!opts.provider) return;
  if (opts.provider.contact_email) {
    await sendBuyerEmail(opts.provider.contact_email, opts.subject, opts.body);
  }
  if (opts.provider.telegram_chat_id) {
    await sendTelegram(opts.provider.telegram_chat_id, opts.telegramText);
  }
}

export const recordPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PurchaseInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const provider = await lookupProviderFromItem(data.provider_item_id);
    const { provider_item_id, ...rest } = data;
    void provider_item_id;
    const { data: row, error } = await supabaseAdmin
      .from("purchases")
      .insert({
        ...rest,
        user_id: context.userId,
        provider_id: provider?.id ?? null,
        provider_user_id: provider?.user_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const buyer = await getBuyerInfo(context.userId, context.claims?.email as string | undefined);
    const priceTxt = data.price ? ` — Rs. ${data.price}` : "";
    await broadcastToAdmins(
      `🛒 <b>New purchase</b>\n<b>${data.item_name}</b>${priceTxt}\nProvider: ${data.provider_name}\nCategory: ${data.category}\n\n<b>Buyer</b>\nName: ${buyer.name}\nEmail: ${buyer.email}`,
    );
    await sendBuyerEmail(
      buyer.email,
      `Your purchase: ${data.item_name}`,
      `Hi ${buyer.name},\n\nThanks for your purchase on GeoSafe AI.\n\nItem: ${data.item_name}${priceTxt}\nProvider: ${data.provider_name}\nCategory: ${data.category}\n\nWe'll be in touch with next steps.\n\n— GeoSafe AI`,
    );
    await notifyProvider({
      provider,
      subject: `New order: ${data.item_name}`,
      body: `Hi,\n\nYou have a new order on GeoSafe AI.\n\nItem: ${data.item_name}${priceTxt}\nCategory: ${data.category}\n\nCustomer\nName: ${buyer.name}\nEmail: ${buyer.email}\n\nManage this order in your provider dashboard.\n\n— GeoSafe AI`,
      telegramText: `🛒 <b>New order</b>\n<b>${data.item_name}</b>${priceTxt}\n\n<b>Customer</b>\n${buyer.name} — ${buyer.email}`,
    });
    return { purchase: row, buyerEmail: buyer.email };
  });


export const bookAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AppointmentInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const provider = await lookupProviderFromItem(data.provider_item_id);
    const { provider_item_id, ...rest } = data;
    void provider_item_id;
    const { data: row, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        ...rest,
        user_id: context.userId,
        provider_id: provider?.id ?? null,
        provider_user_id: provider?.user_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const buyer = await getBuyerInfo(context.userId, context.claims?.email as string | undefined);
    const time = data.appointment_time ? ` at ${data.appointment_time}` : "";
    await broadcastToAdmins(
      `📅 <b>New appointment</b>\n<b>${data.service_name}</b>\nProvider: ${data.provider_name}\nDate: ${data.appointment_date}${time}\nCategory: ${data.category}\n\n<b>Booked by</b>\nName: ${buyer.name}\nEmail: ${buyer.email}`,
    );
    await sendBuyerEmail(
      buyer.email,
      `Appointment confirmed: ${data.service_name}`,
      `Hi ${buyer.name},\n\nYour appointment is booked.\n\nService: ${data.service_name}\nProvider: ${data.provider_name}\nDate: ${data.appointment_date}${time}\nCategory: ${data.category}${data.contact_phone ? `\nContact: ${data.contact_phone}` : ""}${data.notes ? `\nNotes: ${data.notes}` : ""}\n\n— GeoSafe AI`,
    );
    await notifyProvider({
      provider,
      subject: `New booking: ${data.service_name}`,
      body: `Hi,\n\nYou have a new appointment booking on GeoSafe AI.\n\nService: ${data.service_name}\nDate: ${data.appointment_date}${time}\nCategory: ${data.category}\n\nCustomer\nName: ${buyer.name}\nEmail: ${buyer.email}${data.contact_phone ? `\nPhone: ${data.contact_phone}` : ""}${data.notes ? `\nNotes: ${data.notes}` : ""}\n\nManage this booking in your provider dashboard.\n\n— GeoSafe AI`,
      telegramText: `📅 <b>New booking</b>\n<b>${data.service_name}</b>\nDate: ${data.appointment_date}${time}\n\n<b>Customer</b>\n${buyer.name} — ${buyer.email}`,
    });
    return { appointment: row, buyerEmail: buyer.email };
  });
