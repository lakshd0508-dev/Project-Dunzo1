import { create } from "zustand";
import { api } from "@/lib/api";
import { auth, db } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut as fbSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

async function syncFirestoreUserProfile(userObj) {
  if (!userObj || !userObj.email) return userObj;
  try {
    const isRider = userObj.role === "concierge" || userObj.role === "rider";
    const coll = isRider ? "rider_profiles" : "customer_profiles";
    
    const [snapTarget, snapGeneral] = await Promise.all([
      getDoc(doc(db, coll, userObj.email)).catch(() => null),
      getDoc(doc(db, "profiles", userObj.email)).catch(() => null),
    ]);

    const targetData = snapTarget?.exists() ? snapTarget.data() : null;
    const generalData = snapGeneral?.exists() ? snapGeneral.data() : null;
    const mergedData = { ...(generalData || {}), ...(targetData || {}) };

    if (mergedData && (mergedData.onboarded || mergedData.vehicle_brand || mergedData.primary_address || mergedData.phone)) {
      const isRiderOnboarded = !!(mergedData.onboarded || (mergedData.phone && (mergedData.vehicle_brand || mergedData.license_number)));
      const isCustOnboarded = !!(mergedData.onboarded || (mergedData.phone && mergedData.primary_address));
      const isOnboarded = isRider ? isRiderOnboarded : isCustOnboarded;

      const syncedUser = {
        ...userObj,
        ...mergedData,
        onboarded: userObj.onboarded || isOnboarded,
        role: mergedData.role || userObj.role,
      };

      if (isRider && syncedUser.onboarded) {
        api.post("/onboarding/rider", {
          phone: syncedUser.phone,
          city: syncedUser.city,
          state: syncedUser.state,
          pincode: syncedUser.pincode,
          vehicle_brand: syncedUser.vehicle_brand,
          license_number: syncedUser.license_number,
          onboarded: true,
          role: "concierge",
        }).catch(() => {});
      } else if (!isRider && syncedUser.onboarded) {
        api.post("/onboarding/customer", {
          phone: syncedUser.phone,
          primary_address: syncedUser.primary_address,
          onboarded: true,
          role: "customer",
        }).catch(() => {});
      }

      return syncedUser;
    }
  } catch (e) {
    console.error("Firestore user sync error:", e);
  }
  return userObj;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    try {
      const token = localStorage.getItem("dz_token");
      if (!token) {
        set({ user: null, loading: false, initialized: true });
        return null;
      }
      const { data } = await api.get("/auth/me");
      const synced = await syncFirestoreUserProfile(data);
      set({ user: synced, loading: false, initialized: true });
      return synced;
    } catch (e) {
      set({ user: null, loading: false, initialized: true });
      return null;
    }
  },

  loginWithGoogle: async (role = "customer") => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const payload = {
        email: firebaseUser.email || "google_user@projectdunzo.com",
        name: firebaseUser.displayName || "Google User",
        role: role,
      };

      const { data } = await api.post("/auth/google", payload);
      if (data.token) {
        localStorage.setItem("dz_token", data.token);
      }
      const synced = await syncFirestoreUserProfile(data.user);
      set({ user: synced });
      return synced;
    } catch (e) {
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        console.warn("Google sign-in popup closed by user.");
        return null;
      }
      console.error("Google sign in error:", e);
      throw e;
    }
  },

  loginAsAdmin: async (email, password) => {
    try {
      const { data } = await api.post("/auth/admin-login", { email, password });
      if (data.token) {
        localStorage.setItem("dz_token", data.token);
      }
      set({ user: data.user });
      return data.user;
    } catch (e) {
      console.error("Admin login error:", e);
      throw e;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
      await fbSignOut(auth);
    } catch (e) {}
    if (typeof window !== "undefined") localStorage.removeItem("dz_token");
    set({ user: null });
  },
}));
