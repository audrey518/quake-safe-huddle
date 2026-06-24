import { createFileRoute } from "@tanstack/react-router";

async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return res.ok;
}

export const Route = createFileRoute("/api/public/hooks/appointment-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return Response.json({ error: "no-token" }, { status: 500 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Target = today + 2 days (UTC date string)
        const target = new Date();
        target.setUTCDate(target.getUTCDate() + 2);
        const targetStr = target.toISOString().slice(0, 10);

        const { data: appts, error } = await supabaseAdmin
          .from("appointments")
          .select("id, user_id, service_name, provider_name, appointment_date, appointment_time, contact_phone")
          .eq("appointment_date", targetStr)
          .eq("reminder_sent", false);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!appts || appts.length === 0) return Response.json({ ok: true, sent: 0 });

        const userIds = Array.from(new Set(appts.map((a) => a.user_id as string)));
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, telegram_chat_id")
          .in("id", userIds);
        const chatMap = new Map<string, string | null>();
        for (const p of profs ?? []) chatMap.set(p.id as string, (p.telegram_chat_id as string | null) ?? null);

        let sent = 0;
        for (const a of appts) {
          const chatId = chatMap.get(a.user_id as string);
          if (chatId) {
            const time = a.appointment_time ? ` at ${a.appointment_time}` : "";
            const phone = a.contact_phone ? `\nContact: ${a.contact_phone}` : "";
            const ok = await sendTelegram(
              token,
              chatId,
              `⏰ <b>Appointment in 2 days</b>\n<b>${a.service_name}</b>\nProvider: ${a.provider_name}\nDate: ${a.appointment_date}${time}${phone}`,
            );
            if (ok) sent++;
          }
          await supabaseAdmin.from("appointments").update({ reminder_sent: true }).eq("id", a.id);
        }
        return Response.json({ ok: true, sent, total: appts.length });
      },
    },
  },
});
