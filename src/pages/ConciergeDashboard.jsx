import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MapPin, ArrowRight, Radio, Briefcase, Bike, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { DASHBOARD_TESTIDS, DISPATCH_TESTIDS } from "@/constants/testIds";

export default function ConciergeDashboard() {
  const { user } = useAuthStore();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/dispatches");
      setDispatches(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const isMyJob = (d) => {
    return d.concierge_id === user?.user_id || d.concierge_id === user?.email || d.concierge_id === "concierge-1";
  };
  const feed = dispatches.filter((d) => d.status === "pending");
  const mine = dispatches.filter((d) => isMyJob(d) && !["delivered", "cancelled"].includes(d.status));
  const done = dispatches.filter((d) => isMyJob(d) && ["delivered", "cancelled"].includes(d.status));

  const accept = async (id) => {
    try {
      await api.post(`/dispatches/${id}/accept`);
      toast.success("Job accepted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not accept");
    }
  };

  const earnings = done.filter((d) => d.status === "delivered").reduce((a, d) => a + (d.driver_commission || d.delivery_fee || 43), 0);

  const stats = [
    { label: "Active Jobs", value: mine.length, bg: "bg-[#FBBF24]", icon: Briefcase },
    { label: "Pending Feed", value: feed.length, bg: "bg-[#00E181]", icon: Radio },
    { label: "Delivered", value: done.filter((d) => d.status === "delivered").length, bg: "bg-white", icon: Bike },
    { label: "Earnings (est.)", value: `₹${earnings.toFixed(0)}`, bg: "bg-black text-white", icon: IndianRupee },
  ];

  return (
    <div data-testid={DASHBOARD_TESTIDS.conciergeRoot} className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      <AppHeader subtitle="DELIVERY PARTNER CONSOLE" />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="dz-chip dz-chip-brand">// Partner Hub</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-black font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00E181] animate-pulse" /> ONLINE
          </span>
          {user?.vehicle_brand && (
            <span className="dz-chip dz-chip-amber">
              <Bike className="w-3 h-3" /> {user.vehicle_brand} · {user.license_number}
            </span>
          )}
        </div>
        <h1 className="font-display font-black text-4xl lg:text-5xl mb-8">
          Ready to move, <span className="bg-[#FBBF24] px-2 border-2 border-black" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>{user?.name?.split(" ")[0]}</span>.
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              data-testid={DASHBOARD_TESTIDS.statCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`dz-card p-5 ${s.bg}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="dz-overline">{s.label}</span>
                <s.icon className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="font-display text-4xl font-black">{s.value}</div>
            </motion.div>
          ))}
        </div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black flex items-center gap-2">
              <Briefcase className="w-6 h-6" strokeWidth={2.5} /> Your Active Jobs
            </h2>
            <span className="dz-chip dz-chip-amber">{mine.length} ACTIVE</span>
          </div>
          {mine.length === 0 ? (
            <div className="dz-card p-8 text-center font-bold text-neutral-500">No active jobs. Grab one from the broadcast feed below.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {mine.map((d) => <JobCard key={d.dispatch_id} d={d} />)}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black flex items-center gap-2">
              <Radio className="w-6 h-6" strokeWidth={2.5} /> Incoming Broadcast Feed
            </h2>
            <span className="dz-chip dz-chip-brand">{feed.length} AVAILABLE</span>
          </div>
          {loading ? (
            <div className="dz-card p-8 text-center font-bold text-neutral-500">Loading feed…</div>
          ) : feed.length === 0 ? (
            <div className="dz-card p-8 text-center font-bold text-neutral-500">No pending dispatches right now. Check back soon.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {feed.map((d) => <FeedCard key={d.dispatch_id} d={d} onAccept={() => accept(d.dispatch_id)} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function JobCard({ d }) {
  return (
    <Link to={`/dispatch/${d.dispatch_id}`} className="dz-card p-5 block bg-white hover:-translate-y-1 transition-transform">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="dz-chip !border-black uppercase">{d.item_category}</span>
            <span className="text-xs font-mono font-bold text-neutral-500">#{d.dispatch_id}</span>
          </div>
          <div className="font-display font-black text-lg">{d.item_description}</div>
          <div className="text-xs font-bold text-neutral-600 mt-1">Customer: {d.customer_name} · {d.customer_phone}</div>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="space-y-2 text-sm font-medium mt-3">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#00E181] border-2 border-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">A</div>
          <div>{d.pickup?.label}</div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#EF4444] border-2 border-black flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">B</div>
          <div>{d.drop?.label}</div>
        </div>
      </div>
      <div className="flex justify-end mt-3 pt-3 border-t-2 border-dashed border-black text-xs font-black">
        OPEN JOB <ArrowRight className="w-3 h-3 inline ml-1" strokeWidth={3} />
      </div>
    </Link>
  );
}

function FeedCard({ d, onAccept }) {
  return (
    <div className="dz-card p-5 bg-white">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="dz-chip !border-black uppercase">{d.item_category}</span>
            <span className="text-xs font-mono font-bold text-neutral-500">#{d.dispatch_id}</span>
          </div>
          <div className="font-display font-black text-lg">{d.item_description}</div>
        </div>
        {d.estimated_price ? (
          <div className="text-right shrink-0">
            <div className="dz-overline">Payout</div>
            <div className="font-display text-2xl font-black bg-[#00E181] px-2 border-2 border-black inline-block" style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}>
              ₹{d.estimated_price}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 text-sm font-medium">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#00E181] border-2 border-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">A</div>
          <div>{d.pickup?.label}</div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#EF4444] border-2 border-black flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">B</div>
          <div>{d.drop?.label}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dashed border-black">
        <span className="text-xs font-mono font-bold text-neutral-600">{new Date(d.created_at).toLocaleTimeString()}</span>
        <button
          data-testid={DISPATCH_TESTIDS.acceptBtn}
          onClick={onAccept}
          className="dz-btn-brand inline-flex items-center gap-1"
        >
          Accept & Claim <ArrowRight className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
