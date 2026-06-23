import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { fetchRecentEarthquakes, type UsgsFeed } from "@/lib/usgs";
import { formatDate, formatDistanceToNow } from "@/lib/format";
import { MagnitudeBadge } from "@/routes/index";
import { ExternalLink, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/earthquakes")({
  head: () => ({
    meta: [
      { title: "Earthquakes — SafeGround" },
      { name: "description", content: "Live earthquake feed from the USGS — magnitude, depth, location, and time." },
    ],
  }),
  component: EarthquakesPage,
});

const FEEDS: { id: UsgsFeed; label: string }[] = [
  { id: "all_hour", label: "Past hour" },
  { id: "2.5_day", label: "M2.5+ · day" },
  { id: "4.5_day", label: "M4.5+ · day" },
  { id: "significant_week", label: "Significant · week" },
];

function EarthquakesPage() {
  const [feed, setFeed] = useState<UsgsFeed>("2.5_day");
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["usgs", feed],
    queryFn: () => fetchRecentEarthquakes(feed),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <AppShell>
      <div className="container-app py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Earthquake activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time data from the U.S. Geological Survey global feed.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {FEEDS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFeed(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                feed === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="card-soft mt-6 overflow-hidden">
          {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Loading USGS feed…</div>}
          {error && (
            <div className="p-10 text-center text-sm text-danger">
              Could not load earthquake data. Check your connection and try again.
            </div>
          )}
          {!isLoading && !error && (
            <ul className="divide-y divide-border">
              {(data ?? []).map((q) => (
                <li key={q.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40">
                  <MagnitudeBadge mag={q.magnitude} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{q.place}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {q.depth.toFixed(0)} km deep · {formatDate(q.time)} ({formatDistanceToNow(q.time)} ago)
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {q.latitude.toFixed(2)}, {q.longitude.toFixed(2)}
                    </div>
                  </div>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Open on USGS"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </li>
              ))}
              {(data?.length ?? 0) === 0 && (
                <li className="p-10 text-center text-sm text-muted-foreground">No earthquakes in this feed right now.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
