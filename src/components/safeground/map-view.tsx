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
  focusId = null,
  focusZoom = 13,
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  focusId?: string | null;
  focusZoom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const LRef = useRef<typeof LeafletNS | null>(null);
  const markerObjsRef = useRef<Map<string, LeafletNS.CircleMarker>>(new Map());
  const markersRef = useRef<MapMarker[]>(markers);
  markersRef.current = markers;
  const focusIdRef = useRef<string | null>(focusId);
  focusIdRef.current = focusId;

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
      renderMarkers(L, layerRef.current, markersRef.current, markerObjsRef.current, focusIdRef.current);
      applyFocus(map, markerObjsRef.current, markersRef.current, focusIdRef.current, focusZoom);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerObjsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!LRef.current || !layerRef.current) return;
    renderMarkers(LRef.current, layerRef.current, markers, markerObjsRef.current, focusId);
  }, [markers, focusId]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyFocus(mapRef.current, markerObjsRef.current, markers, focusId, focusZoom);
  }, [focusId, markers, focusZoom]);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-border relative z-0 isolate" />;
}

function renderMarkers(
  L: typeof LeafletNS,
  layer: LeafletNS.LayerGroup,
  markers: MapMarker[],
  store: Map<string, LeafletNS.CircleMarker>,
  focusId: string | null,
) {
  layer.clearLayers();
  store.clear();
  for (const m of markers) {
    const isFocus = focusId === m.id;
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: isFocus ? 14 : 8,
      color: m.color,
      fillColor: m.color,
      fillOpacity: isFocus ? 0.9 : 0.7,
      weight: isFocus ? 4 : 2,
    });
    const html = m.popupHtml ?? `<strong>${escapeHtml(m.title)}</strong>`;
    marker.bindPopup(html);
    marker.addTo(layer);
    store.set(m.id, marker);
  }
}

function applyFocus(
  map: LeafletNS.Map,
  store: Map<string, LeafletNS.CircleMarker>,
  markers: MapMarker[],
  focusId: string | null,
  focusZoom: number,
) {
  if (!focusId) return;
  const target = markers.find((m) => m.id === focusId);
  if (!target) return;
  map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), focusZoom), { duration: 0.6 });
  const mk = store.get(focusId);
  if (mk) {
    mk.bringToFront();
    setTimeout(() => mk.openPopup(), 400);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
