import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color: string; // CSS color
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
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
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
      marker.addTo(layerRef.current);
    }
  }, [markers]);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
