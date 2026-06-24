import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { findPost, LEARN_CATEGORIES, type LearnCategory, type LearnPost } from "@/lib/learn-content";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/$category/$post")({
  head: ({ params }) => {
    const found = findPost(params.category, params.post);
    if (!found) return { meta: [{ title: "Post not found — GeoSafe AI" }] };
    return {
      meta: [
        { title: `${found.post.title} — GeoSafe AI` },
        { name: "description", content: found.post.excerpt },
      ],
    };
  },
  loader: ({ params }) => {
    const found = findPost(params.category, params.post);
    if (!found) throw notFound();
    return found;
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="container-app py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Post not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have moved. Browse all Learn posts below.</p>
        <Link to="/learn" className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Learn
        </Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="container-app py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
        <Link to="/learn" className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Learn
        </Link>
      </div>
    </AppShell>
  ),
  component: PostPage,
});

function PostPage() {
  const { category, post } = Route.useLoaderData() as ReturnType<typeof findPost> & {};
  const related = category.posts.filter((p: typeof post) => p.slug !== post.slug);
  const otherCategories = LEARN_CATEGORIES.filter((c) => c.slug !== category.slug);

  return (
    <AppShell>
      <article className="container-app py-8 md:py-12 max-w-3xl">
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Learn posts
        </Link>

        <div
          className="mt-6 text-[10px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: category.accent }}
        >
          {category.shortTitle}
        </div>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
          <span>·</span>
          <span>GeoSafe AI editorial</span>
        </div>

        <div
          className="mt-8 rounded-xl border-l-4 bg-secondary/40 p-4 text-sm text-muted-foreground"
          style={{ borderLeftColor: category.accent }}
        >
          Community awareness, not engineering advice. For site-specific decisions consult a licensed engineer or geologist.
        </div>

        <div className="prose-like mt-8 space-y-5 text-[15px] leading-relaxed text-foreground/90">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {post.takeaways && post.takeaways.length > 0 && (
          <div className="mt-10 card-soft p-5">
            <h2 className="font-display text-base font-semibold tracking-tight">Key takeaways</h2>
            <ul className="mt-3 space-y-2">
              {post.takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: category.accent }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-lg font-semibold tracking-tight">More in {category.shortTitle}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to="/learn/$category/$post"
                  params={{ category: category.slug, post: p.slug }}
                  className="card-soft p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="font-medium leading-snug">{p.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.excerpt}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold tracking-tight">Explore other topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <Link
                key={c.slug}
                to="/learn"
                hash={c.slug}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
                style={{ color: c.accent }}
              >
                {c.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </AppShell>
  );
}
