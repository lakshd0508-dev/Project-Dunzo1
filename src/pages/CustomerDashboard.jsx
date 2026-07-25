import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Package, MapPin, ArrowRight, Clock, Activity, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import CreateDispatchDialog from "@/components/CreateDispatchDialog";
import { DASHBOARD_TESTIDS } from "@/constants/testIds";

export default function CustomerDashboard() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/dispatches");
      setDispatches(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const active = dispatches.filter((d) => !["delivered", "cancelled"].includes(d.status));
  const history = dispatches.filter((d) => ["delivered", "cancelled"].includes(d.status));

  const stats = [
    { label: "Total Dispatches", value: dispatches.length, bg: "bg-white", icon: Package },
    { label: "Active", value: active.length, bg: "bg-[#FBBF24]", icon: Activity },
    { label: "Delivered", value: dispatches.filter((d) => d.status === "delivered").length, bg: "bg-[#00E181]", icon: CheckCircle2 },
    { label: "Cancelled", value: dispatches.filter((d) => d.status === "cancelled").length, bg: "bg-[#EF4444] text-white", icon: XCircle },
  ];

  return (
    <div data-testid={DASHBOARD_TESTIDS.customerRoot} className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      <AppHeader
        subtitle="CUSTOMER CONSOLE"
        right={
          <button
            data-testid={DASHBOARD_TESTIDS.createDispatchBtn}
            onClick={() => setShowCreate(true)}
            className="dz-btn-brand inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={3} /> New Dispatch
          </button>
        }
      />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <span className="dz-chip dz-chip-brand mb-4">// Telemetry Grid</span>
          <h1 className="font-display font-black text-4xl lg:text-5xl mt-4">Your errands, at a glance.</h1>
        </div>

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
              <Clock className="w-6 h-6" strokeWidth={2.5} /> Active
            </h2>
            <span className="dz-chip dz-chip-amber">{active.length} IN PROGRESS</span>
          </div>
          {loading ? (
            <div className="dz-card p-8 text-center font-bold text-neutral-500">Loading…</div>
          ) : active.length === 0 ? (
            <EmptyCard onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {active.map((d) => <DispatchCard key={d.dispatch_id} d={d} />)}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black flex items-center gap-2">
              <Package className="w-6 h-6" strokeWidth={2.5} /> History
            </h2>
            <span className="dz-chip">{history.length} COMPLETED</span>
          </div>
          {history.length === 0 ? (
            <div className="dz-card p-8 text-center font-bold text-neutral-500">No history yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {history.map((d) => <DispatchCard key={d.dispatch_id} d={d} />)}
            </div>
          )}
        </section>
      </main>

      {showCreate && <CreateDispatchDialog onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function EmptyCard({ onCreate }) {
  return (
    <div className="dz-card p-10 text-center bg-white">
      <div className="w-14 h-14 border-2 border-black bg-[#00E181] rounded-xl mx-auto flex items-center justify-center mb-4" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>
        <Package className="w-7 h-7" strokeWidth={2.5} />
      </div>
      <h3 className="font-display text-xl font-black mb-2">Nothing in flight</h3>
      <p className="text-sm text-neutral-700 font-medium mb-6">Book your first errand and watch it move on the map.</p>
      <button onClick={onCreate} className="dz-btn-brand inline-flex items-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={3} /> Create Dispatch
      </button>
    </div>
  );
}

const CATEGORY_ACCENT = {
  food: "bg-[#FBBF24]",
  documents: "bg-white",
  package: "bg-[#00E181]",
  medicines: "bg-[#EF4444] text-white",
  groceries: "bg-[#00E181]",
  other: "bg-white",
};

function DispatchCard({ d }) {
  return (
    <Link
      to={`/dispatch/${d.dispatch_id}`}
      data-testid="dispatch-list-item"
      className="dz-card p-5 hover:-translate-y-1 transition-transform block group bg-white"
      style={{ transitionProperty: "transform, box-shadow" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`dz-chip ${CATEGORY_ACCENT[d.item_category] || "bg-white"}`}>{d.item_category}</span>
            <span className="text-xs font-mono font-bold text-neutral-500">#{d.dispatch_id}</span>
          </div>
          <div className="font-display font-black text-lg leading-tight truncate">{d.item_description}</div>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="space-y-2 text-sm font-medium">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#00E181] border-2 border-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">A</div>
          <div className="truncate">{d.pickup?.label || "Pickup"}</div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-[#EF4444] border-2 border-black flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">B</div>
          <div className="truncate">{d.drop?.label || "Drop"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dashed border-black text-xs font-mono font-bold">
        <span className="text-neutral-500">{new Date(d.created_at).toLocaleString()}</span>
        <span className="flex items-center gap-1 group-hover:text-[#00E181]">
          TRACK <ArrowRight className="w-3 h-3" strokeWidth={3} />
        </span>
      </div>
    </Link>
  );
}
