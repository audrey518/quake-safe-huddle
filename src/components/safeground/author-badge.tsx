import { useQuery } from "@tanstack/react-query";
import { Briefcase, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tierColor, tierFor, type TrustTier } from "@/hooks/use-trust-badge";

interface AuthorInfo {
  displayName: string;
  tier: TrustTier;
  color: string;
  contributions: number;
  isProfessional: boolean;
}

async function fetchAuthor(userId: string): Promise<AuthorInfo> {
  const [profileRes, rolesRes, b, w, r, s] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("buildings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("wells").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("hazard_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("soil_data").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const contributions = (b.count ?? 0) + (w.count ?? 0) + (r.count ?? 0) + (s.count ?? 0);
  const tier = tierFor(contributions);
  const isProfessional = (rolesRes.data ?? []).some((r) => r.role === "professional");
  return {
    displayName: profileRes.data?.display_name || "Member",
    tier,
    color: tierColor(tier),
    contributions,
    isProfessional,
  };
}

export function AuthorBadge({ userId, size = "sm" }: { userId: string | null | undefined; size?: "sm" | "md" }) {
  const q = useQuery({
    queryKey: ["author-badge", userId ?? "none"],
    enabled: !!userId,
    queryFn: () => fetchAuthor(userId!),
    staleTime: 60_000,
  });
  if (!userId) return null;
  const data = q.data;
  const small = size === "sm";
  const roleLabel = data?.isProfessional ? "Professional" : "Local user";
  const RoleIcon = data?.isProfessional ? Briefcase : User;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-background ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}`}
      title={data ? `${roleLabel} · ${data.tier} contributor — ${data.contributions} contributions` : "Member"}
    >
      <span className="max-w-[120px] truncate text-foreground/80">{data?.displayName ?? "…"}</span>
      <span
        className={`inline-flex items-center gap-0.5 rounded-full font-semibold uppercase tracking-wider ${small ? "px-1 py-px text-[9px]" : "px-1.5 py-0.5 text-[10px]"}`}
        style={{
          background: `color-mix(in oklab, ${data?.color ?? "var(--color-muted-foreground)"} 18%, transparent)`,
          color: data?.color ?? "var(--color-muted-foreground)",
        }}
      >
        <ShieldCheck className={small ? "h-2.5 w-2.5" : "h-3 w-3"} /> {data?.tier ?? "—"}
      </span>
      <span
        className={`inline-flex items-center gap-0.5 rounded-full bg-secondary text-foreground/80 ${small ? "px-1 py-px text-[9px]" : "px-1.5 py-0.5 text-[10px]"}`}
      >
        <RoleIcon className={small ? "h-2.5 w-2.5" : "h-3 w-3"} /> {roleLabel}
      </span>
    </span>
  );
}
