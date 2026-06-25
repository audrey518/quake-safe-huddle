import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LEARN_CATEGORIES } from "@/lib/learn-content";
import { AlertTriangle, Building2, Droplets, GraduationCap, Hammer, Mountain } from "lucide-react";
import heroImg from "@/assets/hero-digital-learning.jpg";

export const Route = createFileRoute("/learn/")({
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
      <section className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 50%, #ecfeff 100%)" }}>
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, #ddd6fe 0%, transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, #fbcfe8 0%, transparent 70%)" }} />
        <div className="container-app relative py-10 md:py-14">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium rounded-full px-3 py-1" style={{ background: "#ede9fe", color: "#5b21b6" }}>
            <GraduationCap className="h-3.5 w-3.5" /> Learn
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

      <div className="container-app py-10 space-y-14">
        {LEARN_CATEGORIES.map((cat, ci) => {
          const Icon = ICONS[cat.icon];
          // pastel palettes rotated per category
          const palettes = [
            { soft: "#fee2e2", deep: "#991b1b", wash: "linear-gradient(135deg, #fee2e2 0%, #fff 100%)" }, // red - emergency
            { soft: "#e0e7ff", deep: "#3730a3", wash: "linear-gradient(135deg, #e0e7ff 0%, #fff 100%)" }, // indigo - building
            { soft: "#fef3c7", deep: "#92400e", wash: "linear-gradient(135deg, #fef3c7 0%, #fff 100%)" }, // amber - soil
            { soft: "#fce7f3", deep: "#9d174d", wash: "linear-gradient(135deg, #fce7f3 0%, #fff 100%)" }, // pink - materials
            { soft: "#cffafe", deep: "#155e75", wash: "linear-gradient(135deg, #cffafe 0%, #fff 100%)" }, // cyan - water
          ];
          const p = palettes[ci % palettes.length];
          return (
            <section key={cat.slug}>
              <div className="flex items-start gap-3 mb-5">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                  style={{ background: p.soft, color: p.deep }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight">{cat.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{cat.description}</p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {cat.posts.map((post) => (
                  <Link
                    key={post.slug}
                    to="/learn/$category/$post"
                    params={{ category: cat.slug, post: post.slug }}
                    className="group card-soft overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition-all flex flex-col"
                  >
                    <div className="relative h-32" style={{ background: p.wash }}>
                      <div aria-hidden className="absolute -right-4 -top-4 h-24 w-24 rounded-full" style={{ background: p.soft, opacity: 0.7 }} />
                      <div className="absolute inset-0 flex items-center justify-between px-5">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold rounded-full px-2 py-0.5 inline-block" style={{ background: "rgba(255,255,255,0.7)", color: p.deep }}>
                            {cat.shortTitle}
                          </div>
                          <div className="mt-2 text-xs font-medium" style={{ color: p.deep, opacity: 0.8 }}>
                            {post.readTime}
                          </div>
                        </div>
                        <Icon className="relative h-14 w-14" style={{ color: p.deep, opacity: 0.35 }} />
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display text-lg font-semibold tracking-tight leading-snug group-hover:underline underline-offset-4">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>
                      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium" style={{ color: p.deep }}>
                        Read article →
                      </div>
                    </div>
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
