import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "local" | "professional" | "provider" | "admin";

export function useRole() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
  const roles = q.data ?? [];
  const isProfessional = roles.includes("professional");
  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");
  return {
    roles,
    isProfessional,
    isProvider,
    isAdmin,
    // Only treat as "local" when no elevated role is present, so navigation
    // and gating don't mix categories after sign-in.
    isLocal: !isProfessional && !isProvider && !isAdmin,
    loading: q.isLoading,
  };
}
