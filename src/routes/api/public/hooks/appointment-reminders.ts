import { createFileRoute } from "@tanstack/react-router";

const FROM_EMAIL = "levivalorant122@gmail.com";

function encodeRawEmail(to: string, subject: string, body: string) {
  const msg = [
    `From: GeoSafe AI <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  return Buffer.from(msg, "utf-8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!to) return false;
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) {
    console.warn("Gmail connector not configured");
    return false;
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
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Gmail network error:", e);
    return false;
  }
}

export const Route = createFileRoute("/api/public/hooks/appointment-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Target = today + 2 days (UTC date string)
        const target = new Date();
        target.setUTCDate(target.getUTCDate() + 2);
        const targetStr = target.toISOString().slice(0, 10);

        const { data: appts, error } = await supabaseAdmin
          .from("appointments")
          .select("id, user_id, provider_id, service_name, provider_name, appointment_date, appointment_time, contact_phone, status")
          .eq("appointment_date", targetStr)
          .eq("reminder_sent", false)
          .neq("status", "cancelled");
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!appts || appts.length === 0) return Response.json({ ok: true, sent: 0 });

        // Resolve user emails via auth admin
        const userIds = Array.from(new Set(appts.map((a) => a.user_id as string)));
        const userEmail = new Map<string, string>();
        const userName = new Map<string, string>();
        const { data: profs } = await supabaseAdmin
          .from("profiles").select("id, display_name").in("id", userIds);
        for (const p of profs ?? []) userName.set(p.id as string, (p.display_name as string | null) ?? "");
        for (const uid of userIds) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u.user?.email) userEmail.set(uid, u.user.email);
          if (!userName.get(uid)) userName.set(uid, u.user?.email?.split("@")[0] ?? "there");
        }

        // Resolve provider contact emails
        const providerIds = Array.from(new Set(appts.map((a) => a.provider_id).filter(Boolean) as string[]));
        const providerEmail = new Map<string, string>();
        if (providerIds.length) {
          const { data: provs } = await supabaseAdmin
            .from("providers").select("id, contact_email").in("id", providerIds);
          for (const p of provs ?? []) if (p.contact_email) providerEmail.set(p.id as string, p.contact_email as string);
        }

        let sent = 0;
        for (const a of appts) {
          const time = a.appointment_time ? ` at ${a.appointment_time}` : "";
          const uEmail = userEmail.get(a.user_id as string) ?? "";
          const uName = userName.get(a.user_id as string) ?? "there";
          const phoneLine = a.contact_phone ? `\nContact: ${a.contact_phone}` : "";

          if (uEmail) {
            const ok = await sendEmail(
              uEmail,
              `Reminder: ${a.service_name} in 2 days`,
              `Hi ${uName},\n\nThis is a reminder that your appointment is in 2 days.\n\nService: ${a.service_name}\nProvider: ${a.provider_name}\nDate: ${a.appointment_date}${time}${phoneLine}\n\n— GeoSafe AI`,
            );
            if (ok) sent++;
          }
          const pEmail = a.provider_id ? providerEmail.get(a.provider_id as string) : undefined;
          if (pEmail) {
            const ok = await sendEmail(
              pEmail,
              `Reminder: upcoming appointment for ${a.service_name}`,
              `Hi,\n\nReminder of an upcoming appointment in 2 days.\n\nService: ${a.service_name}\nDate: ${a.appointment_date}${time}\n\nCustomer\nName: ${uName}\nEmail: ${uEmail}${phoneLine}\n\n— GeoSafe AI`,
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
