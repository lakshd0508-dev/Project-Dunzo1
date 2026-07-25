import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const buildDivIcon = (bg, color, label) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:${color};font-weight:900;font-family:'Archivo';padding:6px 12px;border:2px solid #000;border-radius:9999px;box-shadow:2px 2px 0 rgba(0,0,0,1);white-space:nowrap;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">${label}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });

const pickupIcon = buildDivIcon("#00E181", "#000", "Pickup");
const dropIcon = buildDivIcon("#EF4444", "#FFF", "Drop");
const courierIcon = buildDivIcon("#FBBF24", "#000", "Partner");

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, JSON.stringify(points)]); // eslint-disable-line
  return null;
}

export default function TrackingMap({ pickup, drop, courier, height = 400, testId = "tracking-map" }) {
  const targetPoint = courier || pickup || drop || { lat: 12.9716, lng: 77.5946 };
  const query = `${targetPoint.lat},${targetPoint.lng}`;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;

  return (
    <div data-testid={testId} className="dz-card overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm relative" style={{ height }}>
      <iframe
        title="Google Maps Live Tracking"
        src={mapSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute bottom-2 left-2 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-800 shadow-sm pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Live GPS Tracking via Google Maps
      </div>
    </div>
  );
}

