import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, Loader2, Compass, Check, Home, Briefcase, Star } from "lucide-react";
import { api } from "@/lib/api";

// AddressForm — search bar → editable details form.
// Emits: onSave(addressCreatePayload)  and optional onCancel()
// initial = existing address to edit (optional)
export default function AddressForm({ onSave, onCancel, onFormChange, initial = null, saving = false, testIdPrefix = "addr" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [form, setForm] = useState(initial || null);
  const debounce = useRef(null);

  const parseNominatim = (item) => {
    const a = item.address || {};
    const displayName = item.display_name || item.label || "";
    const parts = displayName.split(",");
    const line1 = a.road || a.pedestrian || a.building || a.neighbourhood || parts[0]?.trim() || "Street";
    const area = a.suburb || a.neighbourhood || a.city_district || a.locality || parts[1]?.trim() || "";
    const city = a.city || a.town || a.village || a.county || a.state_district || parts[2]?.trim() || "Bengaluru";
    const state = a.state || parts[3]?.trim() || "Karnataka";
    const pincode = a.postcode || parts[parts.length - 2]?.trim() || "560001";
    return {
      flat: "",
      building: a.building || "",
      line1,
      area,
      landmark: "",
      city,
      state,
      pincode: pincode.replace(/\D/g, "").slice(0, 6) || "560001",
      lat: Number(item.lat || 12.9716),
      lng: Number(item.lon || item.lng || 77.5946),
      label: "Home",
      is_primary: false,
    };
  };

  useEffect(() => {
    if (!q || q.length < 3) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/geocode/search", { params: { q } });
        setResults(Array.isArray(data) ? data : []);
      } catch (e) { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [q]);

  const pick = (item) => {
    const parsed = parseNominatim(item);
    const next = { ...(form || {}), ...parsed };
    setForm(next);
    onFormChange?.(next);
    setResults([]);
    setQ("");
  };

  const detectGps = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { data } = await api.get("/geocode/reverse", {
          params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
        const parsed = parseNominatim({
          ...data,
          display_name: data.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`,
          lat: pos.coords.latitude, lon: pos.coords.longitude,
        });
        const next = { ...(form || {}), ...parsed };
        setForm(next);
        onFormChange?.(next);
        toast.success("Location detected");
      } catch (e) { toast.error("Failed to fetch address"); }
      finally { setGpsLoading(false); }
    }, (err) => { toast.error(err.message || "GPS permission denied"); setGpsLoading(false); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  };

  const update = (k) => (v) => {
    const next = { ...(form || {}), [k]: v };
    setForm(next);
    onFormChange?.(next);
  };

  const submit = () => {
    if (!form) return toast.error("Search or detect a location first");
    if (!form.line1?.trim()) return toast.error("Street / area required");
    if (!form.city?.trim()) return toast.error("City required");
    if (!form.state?.trim()) return toast.error("State required");
    if (!form.pincode || form.pincode.length !== 6) return toast.error("Valid 6-digit pincode required");
    onSave?.(form);
  };

  return (
    <div className="space-y-4">
      {/* Search + GPS */}
      <div>
        <label className="dz-overline block mb-2">Search location on map *</label>
        <div className="flex items-stretch gap-2 relative">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={2.5} />
            <input
              data-testid={`${testIdPrefix}-search-input`}
              className="dz-input pl-10"
              placeholder="Search society, road, landmark, pincode…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-500" />}
          </div>
          <button
            type="button"
            data-testid={`${testIdPrefix}-gps-btn`}
            onClick={detectGps}
            className="dz-btn-amber inline-flex items-center gap-1 !py-2 !px-3 whitespace-nowrap"
            disabled={gpsLoading}
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" strokeWidth={2.5} />}
            <span>GPS</span>
          </button>

          {results.length > 0 && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto dz-scrollbar bg-white border-2 border-black rounded-xl" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>
              {results.map((r, i) => (
                <button
                  key={`${r.place_id}-${i}`}
                  type="button"
                  onClick={() => pick(r)}
                  data-testid={`${testIdPrefix}-result-item`}
                  className="w-full text-left px-4 py-3 border-b-2 border-dashed border-black/20 last:border-b-0 hover:bg-[#00E181]/20 transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#00E181] mt-0.5 shrink-0" strokeWidth={2.5} />
                  <span className="text-xs font-bold leading-relaxed">{r.display_name || r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {form && (
        <>
          <div className="border-t-2 border-dashed border-black" />
          <div className="dz-overline">Complete Address Details</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="dz-overline block mb-2">House / Flat No. *</label>
              <input data-testid={`${testIdPrefix}-flat`} className="dz-input" placeholder="A-401, 3rd Floor" value={form.flat || ""} onChange={(e) => update("flat")(e.target.value)} />
            </div>
            <div>
              <label className="dz-overline block mb-2">Building / Society</label>
              <input data-testid={`${testIdPrefix}-building`} className="dz-input" placeholder="Prestige Silver Oak" value={form.building || ""} onChange={(e) => update("building")(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="dz-overline block mb-2">Street / Road / Area *</label>
            <input data-testid={`${testIdPrefix}-line1`} className="dz-input" value={form.line1 || ""} onChange={(e) => update("line1")(e.target.value)} />
          </div>

          <div>
            <label className="dz-overline block mb-2">Landmark (optional)</label>
            <input data-testid={`${testIdPrefix}-landmark`} className="dz-input" placeholder="Near Iskcon Temple" value={form.landmark || ""} onChange={(e) => update("landmark")(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="dz-overline block mb-2">City *</label>
              <input data-testid={`${testIdPrefix}-city`} className="dz-input" value={form.city || ""} onChange={(e) => update("city")(e.target.value)} />
            </div>
            <div>
              <label className="dz-overline block mb-2">State *</label>
              <input data-testid={`${testIdPrefix}-state`} className="dz-input" value={form.state || ""} onChange={(e) => update("state")(e.target.value)} />
            </div>
            <div>
              <label className="dz-overline block mb-2">Pincode *</label>
              <input
                data-testid={`${testIdPrefix}-pincode`}
                className="dz-input font-mono"
                maxLength={6}
                value={form.pincode || ""}
                onChange={(e) => update("pincode")(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </div>

          <div>
            <label className="dz-overline block mb-2">Save as</label>
            <div className="flex gap-2">
              {[
                { v: "Home", icon: Home },
                { v: "Work", icon: Briefcase },
                { v: "Other", icon: Star },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => update("label")(opt.v)}
                  data-testid={`${testIdPrefix}-label-${opt.v.toLowerCase()}`}
                  className={`flex-1 py-2 rounded-lg border-2 border-black text-xs font-black uppercase flex items-center justify-center gap-1 ${form.label === opt.v ? "bg-[#00E181]" : "bg-white"}`}
                  style={{ boxShadow: form.label === opt.v ? "3px 3px 0px rgba(0,0,0,1)" : "1px 1px 0px rgba(0,0,0,1)" }}
                >
                  <opt.icon className="w-3 h-3" strokeWidth={2.5} /> {opt.v}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.is_primary}
              onChange={(e) => update("is_primary")(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded"
            />
            Set as primary delivery address
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-dashed border-black">
            {onCancel && <button type="button" onClick={onCancel} className="dz-btn-ghost">Cancel</button>}
            <button
              type="button"
              data-testid={`${testIdPrefix}-save-btn`}
              onClick={submit}
              disabled={saving}
              className="dz-btn-brand inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
              {saving ? "Saving…" : "Save address"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
