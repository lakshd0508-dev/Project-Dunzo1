import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, Loader2, Compass, Check } from "lucide-react";
import { api } from "@/lib/api";

// AddressPicker — location search (Nominatim proxy) + GPS detect
// Emits: onPick({ line1, area, city, state, pincode, lat, lng, display })
export default function AddressPicker({ onPick, initial = null, compact = false, testIdPrefix = "addr" }) {
  const [q, setQ] = useState(initial?.display || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selected, setSelected] = useState(initial);
  const debounce = useRef(null);

  const parseNominatim = (item) => {
    const a = item.address || {};
    const line1 = a.road || a.pedestrian || a.building || a.neighbourhood || item.display_name?.split(",")[0] || "Location";
    const area = a.suburb || a.neighbourhood || a.city_district || a.locality || "";
    const city = a.city || a.town || a.village || a.county || a.state_district || "Bangalore";
    const state = a.state || "Karnataka";
    const pincode = a.postcode || "560001";
    return {
      display: item.display_name,
      line1,
      area,
      city,
      state,
      pincode,
      lat: Number(item.lat),
      lng: Number(item.lon),
    };
  };

  useEffect(() => {
    if (!q || q.length < 3 || q === selected?.display) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/geocode/search", { params: { q } });
        setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
    // eslint-disable-next-line
  }, [q]);

  const pick = (item) => {
    const parsed = parseNominatim(item);
    setSelected(parsed);
    setQ(parsed.display);
    setResults([]);
    onPick?.(parsed);
  };

  const detectGps = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.get("/geocode/reverse", {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          const parsed = parseNominatim({
            ...data,
            display_name: data.display_name || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setSelected(parsed);
          setQ(parsed.display);
          onPick?.(parsed);
          toast.success("Location detected");
        } catch (e) {
          toast.error("Failed to fetch address");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        toast.error(err.message || "GPS permission denied");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={2.5} />
          <input
            data-testid={`${testIdPrefix}-search-input`}
            className="dz-input pl-10"
            placeholder="Search area, road, landmark, pincode…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (selected && e.target.value !== selected.display) setSelected(null);
            }}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-500" />
          )}
        </div>
        <button
          type="button"
          data-testid={`${testIdPrefix}-gps-btn`}
          onClick={detectGps}
          className="dz-btn-amber inline-flex items-center gap-1 !py-2 !px-3 whitespace-nowrap"
          disabled={gpsLoading}
        >
          {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" strokeWidth={2.5} />}
          {!compact && <span>GPS</span>}
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto dz-scrollbar bg-white border-2 border-black rounded-xl" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>
          {results.map((r, i) => (
            <button
              key={`${r.place_id}-${i}`}
              onClick={() => pick(r)}
              data-testid={`${testIdPrefix}-result-item`}
              className="w-full text-left px-4 py-3 border-b-2 border-dashed border-black/20 last:border-b-0 hover:bg-[#00E181]/20 transition-colors flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 text-[#00E181] mt-0.5 shrink-0" strokeWidth={2.5} />
              <span className="text-xs font-bold leading-relaxed">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-3 p-3 border-2 border-black rounded-xl bg-[#00E181]/20 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} />
          <div className="text-xs font-bold flex-1">
            <div className="font-black uppercase text-[10px] tracking-widest mb-1">Selected</div>
            {selected.line1}
            {selected.area ? `, ${selected.area}` : ""}, {selected.city}, {selected.state} - {selected.pincode}
          </div>
        </div>
      )}
    </div>
  );
}
