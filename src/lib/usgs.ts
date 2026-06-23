export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  depth: number;
  latitude: number;
  longitude: number;
  url: string;
}

export type UsgsFeed =
  | "significant_week"
  | "4.5_day"
  | "2.5_day"
  | "all_day"
  | "all_hour";

export async function fetchRecentEarthquakes(feed: UsgsFeed = "2.5_day"): Promise<Earthquake[]> {
  const res = await fetch(
    `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`,
  );
  if (!res.ok) throw new Error(`USGS request failed: ${res.status}`);
  const json = (await res.json()) as {
    features: Array<{
      id: string;
      properties: { mag: number | null; place: string | null; time: number; url: string };
      geometry: { coordinates: [number, number, number] };
    }>;
  };
  return json.features
    .filter((f) => typeof f.properties.mag === "number")
    .map((f) => ({
      id: f.id,
      magnitude: f.properties.mag ?? 0,
      place: f.properties.place ?? "Unknown location",
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      url: f.properties.url,
    }))
    .sort((a, b) => b.time - a.time);
}
