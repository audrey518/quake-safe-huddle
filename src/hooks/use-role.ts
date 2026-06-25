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
  return {
    roles,
    isProfessional: roles.includes("professional"),
    isProvider: roles.includes("provider"),
    isAdmin: roles.includes("admin"),
    isLocal: roles.includes("local") || roles.length === 0,
    loading: q.isLoading,
  };
}
