import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const { user, initialized } = useAuthStore();

  // If AuthCallback just passed user in state, allow render immediately
  const passedUser = location.state?.user;
  const activeUser = user || passedUser;

  if (!initialized && !activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="dz-chip dz-chip-brand animate-pulse">Verifying access…</div>
      </div>
    );
  }

  if (!activeUser) return <Navigate to="/" replace />;

  const isMerchantOnboarded = activeUser.role === "merchant" && (activeUser.onboarded || (activeUser.brand_name && activeUser.phone));
  const isRiderOnboarded = (activeUser.role === "concierge" || activeUser.role === "rider") && (activeUser.onboarded || activeUser.vehicle_brand || activeUser.license_number);
  const isCustOnboarded = activeUser.role === "customer" && (activeUser.onboarded || activeUser.primary_address);
  const isOnboarded = activeUser.onboarded !== false || isMerchantOnboarded || isRiderOnboarded || isCustOnboarded;

  if (!isOnboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If role required, enforce it (but allow onboarding if no role set yet)
  if (role && activeUser.role !== role) {
    if (!activeUser.role) return <Navigate to="/onboarding" replace />;
    if (activeUser.role === "admin") return <Navigate to="/admin" replace />;
    if (activeUser.role === "merchant") return <Navigate to="/merchant" replace />;
    if (activeUser.role === "concierge") return <Navigate to="/concierge" replace />;
    return <Navigate to="/customer" replace />;
  }
  return children;
}
