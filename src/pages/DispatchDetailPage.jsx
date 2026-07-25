import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone, User as UserIcon, Package, XCircle, IndianRupee, Truck, Navigation2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import ChatPanel from "@/components/ChatPanel";
import { DISPATCH_TESTIDS } from "@/constants/testIds";

const NEXT_STATUS = { accepted: "picked_up", picked_up: "in_transit", in_transit: "delivered" };
const NEXT_LABEL = { accepted: "Mark Picked Up", picked_up: "Start Transit", in_transit: "Mark Delivered" };

// Google Maps embed iframe — no API key required for `q` variant.
// Live-updates via key change on courier location.
function LiveTrackingMap({ pickup, drop, courier }) {
  // Prefer courier location as focus, else fall back to pickup/drop midpoint
  const focus = courier || pickup || drop;
  if (!focus) return null;
  const src = `https://www.google.com/maps?q=${focus.lat},${focus.lng}&hl=en&z=16&output=embed`;
  return (
    <div data-testid={DISPATCH_TESTIDS.trackMap} className="dz-card overflow-hidden bg-white">
      <div className="p-3 border-b-2 border-black flex items-center justify-between bg-[#00E181]">
        <div className="flex items-center gap-2">
          <Navigation2 className="w-4 h-4" strokeWidth={2.5} />
          <span className="dz-overline">Live Tracking · Google Maps</span>
        </div>
        <span className="text-[10px] font-mono font-black flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> STREAMING
        </span>
      </div>
      <iframe
        key={`${focus.lat.toFixed(5)}-${focus.lng.toFixed(5)}`}
        title="Live tracking"
        src={src}
        width="100%"
        height="400"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, display: "block" }}
      />
      <div className="grid grid-cols-3 border-t-2 border-black">
        {pickup && (
          <div className="p-3 border-r-2 border-black">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00E181] border border-black" /> Pickup
            </div>
            <div className="text-xs font-bold truncate mt-1">{pickup.label || "—"}</div>
          </div>
        )}
        <div className="p-3 border-r-2 border-black">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] border border-black" /> Drop
          </div>
          <div className="text-xs font-bold truncate mt-1">{drop?.label || "—"}</div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FBBF24] border border-black" /> Rider
          </div>
          <div className="text-xs font-bold truncate mt-1">
            {courier ? `${courier.lat.toFixed(4)}, ${courier.lng.toFixed(4)}` : "Not moving yet"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DispatchDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/dispatches/${id}`);
      setD(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Not found");
      navigate(-1);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);  // 5s refresh for live tracking
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [id]);

  const isCustomer = user?.role === "customer" && d?.customer_id === user?.user_id;
  const isConcierge = user?.role === "concierge" && d?.concierge_id === user?.user_id;
  const canChat = isCustomer || isConcierge || user?.role === "admin";

  const advanceStatus = async () => {
    const next = NEXT_STATUS[d.status];
    if (!next) return;
    try {
      const { data } = await api.patch(`/dispatches/${d.dispatch_id}/status`, { status: next });
      setD(data);
      toast.success(`Marked ${next.replace("_", " ")}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const acceptJob = async () => {
    try {
      const { data } = await api.post(`/dispatches/${d.dispatch_id}/accept`);
      setD(data);
      toast.success("Job accepted");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this dispatch?")) return;
    try {
      const { data } = await api.patch(`/dispatches/${d.dispatch_id}/status`, { status: "cancelled" });
      setD(data);
      toast.success("Cancelled");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { data } = await api.patch(`/dispatches/${d.dispatch_id}/location`, {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
        });
        setD(data);
        toast.success("Location shared");
      } catch (e) { toast.error("Failed"); }
    }, () => toast.error("Permission denied"));
  };

  const simulate = async () => {
    if (!d?.pickup || !d?.drop) return;
    const t = Math.random() * 0.8 + 0.1;
    const lat = d.pickup.lat + (d.drop.lat - d.pickup.lat) * t;
    const lng = d.pickup.lng + (d.drop.lng - d.pickup.lng) * t;
    try {
      const { data } = await api.patch(`/dispatches/${d.dispatch_id}/location`, { lat, lng });
      setD(data);
    } catch (e) { toast.error("Failed"); }
  };

  if (loading || !d) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <AppHeader subtitle="DISPATCH DETAIL" />
        <div className="p-10 text-center font-black text-neutral-500">Loading dispatch…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      <AppHeader subtitle="DISPATCH DETAIL" />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-neutral-700 hover:text-black transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" strokeWidth={3} /> BACK TO DASHBOARD
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="dz-chip">#{d.dispatch_id}</span>
              <span className="dz-chip !border-black uppercase">{d.service_type.replace("_", " ")}</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-black">{d.item_description}</h1>
            <div className="text-sm text-neutral-700 font-medium mt-2">Created {new Date(d.created_at).toLocaleString()}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={d.status} />
            {isConcierge && d.status === "pending" && <button onClick={acceptJob} className="dz-btn-brand">Accept Job</button>}
            {isConcierge && NEXT_STATUS[d.status] && (
              <button data-testid={DISPATCH_TESTIDS.statusUpdateBtn} onClick={advanceStatus} className="dz-btn-brand">
                {NEXT_LABEL[d.status]}
              </button>
            )}
            {(isCustomer && ["pending", "accepted"].includes(d.status)) && (
              <button data-testid={DISPATCH_TESTIDS.cancelBtn} onClick={cancel} className="dz-btn-ghost inline-flex items-center gap-2 hover:!bg-[#EF4444] hover:!text-white">
                <XCircle className="w-4 h-4" strokeWidth={2.5} /> Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveTrackingMap pickup={d.pickup} drop={d.drop} courier={d.courier_location} />

            {/* Call buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isCustomer && d.concierge_phone && (
                <a href={`tel:${d.concierge_phone}`} data-testid="call-rider-btn" className="dz-card p-4 bg-[#00E181] flex items-center gap-3 hover:-translate-y-1 transition-transform">
                  <div className="w-11 h-11 rounded-xl bg-white border-2 border-black flex items-center justify-center" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                    <Phone className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="dz-overline">Call Delivery Partner</div>
                    <div className="font-display font-black text-lg">{d.concierge_name}</div>
                    <div className="font-mono text-xs font-bold">{d.concierge_phone}</div>
                  </div>
                </a>
              )}
              {isConcierge && d.customer_phone && (
                <a href={`tel:${d.customer_phone}`} data-testid="call-customer-btn" className="dz-card p-4 bg-[#FBBF24] flex items-center gap-3 hover:-translate-y-1 transition-transform">
                  <div className="w-11 h-11 rounded-xl bg-white border-2 border-black flex items-center justify-center" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                    <Phone className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="dz-overline">Call Customer</div>
                    <div className="font-display font-black text-lg">{d.customer_name}</div>
                    <div className="font-mono text-xs font-bold">{d.customer_phone}</div>
                  </div>
                </a>
              )}
              {isConcierge && ["accepted", "picked_up", "in_transit"].includes(d.status) && (
                <div className="dz-card p-4 bg-white flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FBBF24] border-2 border-black flex items-center justify-center" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                    <Truck className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="dz-overline mb-1">Share Position</div>
                    <div className="flex gap-2">
                      <button onClick={shareLocation} className="dz-btn-brand !text-[10px] !py-1.5">Live GPS</button>
                      <button onClick={simulate} className="dz-btn-ghost !text-[10px] !py-1.5">Simulate</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order items */}
            {d.items && d.items.length > 0 && (
              <div className="dz-card p-5 bg-white">
                <div className="dz-overline mb-3">Order Items</div>
                <div className="space-y-2">
                  {d.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-dashed border-black/20 last:border-b-0">
                      <div className="text-sm font-bold">{it.name} <span className="font-mono text-xs text-neutral-500">× {it.qty}</span></div>
                      <div className="font-mono font-black text-sm">₹{(it.price * it.qty).toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parties + pricing */}
            <div className="dz-card p-5 bg-white">
              <div className="dz-overline mb-3">Parties</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border-2 border-black rounded-lg bg-[#F5F5F5]">
                  <div className="text-[10px] font-black uppercase text-neutral-600 mb-1">Customer</div>
                  <div className="flex items-center gap-2 font-black"><UserIcon className="w-4 h-4" strokeWidth={2.5} /> {d.customer_name}</div>
                  <div className="text-sm font-mono font-bold text-neutral-700 mt-1">{d.customer_phone}</div>
                </div>
                <div className="p-4 border-2 border-black rounded-lg bg-[#00E181]/20">
                  <div className="text-[10px] font-black uppercase text-neutral-600 mb-1">Delivery Partner</div>
                  {d.concierge_name ? (
                    <div className="flex items-center gap-3 mt-2">
                      <img
                        src={d.concierge_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt={d.concierge_name}
                        className="w-12 h-12 rounded-full border-2 border-black object-cover"
                        style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}
                      />
                      <div>
                        <div className="font-black text-base">{d.concierge_name}</div>
                        <div className="text-xs font-mono font-bold text-neutral-700">{d.concierge_phone}</div>
                        <div className="text-[11px] font-black text-emerald-800 mt-0.5">Commission: ₹{d.driver_commission || Math.round((d.delivery_fee || 90) * 0.75)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-neutral-600 mt-1">Awaiting rider assignment…</div>
                  )}
                </div>
              </div>
              {d.notes && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-black">
                  <div className="text-[10px] font-black uppercase text-neutral-600 mb-1">Notes</div>
                  <div className="text-sm font-medium">{d.notes}</div>
                </div>
              )}
              {(() => {
                const showDriverCut = user?.role === "concierge" || user?.role === "admin";
                const showItemsTotal = d?.items_total > 0;
                let gridClass = "grid-cols-3";
                if (showDriverCut && showItemsTotal) gridClass = "grid-cols-4";
                else if (showDriverCut || showItemsTotal) gridClass = "grid-cols-3";
                else gridClass = "grid-cols-2";

                return (
                  <div className={`mt-4 pt-4 border-t-2 border-dashed border-black grid ${gridClass} gap-3 text-sm`}>
                    {showItemsTotal && (
                      <div><div className="dz-overline mb-1">Items Total</div><div className="font-mono font-black">₹{d.items_total}</div></div>
                    )}
                    <div><div className="dz-overline mb-1">Distance</div><div className="font-mono font-black">{d.distance_km} km</div></div>
                    <div><div className="dz-overline mb-1">Fee</div><div className="font-mono font-black">₹{d.delivery_fee}</div></div>
                    {showDriverCut && (
                      <div><div className="dz-overline mb-1">Driver Cut</div><div className="font-mono font-black text-emerald-700">₹{d.driver_commission || Math.round((d.delivery_fee || 90) * 0.75)}</div></div>
                    )}
                    <div>
                      <div className="dz-overline mb-1">Total</div>
                      <div className="font-display font-black text-lg bg-[#00E181] px-2 border-2 border-black inline-flex items-center" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                        <IndianRupee className="w-4 h-4" strokeWidth={3} />{d.total_amount}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            {canChat ? (
              <ChatPanel dispatchId={d.dispatch_id} currentUserId={user?.user_id} height={620} />
            ) : (
              <div className="dz-card p-6 text-center bg-white">
                <div className="w-12 h-12 border-2 border-black bg-[#FBBF24] rounded-xl mx-auto flex items-center justify-center mb-3" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
                  <Package className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold text-neutral-700">Chat unlocks once a delivery partner accepts.</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
