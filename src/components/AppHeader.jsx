import { Link, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import ProjectDunzoLogo from "@/components/ProjectDunzoLogo";
import { DASHBOARD_TESTIDS } from "@/constants/testIds";

const ROLE_LABEL = {
  customer: "Customer",
  concierge: "Delivery Partner",
  admin: "Admin",
};

export default function AppHeader({ subtitle, right }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b-2 border-black">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <ProjectDunzoLogo size={88} />
          {subtitle && (
            <div className="hidden sm:block leading-none">
              <div className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-400 mt-1">{subtitle}</div>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2">
          {right}
          <Link
            to="/profile"
            data-testid={DASHBOARD_TESTIDS.navProfile}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-white bg-white text-black hover:bg-neutral-100 transition-all"
            style={{ boxShadow: "2px 2px 0px rgba(255,255,255,1)" }}
          >
            {user?.picture ? (
              <img src={user.picture} alt="me" className="w-6 h-6 rounded-full border border-black" />
            ) : (
              <UserIcon className="w-4 h-4" strokeWidth={2.5} />
            )}
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-xs font-black">{user?.name}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 mt-0.5">
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </Link>
          <button
            data-testid={DASHBOARD_TESTIDS.navLogout}
            onClick={doLogout}
            className="p-2 rounded-xl border-2 border-white bg-white text-black hover:bg-[#EF4444] hover:text-white transition-all"
            style={{ boxShadow: "2px 2px 0px rgba(255,255,255,1)" }}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
