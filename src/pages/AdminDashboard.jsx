import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Package, TrendingUp, IndianRupee, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { DASHBOARD_TESTIDS } from "@/constants/testIds";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dispatches, setDispatches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, u, d] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/users"),
          api.get("/admin/dispatches"),
        ]);
        setStats(s.data); setUsers(u.data); setDispatches(d.data);
      } catch (e) {}
    })();
  }, []);

  const statCards = stats ? [
    { label: "Total Dispatches", value: stats.total_dispatches, icon: Package, bg: "bg-white" },
    { label: "Users", value: stats.users_total || stats.total_users || 0, icon: Users, bg: "bg-[#FBBF24]" },
    { label: "Delivered", value: stats.by_status?.delivered || 0, icon: TrendingUp, bg: "bg-[#00E181]" },
    { label: "Revenue", value: `₹${(stats.revenue || 0).toFixed(0)}`, icon: IndianRupee, bg: "bg-black text-white" },
  ] : [];

  return (
    <div data-testid={DASHBOARD_TESTIDS.adminRoot} className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      <AppHeader subtitle="ADMIN CONSOLE" />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="dz-chip dz-chip-brand"><ShieldCheck className="w-3 h-3" /> Command Center</span>
        </div>
        <h1 className="font-display font-black text-4xl lg:text-5xl mb-8">Global Ops Overview</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statCards.map((s, i) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
          <div className="lg:col-span-2 dz-card p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <span className="dz-overline">7-Day Dispatch Volume</span>
              <span className="dz-chip dz-chip-brand">LIVE</span>
            </div>
            {stats && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.daily}>
                  <CartesianGrid stroke="#00000010" vertical={false} />
                  <XAxis dataKey="date" stroke="#171717" tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#171717" tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#FFF", border: "2px solid #000", borderRadius: 8, color: "#000", fontWeight: 700, boxShadow: "3px 3px 0 rgba(0,0,0,1)" }}
                    cursor={{ fill: "rgba(0,225,129,0.15)" }}
                  />
                  <Bar dataKey="count" fill="#00E181" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="dz-card p-6 bg-white">
            <span className="dz-overline block mb-4">Status Breakdown</span>
            <div className="space-y-3">
              {stats && Object.entries(stats?.by_status || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b-2 border-dashed border-black/20 pb-2">
                  <StatusBadge status={k} />
                  <span className="font-mono font-black text-lg">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-black grid grid-cols-2 gap-3">
              <div className="bg-[#F5F5F5] p-3 rounded-lg border-2 border-black">
                <div className="text-[10px] font-black uppercase text-neutral-600">Customers</div>
                <div className="font-display font-black text-2xl">{stats?.customers ?? 0}</div>
              </div>
              <div className="bg-[#FBBF24] p-3 rounded-lg border-2 border-black">
                <div className="text-[10px] font-black uppercase">Partners</div>
                <div className="font-display font-black text-2xl">{stats?.concierges ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="font-display text-2xl font-black mb-4">All Dispatches</h2>
          <div className="dz-card overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead className="text-left border-b-2 border-black bg-black text-white font-mono text-xs uppercase">
                <tr>
                  <th className="p-4 font-black">ID</th>
                  <th className="p-4 font-black">Item</th>
                  <th className="p-4 font-black">Customer</th>
                  <th className="p-4 font-black">Partner</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black">Created</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d, i) => (
                  <tr key={d.dispatch_id} className={`border-b border-black/10 hover:bg-[#00E181]/10 ${i % 2 ? "bg-[#F5F5F5]/50" : ""}`}>
                    <td className="p-4 font-mono text-xs font-bold">{d.dispatch_id}</td>
                    <td className="p-4 font-bold">{d.item_description}</td>
                    <td className="p-4 font-medium">{d.customer_name}</td>
                    <td className="p-4 font-medium">{d.concierge_name || <span className="text-neutral-400">—</span>}</td>
                    <td className="p-4"><StatusBadge status={d.status} /></td>
                    <td className="p-4 font-mono text-xs text-neutral-600">{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {dispatches.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center font-bold text-neutral-500">No dispatches yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-black mb-4">Users</h2>
          <div className="dz-card overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead className="text-left border-b-2 border-black bg-black text-white font-mono text-xs uppercase">
                <tr>
                  <th className="p-4 font-black">Name</th>
                  <th className="p-4 font-black">Email</th>
                  <th className="p-4 font-black">Role</th>
                  <th className="p-4 font-black">Phone</th>
                  <th className="p-4 font-black">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.user_id} className={`border-b border-black/10 hover:bg-[#00E181]/10 ${i % 2 ? "bg-[#F5F5F5]/50" : ""}`}>
                    <td className="p-4 flex items-center gap-2">
                      {u.picture && <img src={u.picture} alt="" className="w-7 h-7 rounded-full border-2 border-black" />}
                      <span className="font-bold">{u.name}</span>
                    </td>
                    <td className="p-4 text-neutral-600 font-medium">{u.email}</td>
                    <td className="p-4">
                      <span className={`dz-chip ${u.role === "admin" ? "dz-chip-dark" : u.role === "concierge" ? "dz-chip-amber" : u.role === "customer" ? "dz-chip-brand" : ""}`}>
                        {u.role || "unassigned"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold">{u.phone || "—"}</td>
                    <td className="p-4 font-mono text-xs text-neutral-600">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center font-bold text-neutral-500">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
