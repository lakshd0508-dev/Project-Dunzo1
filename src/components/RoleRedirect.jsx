import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/" replace />;
  if (!user.role) return <Navigate to="/onboarding" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "concierge") return <Navigate to="/concierge" replace />;
  return <Navigate to="/customer" replace />;
}
