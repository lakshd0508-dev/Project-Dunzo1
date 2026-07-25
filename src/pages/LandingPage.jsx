import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Package, Zap, Bike, ShieldCheck, LineChart, ShoppingCart, Lock, Mail, X } from "lucide-react";
import ProjectDunzoLogo from "@/components/ProjectDunzoLogo";
import { AUTH_TESTIDS } from "@/constants/testIds";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function LandingPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, loginAsAdmin } = useAuthStore();
  const [loadingRole, setLoadingRole] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const handleGoogleLogin = async (role = "customer") => {
    setLoadingRole(role);
    try {
      const user = await loginWithGoogle(role);
      if (!user) return;
      toast.success(`Signed in with Google as ${user.name}`);
      if (role === "admin") navigate("/admin");
      else if (role === "concierge") navigate("/concierge");
      else navigate("/customer");
    } catch (e) {
      console.error(e);
      toast.error("Google sign in failed. Please try again.");
    } finally {
      setLoadingRole(null);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const user = await loginAsAdmin(adminEmail, adminPassword);
      toast.success("Admin signed in successfully");
      setShowAdminModal(false);
      navigate("/admin");
    } catch (e) {
      toast.error("Invalid admin email or password. Use admin@projectdunzo.co / ProjectDunzo.Mesa");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-black text-white border-b-2 border-black">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <ProjectDunzoLogo size={96} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGoogleLogin("customer")}
              disabled={loadingRole !== null}
              className="dz-btn-brand inline-flex items-center gap-2 !text-xs sm:!text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign in with Google
            </button>
            <button
              onClick={() => setShowAdminModal(true)}
              className="dz-btn-dark inline-flex items-center gap-2 !text-xs sm:!text-sm"
            >
              <Lock className="w-3.5 h-3.5" /> Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section data-testid={AUTH_TESTIDS.landingHero} className="relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-16 pb-24 lg:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 dz-chip mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#00E181] animate-pulse" />
                  <span>India&apos;s Neo Errand Network · Google Authenticated</span>
                </div>
                <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.9] mb-6">
                  Move it. <br />
                  Track it. <br />
                  <span className="bg-[#00E181] px-3 border-2 border-black inline-block" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,1)" }}>
                    DUNZO IT.
                  </span>
                </h1>
                <p className="text-lg text-neutral-700 max-w-xl mb-8 font-medium leading-relaxed">
                  A neo-brutalist errand console for on-demand groceries, courier, boutique and concierge dispatches — secured with Google Sign-In and robust role-based portals.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    data-testid={AUTH_TESTIDS.landingCtaBtn}
                    onClick={() => handleGoogleLogin("customer")}
                    disabled={loadingRole !== null}
                    className="dz-btn-brand inline-flex items-center gap-2 !text-sm !py-3 !px-6"
                  >
                    {loadingRole === "customer" ? "Connecting..." : "Launch Customer App"} <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => handleGoogleLogin("concierge")}
                    disabled={loadingRole !== null}
                    className="dz-btn-amber inline-flex items-center gap-2 !text-sm !py-3 !px-6"
                  >
                    {loadingRole === "concierge" ? "Connecting..." : "Delivery Partner Portal"} <Bike className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="dz-btn-dark inline-flex items-center gap-2 !text-sm !py-3 !px-6"
                  >
                    Admin Portal <Lock className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-2">
                  <span className="dz-chip dz-chip-brand">Google OAuth 2.0</span>
                  <span className="dz-chip dz-chip-amber">Live Map Tracking</span>
                  <span className="dz-chip dz-chip-dark">Secure Admin Creds</span>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="dz-card p-6 relative rotate-[1.5deg]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="dz-chip dz-chip-brand">Order · ER-847</span>
                    <span className="text-xs font-mono">14:32:11</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#00E181] border-2 border-black flex items-center justify-center text-xs font-black">A</div>
                      <div>
                        <div className="text-[10px] uppercase font-black text-neutral-500">Pickup</div>
                        <div className="font-bold text-sm">Zepto Superfast · Indiranagar</div>
                      </div>
                    </div>
                    <div className="ml-3 border-l-2 border-dashed border-black h-6" />
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#EF4444] border-2 border-black flex items-center justify-center text-xs font-black text-white">B</div>
                      <div>
                        <div className="text-[10px] uppercase font-black text-neutral-500">Drop</div>
                        <div className="font-bold text-sm">Koramangala 4th Block</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-black pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-black text-neutral-500">Est. Payout</div>
                      <div className="font-display text-2xl font-black">₹180</div>
                    </div>
                    <button className="dz-btn-brand !py-2 !text-xs">Active</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="dz-card bg-white max-w-md w-full p-6 shadow-2xl relative"
          >
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-black text-[#00E181] flex items-center justify-center font-black">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl">Admin Authentication</h3>
                <p className="text-xs text-neutral-500">Secure credential login for system operators</p>
              </div>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-neutral-600 mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-black rounded-lg font-mono text-sm focus:outline-none focus:bg-neutral-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-neutral-600 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-black rounded-lg font-mono text-sm focus:outline-none focus:bg-neutral-50"
                    placeholder="ProjectDunzo.Mesa"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Default demo credentials: admin@projectdunzo.co / ProjectDunzo.Mesa</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="dz-btn-ghost !text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="dz-btn-dark !text-xs !py-2.5 inline-flex items-center gap-2"
                >
                  {adminLoading ? "Authenticating..." : "Sign In to Admin Panel"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
