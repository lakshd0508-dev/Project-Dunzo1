import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import LandingPage from "@/pages/LandingPage";
import AuthCallback from "@/pages/AuthCallback";
import OnboardingPage from "@/pages/OnboardingPage";
import CustomerDashboard from "@/pages/CustomerDashboard";
import ConciergeDashboard from "@/pages/ConciergeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DispatchDetailPage from "@/pages/DispatchDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRedirect from "@/components/RoleRedirect";
import "@/App.css";

function App() {
  const { checkAuth, initialized } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Emergent Auth callback synchronously during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="dz-chip dz-chip-brand animate-pulse">Booting Project Dunzo…</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><RoleRedirect /></ProtectedRoute>
        } />
        <Route path="/customer" element={
          <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
        } />
        <Route path="/concierge" element={
          <ProtectedRoute role="concierge"><ConciergeDashboard /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/dispatch/:id" element={
          <ProtectedRoute><DispatchDetailPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
