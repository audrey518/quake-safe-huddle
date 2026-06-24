import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TrustTier = "New" | "Contributor" | "Trusted" | "Expert";

export interface TrustBadge {
  tier: TrustTier;
  contributions: number;
  buildings: number;
  wells: number;
  reports: number;
  soil: number;
  color: string;
  description: string;
}

async function countFor(table: "buildings" | "wells" | "hazard_reports" | "soil_data", userId: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

export function tierFor(contributions: number): TrustTier {
  if (contributions >= 10) return "Expert";
  if (contributions >= 3) return "Trusted";
  if (contributions >= 1) return "Contributor";
  return "New";
}

export function tierColor(tier: TrustTier): string {
  switch (tier) {
    case "Expert": return "var(--color-risk-low)";
    case "Trusted": return "var(--color-primary)";
    case "Contributor": return "var(--color-risk-moderate)";
    case "New": return "var(--color-muted-foreground)";
  }
}

export function tierDescription(tier: TrustTier): string {
  switch (tier) {
    case "Expert": return "Long-standing contributor with verified field data.";
    case "Trusted": return "Multiple verified contributions to the community.";
    case "Contributor": return "Has shared at least one observation.";
    case "New": return "New member — share data to earn trust.";
  }
}

export function useTrustBadge(userId: string | undefined | null) {
  const q = useQuery({
    queryKey: ["trust-badge", userId ?? "none"],
    enabled: !!userId,
    queryFn: async (): Promise<TrustBadge> => {
      const [buildings, wells, reports, soil] = await Promise.all([
        countFor("buildings", userId!),
        countFor("wells", userId!),
        countFor("hazard_reports", userId!),
        countFor("soil_data", userId!),
      ]);
      const contributions = buildings + wells + reports + soil;
      const tier = tierFor(contributions);
      return {
        tier,
        contributions,
        buildings,
        wells,
        reports,
        soil,
        color: tierColor(tier),
        description: tierDescription(tier),
      };
    },
  });
  return q;
}
