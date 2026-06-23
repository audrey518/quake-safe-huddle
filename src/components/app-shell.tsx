import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, Building2, Home, Megaphone, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/buildings", label: "Buildings", icon: Building2 },
  { to: "/earthquakes", label: "Earthquakes", icon: Activity },
  { to: "/reports", label: "Reports", icon: Megaphone },
  { to: "/risk", label: "Risk", icon: ShieldAlert },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="absolute inset-0 rounded-lg bg-primary/40 blur-md group-hover:bg-primary/60 transition" />
              <ShieldAlert className="relative h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight">SafeGround</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Community preparedness
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
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
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
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <nav className="md:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-border bg-background">
        <div className="container-app py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>SafeGround MVP — community awareness, not engineering advice.</span>
          <span>
            Earthquake data:{" "}
            <a
              href="https://earthquake.usgs.gov/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              USGS
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
