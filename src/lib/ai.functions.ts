import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input =
  | { kind: "building"; id: string; name: string; address: string; year_built: number; floors: number; material: string; risk_score: number; risk_category: string }
  | { kind: "well"; id: string; name: string; well_type: string; total_depth_m: number; current_level_m: number }
  | { kind: "soil"; id: string; soil_type: string; depth_m: number; notes: string | null; extras: Record<string, unknown> | null };

function prompt(input: Input): string {
  if (input.kind === "building") {
    return `Write a concise community-friendly safety brief (max 90 words, plain language, no headings) for this building. Include 2 short practical preparedness tips relevant to its risk profile.\n\nName: ${input.name}\nAddress: ${input.address}\nYear built: ${input.year_built}\nFloors: ${input.floors}\nMaterial: ${input.material}\nEarthquake risk: ${input.risk_category} (${input.risk_score}/100)`;
  }
  if (input.kind === "well") {
    return `Write a concise community-friendly brief (max 80 words, plain language, no headings) about this groundwater well. Note what its depth and current water level suggest, and give 1 short monitoring tip.\n\nName: ${input.name}\nType: ${input.well_type}\nTotal depth (m): ${input.total_depth_m}\nCurrent water level (m): ${input.current_level_m}`;
  }
  return `Write a concise community-friendly brief (max 90 words, plain language, no headings) about this soil record. Explain what the soil type and depth suggest for ground stability or construction, and give 1 short practical tip.\n\nSoil type: ${input.soil_type}\nDepth (m): ${input.depth_m}\nProfessional notes: ${input.notes ?? "—"}\nMeasurements: ${JSON.stringify(input.extras ?? {})}`;
  }


export const generateBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => data)
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are GeoSafe AI, helping residents understand earthquake and groundwater risks in plain language." },
          { role: "user", content: prompt(data) },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit — try again in a minute");
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok) throw new Error(`AI error (${res.status})`);
    const json = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Empty AI response");

    const table = data.kind === "building" ? "buildings" : data.kind === "well" ? "wells" : "soil_data";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from(table).update({ ai_brief: text }).eq("id", data.id);
    return { brief: text };
  });
