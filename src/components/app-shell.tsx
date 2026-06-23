import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Activity, Building2, Droplets, Home, LogOut, Map, Megaphone, Mountain, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { GeoSafeLogo } from "@/components/geosafe-logo";

const BASE_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/earthquakes", label: "Quakes", icon: Activity },
  { to: "/buildings", label: "Buildings", icon: Building2 },
  { to: "/wells", label: "Wells", icon: Droplets },
  { to: "/reports", label: "Reports", icon: Megaphone },
  { to: "/soil", label: "Soil", icon: Mountain },
  { to: "/risk", label: "Risk", icon: ShieldAlert },
] as const;

export function AppShell({ children }: { children?: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { user } = useAuth();
  const { isProfessional } = useRole();

  const NAV = BASE_NAV; // soil view is open to all; submission gated inside

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
          <nav className="hidden lg:flex items-center gap-1">
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
              <span className="hidden md:inline-flex chip">
                {isProfessional ? "Professional" : "Local"}
              </span>
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

      <main className="flex-1 pb-20 lg:pb-0">{children ?? <Outlet />}</main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-8">
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

      <footer className="hidden lg:block border-t border-border bg-background">
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
