import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Package, ShoppingCart, HeartHandshake, Sparkles, MapPin, Plus, Minus, IndianRupee, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import SavedAddressSelect from "@/components/SavedAddressSelect";
import { GROCERY_MEDICINE_CATALOG, SMALL_BRANDS, SUPPORTED_CITIES, CONCIERGE_SPECIALTIES } from "@/data/catalog";
import { DISPATCH_TESTIDS } from "@/constants/testIds";

const SERVICES = [
  { id: "parcel", label: "Parcel Send", icon: Package, color: "bg-white", desc: "Pickup A → Drop B. Documents, keys, anything." },
  { id: "grocery_medicine", label: "Grocery & Medicine", icon: ShoppingCart, color: "bg-[#00E181]", desc: "Order from our catalog — auto-delivered to you." },
  { id: "small_brands", label: "Local Small Brands", icon: Sparkles, color: "bg-[#FBBF24]", desc: "Curated Bangalore & Chennai startups." },
  { id: "concierge", label: "Concierge", icon: HeartHandshake, color: "bg-[#EF4444] text-white", desc: "On-demand assistant at your location." },
];

export default function CreateDispatchDialog({ onClose, onCreated }) {
  const { user } = useAuthStore();
  const [service, setService] = useState(null);
  const [dropAddr, setDropAddr] = useState(null); // GeoPoint {lat,lng,label,address}
  const [pickupAddr, setPickupAddr] = useState(null);
  const [conciergeAddr, setConciergeAddr] = useState(null);
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [notes, setNotes] = useState("");
  const [itemDesc, setItemDesc] = useState("");

  // grocery/medicine
  const [category, setCategory] = useState("Grocery");
  const [cart, setCart] = useState({});

  // small brands
  const [brandCity, setBrandCity] = useState(user?.city && SUPPORTED_CITIES.includes(user?.city) ? user.city : "Bangalore");
  const [selectedBrand, setSelectedBrand] = useState(null);

  // concierge
  const [conciergeSpec, setConciergeSpec] = useState(CONCIERGE_SPECIALTIES[0].id);
  const [conciergeHours, setConciergeHours] = useState(2);

  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const items = useMemo(() => {
    if (service === "grocery_medicine") {
      return Object.entries(cart).map(([id, qty]) => {
        const p = GROCERY_MEDICINE_CATALOG.find((x) => x.id === id);
        return p ? { name: p.name, price: p.price, qty } : null;
      }).filter(Boolean);
    }
    if (service === "small_brands" && selectedBrand) {
      return Object.entries(cart).map(([id, qty]) => {
        const brand = SMALL_BRANDS[brandCity].find((b) => b.id === selectedBrand);
        const p = brand?.featured.find((x) => x.id === id);
        return p ? { name: `${brand.name} — ${p.name}`, price: p.price, qty } : null;
      }).filter(Boolean);
    }
    return [];
  }, [cart, service, brandCity, selectedBrand]);

  // Derive store pickup point (for grocery/small_brands) as a nearby offset from drop
  function getStorePickup() {
    if (!dropAddr) return null;
    if (service === "grocery_medicine") return { lat: dropAddr.lat + 0.008, lng: dropAddr.lng + 0.005, label: "Nearby Dark Store" };
    if (service === "small_brands" && selectedBrand) {
      const brand = SMALL_BRANDS[brandCity].find((b) => b.id === selectedBrand);
      return { lat: dropAddr.lat + 0.005, lng: dropAddr.lng + 0.007, label: `${brand?.name} · ${brand?.area}` };
    }
    return null;
  }

  useEffect(() => {
    if (!service) return;
    let pickup, drop;
    if (service === "concierge") { pickup = conciergeAddr; drop = conciergeAddr; }
    else if (service === "parcel") { pickup = pickupAddr; drop = dropAddr; }
    else { pickup = getStorePickup(); drop = dropAddr; }
    if (!pickup || !drop) { setQuote(null); return; }
    const payload = {
      service_type: service,
      item_description: itemDesc || (items.length ? `${items.length} item(s)` : "Errand"),
      pickup: service === "concierge" ? undefined : { lat: pickup.lat, lng: pickup.lng, label: pickup.label },
      drop: { lat: drop.lat, lng: drop.lng, label: drop.label },
      customer_phone: customerPhone,
      items: items.length ? items : null,
      concierge_hours: service === "concierge" ? conciergeHours : null,
      concierge_specialty: service === "concierge" ? conciergeSpec : null,
    };
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post("/quote", payload);
        if (!cancelled) setQuote(data);
      } catch (e) {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [service, pickupAddr, dropAddr, conciergeAddr, JSON.stringify(items), conciergeHours, conciergeSpec, selectedBrand]);

  const changeQty = (id, delta) => {
    setCart((c) => {
      const next = { ...c };
      const cur = next[id] || 0;
      const val = Math.max(0, cur + delta);
      if (val === 0) delete next[id]; else next[id] = val;
      return next;
    });
  };

  const submit = async () => {
    if (!customerPhone) return toast.error("Contact phone required");
    if (!service) return toast.error("Choose a service");
    if (service === "parcel" && (!pickupAddr || !dropAddr)) return toast.error("Pickup and drop required");
    if (service === "parcel" && !itemDesc.trim()) return toast.error("Describe what you're sending");
    if (service === "concierge" && !conciergeAddr) return toast.error("Service location required");
    if ((service === "grocery_medicine" || service === "small_brands") && items.length === 0) return toast.error("Add at least 1 item");
    if ((service === "grocery_medicine" || service === "small_brands") && !dropAddr) return toast.error("Delivery address required");
    if (service === "small_brands" && !selectedBrand) return toast.error("Choose a brand");

    if (service === "parcel" && pickupAddr && dropAddr) {
      const pId = pickupAddr.address?.address_id || pickupAddr.address?.id;
      const dId = dropAddr.address?.address_id || dropAddr.address?.id;
      const pText = (pickupAddr.label || pickupAddr.address?.searchAddress || "").toString().trim().toLowerCase();
      const dText = (dropAddr.label || dropAddr.address?.searchAddress || "").toString().trim().toLowerCase();

      const sameCoords = (typeof pickupAddr.lat === "number" && pickupAddr.lat === dropAddr.lat) && (typeof pickupAddr.lng === "number" && pickupAddr.lng === dropAddr.lng);
      const sameId = pId && dId && pId === dId;
      const sameText = pText && dText && pText === dText;

      if (sameCoords || sameId || sameText) {
        return toast.error("Pickup and drop locations cannot be identical. Please choose different locations.");
      }
    }

    setSubmitting(true);
    try {
      const pickup = service === "concierge" ? undefined : service === "parcel" ? pickupAddr : getStorePickup();
      const drop = service === "concierge" ? conciergeAddr : dropAddr;
      const payload = {
        service_type: service,
        item_description: itemDesc || (service === "concierge"
          ? CONCIERGE_SPECIALTIES.find((x) => x.id === conciergeSpec)?.label
          : items.map((i) => i.name).join(", ").slice(0, 120) || "Errand"),
        pickup: pickup ? { lat: pickup.lat, lng: pickup.lng, label: pickup.label } : undefined,
        drop: { lat: drop.lat, lng: drop.lng, label: drop.label },
        customer_phone: customerPhone,
        notes,
        items: items.length ? items : null,
        concierge_hours: service === "concierge" ? conciergeHours : null,
        concierge_specialty: service === "concierge" ? conciergeSpec : null,
      };
      const { data } = await api.post("/dispatches", payload);
      toast.success("Dispatch broadcasting");
      onCreated?.(data);
      onClose?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white border-2 border-black rounded-xl p-6 md:p-8 max-h-[92vh] overflow-y-auto dz-scrollbar" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,1)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg border-2 border-black bg-white hover:bg-[#EF4444] hover:text-white" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <span className="dz-chip dz-chip-brand mb-3">// New Dispatch</span>
        <h2 className="font-display text-3xl font-black mt-2 mb-2">
          {service ? SERVICES.find((s) => s.id === service)?.label : "Choose a service"}
        </h2>

        {!service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setService(s.id)}
                data-testid={`svc-${s.id}-btn`}
                className={`text-left p-5 rounded-xl border-2 border-black transition-all ${s.color} hover:-translate-y-1`}
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}
              >
                <s.icon className="w-6 h-6 mb-3" strokeWidth={2.5} />
                <div className="font-display font-black text-lg">{s.label}</div>
                <div className="text-xs font-medium mt-1">{s.desc}</div>
              </button>
            ))}
          </div>
        )}

        {service && (
          <>
            <button onClick={() => { setService(null); setCart({}); setSelectedBrand(null); }} className="text-xs font-black uppercase tracking-widest text-neutral-600 hover:text-black mb-4">
              ← Change service
            </button>

            <div className="mb-4">
              <label className="dz-overline block mb-2">Contact Phone *</label>
              <input
                data-testid={DISPATCH_TESTIDS.customerPhoneInput}
                className="dz-input font-mono"
                placeholder="+91 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* PARCEL */}
            {service === "parcel" && (
              <>
                <div className="mb-4">
                  <label className="dz-overline block mb-2">What are you sending? *</label>
                  <input
                    data-testid={DISPATCH_TESTIDS.itemDescInput}
                    className="dz-input"
                    placeholder="e.g. Documents, laptop charger, keys"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="dz-overline block mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00E181] border-2 border-black" /> Pickup Location *
                  </label>
                  <SavedAddressSelect value={pickupAddr} onChange={setPickupAddr} testIdPrefix="parcel-pickup" />
                </div>
                <div className="mb-4">
                  <label className="dz-overline block mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444] border-2 border-black" /> Drop Location *
                  </label>
                  <SavedAddressSelect value={dropAddr} onChange={setDropAddr} testIdPrefix="parcel-drop" />
                </div>
              </>
            )}

            {/* CONCIERGE */}
            {service === "concierge" && (
              <>
                <div className="mb-4">
                  <label className="dz-overline block mb-2">Concierge Specialty *</label>
                  <select className="dz-input" value={conciergeSpec} onChange={(e) => setConciergeSpec(e.target.value)}>
                    {CONCIERGE_SPECIALTIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="dz-overline block mb-2">Booking Duration</label>
                  <div className="flex gap-2">
                    {[1, 2, 4, 8].map((h) => (
                      <button key={h} type="button" onClick={() => setConciergeHours(h)}
                        className={`flex-1 py-2 rounded-lg border-2 border-black text-xs font-black uppercase ${conciergeHours === h ? "bg-[#00E181]" : "bg-white"}`}
                        style={{ boxShadow: conciergeHours === h ? "3px 3px 0px rgba(0,0,0,1)" : "1px 1px 0px rgba(0,0,0,1)" }}>
                        {h} hr{h > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="dz-overline block mb-2">Service Location *</label>
                  <SavedAddressSelect value={conciergeAddr} onChange={setConciergeAddr} testIdPrefix="conc-loc" />
                </div>
              </>
            )}

            {/* GROCERY & MEDICINE */}
            {service === "grocery_medicine" && (
              <>
                <div className="flex gap-2 mb-4">
                  {["Grocery", "Medicine"].map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={`flex-1 py-2.5 rounded-lg border-2 border-black text-sm font-black uppercase ${category === c ? "bg-[#00E181]" : "bg-white"}`}
                      style={{ boxShadow: category === c ? "3px 3px 0px rgba(0,0,0,1)" : "1px 1px 0px rgba(0,0,0,1)" }}>
                      {c === "Grocery" ? <ShoppingCart className="w-4 h-4 inline mr-1" /> : <Package className="w-4 h-4 inline mr-1" />}
                      {c}
                    </button>
                  ))}
                </div>
                <div className="border-2 border-black rounded-xl bg-[#F5F5F5] p-3 max-h-72 overflow-y-auto dz-scrollbar space-y-2 mb-4">
                  {GROCERY_MEDICINE_CATALOG.filter((p) => p.category === category).map((p) => {
                    const qty = cart[p.id] || 0;
                    return (
                      <div key={p.id} data-testid="catalog-item" className="flex items-center gap-3 p-3 bg-white border-2 border-black rounded-lg" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="dz-chip !py-0 !text-[9px]">{p.tag}</span>
                            <span className="font-mono font-black text-sm">₹{p.price}</span>
                          </div>
                        </div>
                        {qty === 0 ? (
                          <button onClick={() => changeQty(p.id, 1)} data-testid="catalog-add-btn" className="dz-btn-brand !text-xs !py-1.5 !px-3">Add</button>
                        ) : (
                          <div className="flex items-center gap-1 border-2 border-black rounded-lg overflow-hidden" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                            <button onClick={() => changeQty(p.id, -1)} className="p-1.5 bg-white hover:bg-neutral-100"><Minus className="w-3 h-3" strokeWidth={3} /></button>
                            <span className="px-2 font-mono font-black text-sm min-w-[24px] text-center">{qty}</span>
                            <button onClick={() => changeQty(p.id, 1)} className="p-1.5 bg-[#00E181] hover:bg-[#00C570]"><Plus className="w-3 h-3" strokeWidth={3} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mb-4">
                  <label className="dz-overline block mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Deliver to *</label>
                  <SavedAddressSelect value={dropAddr} onChange={setDropAddr} testIdPrefix="gm-drop" />
                </div>
              </>
            )}

            {/* SMALL BRANDS */}
            {service === "small_brands" && (
              <>
                <div className="flex gap-2 mb-4">
                  {SUPPORTED_CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => { setBrandCity(c); setSelectedBrand(null); setCart({}); }}
                      className={`flex-1 py-2 rounded-lg border-2 border-black text-xs font-black uppercase ${brandCity === c ? "bg-[#FBBF24]" : "bg-white"}`}
                      style={{ boxShadow: brandCity === c ? "3px 3px 0px rgba(0,0,0,1)" : "1px 1px 0px rgba(0,0,0,1)" }}>
                      {c}
                    </button>
                  ))}
                </div>
                {!selectedBrand ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {SMALL_BRANDS[brandCity].map((b) => (
                      <button key={b.id} onClick={() => setSelectedBrand(b.id)} data-testid="brand-item"
                        className="text-left p-4 border-2 border-black rounded-xl bg-white hover:bg-neutral-50 transition-all"
                        style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                        <div className="font-display font-black text-base">{b.name}</div>
                        <div className="text-xs font-medium text-neutral-600 mt-0.5">{b.cuisine} · {b.area}</div>
                        <div className="text-[11px] font-black text-neutral-500 mt-2">{b.featured.length} items available →</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setSelectedBrand(null); setCart({}); }} className="text-xs font-black uppercase tracking-widest text-neutral-600 hover:text-black mb-3">← Change brand</button>
                    <div className="dz-card-sm p-4 mb-4 bg-[#FBBF24]/30">
                      <div className="font-display font-black text-lg">{SMALL_BRANDS[brandCity].find((b) => b.id === selectedBrand)?.name}</div>
                      <div className="text-xs font-medium text-neutral-700">{SMALL_BRANDS[brandCity].find((b) => b.id === selectedBrand)?.area}</div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {SMALL_BRANDS[brandCity].find((b) => b.id === selectedBrand)?.featured.map((p) => {
                        const qty = cart[p.id] || 0;
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-white border-2 border-black rounded-lg" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                            <div className="flex-1"><div className="font-bold text-sm">{p.name}</div><div className="font-mono font-black text-sm mt-1">₹{p.price}</div></div>
                            {qty === 0 ? (
                              <button onClick={() => changeQty(p.id, 1)} className="dz-btn-brand !text-xs !py-1.5 !px-3">Add</button>
                            ) : (
                              <div className="flex items-center gap-1 border-2 border-black rounded-lg overflow-hidden">
                                <button onClick={() => changeQty(p.id, -1)} className="p-1.5 bg-white"><Minus className="w-3 h-3" strokeWidth={3} /></button>
                                <span className="px-2 font-mono font-black text-sm min-w-[24px] text-center">{qty}</span>
                                <button onClick={() => changeQty(p.id, 1)} className="p-1.5 bg-[#00E181]"><Plus className="w-3 h-3" strokeWidth={3} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="mb-4">
                  <label className="dz-overline block mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Deliver to *</label>
                  <SavedAddressSelect value={dropAddr} onChange={setDropAddr} testIdPrefix="sb-drop" />
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="dz-overline block mb-2">Notes for partner</label>
              <textarea className="dz-input min-h-[60px]" placeholder="Building, gate code, instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {quote && (
              <div className="dz-card-sm p-4 mb-4 bg-[#00E181]/20">
                <div className="dz-overline mb-2">Auto-priced quote & Live Distance</div>
                <div className="grid grid-cols-2 gap-3 text-sm font-medium">
                  {quote.items_total > 0 && (
                    <>
                      <div>Items total</div>
                      <div className="text-right font-mono font-black">₹{quote.items_total}</div>
                    </>
                  )}
                  <div>Distance</div>
                  <div className="text-right font-mono font-black">{quote.distance_km} km</div>
                  <div>Delivery Fee</div>
                  <div className="text-right font-mono font-black">₹{quote.delivery_fee}</div>
                  <div className="col-span-2 border-t-2 border-dashed border-black mt-1 pt-2 flex items-center justify-between">
                    <span className="font-black uppercase">Total Amount</span>
                    <span className="font-display text-2xl font-black inline-flex items-center">
                      <IndianRupee className="w-5 h-5" strokeWidth={3} />{quote.total_amount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-dashed border-black">
              <button onClick={onClose} className="dz-btn-ghost">Cancel</button>
              <button
                data-testid={DISPATCH_TESTIDS.submitBtn}
                onClick={submit}
                disabled={submitting}
                className="dz-btn-brand inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Booking…" : "Broadcast Dispatch"} <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
