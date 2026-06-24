import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { GraduationCap, Home, LogOut, Map, ShieldCheck, Store, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTrustBadge } from "@/hooks/use-trust-badge";
import { GeoSafeLogo } from "@/components/geosafe-logo";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/map", label: "InfoHub\n", icon: Map },
  { to: "/services", label: "Services/Products", icon: Store },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
] as const;

export function AppShell({ children }: { children?: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { user } = useAuth();
  const badge = useTrustBadge(user?.id);
  const accountName = user?.email?.split("@")[0] ?? "Account";

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <GeoSafeLogo className="h-8 w-8 rounded-lg" />
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight">GeoSafe AI</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Geo-risk awareness
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {user && (
              <Link
                to="/profile"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs hover:bg-secondary"
                title={badge.data ? `${badge.data.tier} — ${badge.data.contributions} contributions` : "Profile"}
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background: `color-mix(in oklab, ${badge.data?.color ?? "var(--color-muted-foreground)"} 18%, transparent)`,
                    color: badge.data?.color ?? "var(--color-muted-foreground)",
                  }}
                >
                  <ShieldCheck className="h-3 w-3" /> {badge.data?.tier ?? "—"}
                </span>
                <span className="text-foreground/80 max-w-[120px] truncate">{accountName}</span>
              </Link>
            )}
            {user && (
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-secondary"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children ?? <Outlet />}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-border bg-background">
        <div className="container-app py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>GeoSafe AI MVP — community awareness, not engineering advice.</span>
          <span>
            Earthquake data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">USGS</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
