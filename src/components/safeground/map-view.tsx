import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  popupHtml?: string;
};

export function MapView({
  markers,
  center = [20, 0],
  zoom = 2,
  height = 480,
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const LRef = useRef<typeof LeafletNS | null>(null);
  const markersRef = useRef<MapMarker[]>(markers);
  markersRef.current = markers;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = (mod.default ?? mod) as typeof LeafletNS;
      if (cancelled || !ref.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      renderMarkers(L, layerRef.current, markersRef.current);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!LRef.current || !layerRef.current) return;
    renderMarkers(LRef.current, layerRef.current, markers);
  }, [markers]);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-border relative z-0 isolate" />;
}

function renderMarkers(L: typeof LeafletNS, layer: LeafletNS.LayerGroup, markers: MapMarker[]) {
  layer.clearLayers();
  for (const m of markers) {
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: 8,
      color: m.color,
      fillColor: m.color,
      fillOpacity: 0.7,
      weight: 2,
    });
    const html = m.popupHtml ?? `<strong>${escapeHtml(m.title)}</strong>`;
    marker.bindPopup(html);
    marker.addTo(layer);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
