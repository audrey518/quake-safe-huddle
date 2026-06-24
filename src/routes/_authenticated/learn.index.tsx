import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LEARN_CATEGORIES } from "@/lib/learn-content";
import { AlertTriangle, Building2, Droplets, GraduationCap, Hammer, Mountain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({
    meta: [
      { title: "Learn — GeoSafe AI" },
      { name: "description", content: "Plain-language guides on earthquake response, safer buildings, soils, materials, and groundwater." },
    ],
  }),
  component: LearnIndex,
});

const ICONS = {
  alert: AlertTriangle,
  building: Building2,
  soil: Mountain,
  materials: Hammer,
  water: Droplets,
} as const;

function LearnIndex() {
  return (
    <AppShell>
      <section className="border-b border-border bg-gradient-to-b from-accent/40 via-background to-background">
        <div className="container-app py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <GraduationCap className="h-4 w-4" /> Learn
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight font-display">
            Practical knowledge for ground that moves.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Short, plain-language posts on what to do in an earthquake, how to choose and strengthen a building,
            and how soil and groundwater shape the risk under your feet.
          </p>
        </div>
      </section>

      <div className="container-app py-8 space-y-10">
        {LEARN_CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.icon];
          return (
            <section key={cat.slug}>
              <div className="flex items-start gap-3 mb-4">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${cat.accent} 18%, transparent)`, color: cat.accent }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight">{cat.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{cat.description}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cat.posts.map((p) => (
                  <Link
                    key={p.slug}
                    to="/learn/$category/$post"
                    params={{ category: cat.slug, post: p.slug }}
                    className="card-soft p-5 group hover:bg-secondary/40 transition-colors flex flex-col"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ color: cat.accent }}>
                      {cat.shortTitle}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold tracking-tight leading-snug group-hover:underline underline-offset-4">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{p.excerpt}</p>
                    <div className="mt-4 text-xs text-muted-foreground">{p.readTime}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
