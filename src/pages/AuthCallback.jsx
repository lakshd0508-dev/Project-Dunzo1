import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import ProjectDunzoLogo from "@/components/ProjectDunzoLogo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        if (data.session_token) {
          localStorage.setItem("dz_token", data.session_token);
        }
        setUser(data.user);
        window.history.replaceState(null, "", window.location.pathname);
        if (!data.user.role) {
          navigate("/onboarding", { replace: true, state: { user: data.user } });
        } else if (data.user.role === "admin") {
          navigate("/admin", { replace: true, state: { user: data.user } });
        } else if (data.user.role === "concierge") {
          navigate("/concierge", { replace: true, state: { user: data.user } });
        } else {
          navigate("/customer", { replace: true, state: { user: data.user } });
        }
      } catch (e) {
        toast.error("Sign-in failed. Please try again.");
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <div className="dz-card p-10 max-w-md w-full mx-6 text-center bg-white">
        <div className="mb-6 flex justify-center"><ProjectDunzoLogo size={48} showText={false} /></div>
        <span className="dz-chip dz-chip-brand mb-4">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> Authenticating
        </span>
        <div className="font-display text-2xl font-black mt-4">Establishing secure session…</div>
        <div className="text-sm font-medium text-neutral-600 mt-2">Verifying your Google identity with our ops backend.</div>
      </div>
    </div>
  );
}
