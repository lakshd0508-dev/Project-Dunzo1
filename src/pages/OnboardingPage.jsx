import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bike, ShoppingBag, ArrowRight, Phone, UserCheck, Truck, Hash, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { db } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import ProjectDunzoLogo from "@/components/ProjectDunzoLogo";
import AddressForm from "@/components/AddressForm";
import { AUTH_TESTIDS } from "@/constants/testIds";

// Format XX-00-AB-0000
const formatReg = (raw) => {
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
  let out = "";
  if (clean.length > 0) out += clean.slice(0, 2);
  if (clean.length > 2) out += "-" + clean.slice(2, 4);
  if (clean.length > 4) out += "-" + clean.slice(4, 6);
  if (clean.length > 6) out += "-" + clean.slice(6, 10);
  return out;
};

const REG_RE = /^[A-Z]{2}-\d{2}-[A-Z0-9]{1,2}-\d{4}$/;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuthStore();
  const activeUser = user || location.state?.user;
  const [role, setRole] = useState(activeUser?.role || "customer");
  const [phone, setPhone] = useState(activeUser?.phone ? activeUser.phone.replace("+91", "") : "");
  const [submitting, setSubmitting] = useState(false);

  // customer
  const [address, setAddress] = useState(null);

  // rider
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("");

  const validPhone = phone.replace(/\D/g, "").length === 10;

  useEffect(() => {
    if (!activeUser?.email) return;
    const checkExistingProfile = async () => {
      try {
        const isRiderRole = role === "concierge" || activeUser.role === "concierge";
        if (isRiderRole) {
          const snap = await getDoc(doc(db, "rider_profiles", activeUser.email));
          if (snap.exists()) {
            const data = snap.data();
            if (data.phone) setPhone(data.phone.replace("+91", ""));
            if (data.vehicle_brand) setVehicleBrand(data.vehicle_brand);
            if (data.license_number) setLicenseNumber(data.license_number);
            if (data.city) setCity(data.city);
            if (data.state) setState(data.state);
            if (data.pincode) setPincode(data.pincode);

            if (data.onboarded || (data.vehicle_brand && data.phone)) {
              const updatedUser = { ...activeUser, ...data, onboarded: true, role: "concierge" };
              setUser(updatedUser);
              await api.post("/onboarding/rider", {
                phone: data.phone,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                vehicle_brand: data.vehicle_brand,
                license_number: data.license_number,
                onboarded: true,
                role: "concierge",
              }).catch(() => {});
              toast.success("Delivery partner profile verified");
              navigate("/concierge", { replace: true });
            }
          }
        } else {
          const snap = await getDoc(doc(db, "customer_profiles", activeUser.email));
          if (snap.exists()) {
            const data = snap.data();
            if (data.phone) setPhone(data.phone.replace("+91", ""));
            if (data.onboarded || (data.primary_address && data.phone)) {
              const updatedUser = { ...activeUser, ...data, onboarded: true, role: "customer" };
              setUser(updatedUser);
              await api.post("/onboarding/customer", {
                phone: data.phone,
                primary_address: data.primary_address,
                onboarded: true,
                role: "customer",
              }).catch(() => {});
              toast.success("Customer profile verified");
              navigate("/customer", { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Error checking existing onboarding profile:", err);
      }
    };
    checkExistingProfile();
  }, [activeUser?.email, role]);

  const submitCustomer = async () => {
    if (!validPhone) return toast.error("Enter a valid 10-digit mobile");
    if (!address || !address.line1) return toast.error("Please add and complete your primary delivery address");
    await submitCustomerWithAddress(address);
  };

  const submitCustomerWithAddress = async (a) => {
    if (!validPhone) return toast.error("Enter a valid 10-digit mobile");
    setSubmitting(true);
    try {
      const payload = {
        phone: "+91" + phone.replace(/\D/g, "").slice(-10),
        primary_address: {
          label: a.label || "Home",
          flat: a.flat || "",
          building: a.building || "",
          line1: a.line1,
          area: a.area || "",
          landmark: a.landmark || "",
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          lat: a.lat,
          lng: a.lng,
          is_primary: true,
        },
        onboarded: true,
        role: "customer",
      };
      const { data } = await api.post("/onboarding/customer", payload);
      setUser(data);

      if (activeUser?.email) {
        try {
          const addressObj = {
            address_id: "primary_home",
            id: "primary_home",
            searchAddress: [payload.primary_address.line1, payload.primary_address.area, payload.primary_address.city].filter(Boolean).join(", "),
            houseNo: payload.primary_address.flat || payload.primary_address.building || payload.primary_address.line1,
            receiverName: activeUser?.name || "Customer",
            receiverPhone: payload.phone,
            ...payload.primary_address,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "customer_profiles", activeUser.email), { ...payload, name: activeUser.name, email: activeUser.email }, { merge: true });
          await setDoc(doc(db, "profiles", activeUser.email), { ...payload, name: activeUser.name, email: activeUser.email }, { merge: true });

          await setDoc(doc(db, "customer_profiles", activeUser.email, "addresses", "primary_home"), addressObj, { merge: true });
          await setDoc(doc(db, "profiles", activeUser.email, "addresses", "primary_home"), addressObj, { merge: true });

          await api.post("/addresses", addressObj).catch(() => {});
        } catch (err) {
          console.error("Firestore sync error:", err);
        }
      }

      toast.success(`Welcome ${data.name.split(" ")[0]} — address saved & account ready.`);
      navigate("/customer", { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const submitRider = async () => {
    if (!validPhone) return toast.error("Enter a valid 10-digit mobile");
    if (!vehicleBrand.trim()) return toast.error("Enter vehicle brand (e.g. Activa 6G)");
    if (!REG_RE.test(licenseNumber)) return toast.error("Vehicle registration must be XX-00-AB-0000 (e.g. KA-05-AB-1234)");
    if (!city.trim() || !state.trim() || pincode.length !== 6) {
      return toast.error("Enter valid city, state and 6-digit pincode");
    }
    setSubmitting(true);
    try {
      const payload = {
        phone: "+91" + phone.replace(/\D/g, "").slice(-10),
        city: city.trim(),
        state: state.trim(),
        pincode,
        vehicle_brand: vehicleBrand.trim(),
        license_number: licenseNumber.toUpperCase(),
        onboarded: true,
        role: "concierge",
      };
      const { data } = await api.post("/onboarding/rider", payload);
      setUser(data);

      if (activeUser?.email) {
        try {
          await setDoc(doc(db, "rider_profiles", activeUser.email), { ...payload, name: activeUser.name, email: activeUser.email }, { merge: true });
        } catch (err) {
          console.error("Firestore sync error:", err);
        }
      }

      toast.success("Delivery Partner account activated");
      navigate("/concierge", { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const licenseValid = licenseNumber.length === 0 || REG_RE.test(licenseNumber);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="mb-6 flex items-center justify-center">
          <ProjectDunzoLogo size={96} />
        </div>

        <div className="dz-card p-6 md:p-8 bg-white">
          <span className="dz-chip dz-chip-brand mb-4"><UserCheck className="w-3 h-3" /> {role === "concierge" ? "Delivery Partner Onboarding" : "Customer Onboarding"}</span>
          <h1 className="font-display font-black text-3xl lg:text-4xl mt-3 mb-3">
            Welcome, <span className="bg-[#00E181] px-2 border-2 border-black" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>{activeUser?.name?.split(" ")[0] || "there"}</span>.
          </h1>
          <p className="text-neutral-700 font-medium mb-6">
            Please complete your {role === "concierge" ? "delivery partner" : "delivery address and contact"} details below to get started.
          </p>

          <div className="border-t-2 border-dashed border-black my-6" />

          {/* Common phone */}
          <div className="mb-5">
            <label className="dz-overline block mb-2">Mobile number *</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <Phone className="w-4 h-4" strokeWidth={2.5} />
                <span className="font-mono font-bold text-sm">+91</span>
              </div>
              <input
                data-testid={AUTH_TESTIDS.phoneInput}
                className="dz-input pl-20 font-mono"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            {phone && !validPhone && (
              <div className="text-xs font-bold text-[#EF4444] mt-1">Must be 10 digits ({phone.length}/10)</div>
            )}
          </div>

          {role === "customer" ? (
            <>
              <div className="mb-4">
                <label className="dz-overline block mb-2">Primary Delivery Address *</label>
                <p className="text-xs font-medium text-neutral-600 mb-3">
                  Search or GPS-detect, then complete the details below.
                </p>
                <AddressForm
                  testIdPrefix="onboard-addr"
                  onFormChange={(a) => setAddress(a)}
                  onSave={(a) => {
                    setAddress(a);
                    toast.success("Primary delivery address saved!");
                  }}
                  saving={submitting}
                />
              </div>
              <div className="pt-3 border-t-2 border-dashed border-black">
                <button
                  data-testid={AUTH_TESTIDS.onboardingSubmit}
                  onClick={submitCustomer}
                  disabled={submitting || !validPhone}
                  className="dz-btn-brand inline-flex items-center gap-2 !py-3 !px-6 !text-sm"
                >
                  {submitting ? "Saving…" : "Complete customer setup"} <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Rider fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="dz-overline block mb-2">Vehicle Brand / Model *</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={2.5} />
                    <input
                      data-testid="onboard-vehicle-brand-input"
                      className="dz-input pl-10"
                      placeholder="e.g. Activa 6G, Splendor, Ather 450"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="dz-overline block mb-2 flex items-center justify-between">
                    <span>Vehicle Registration No. *</span>
                    <span className="text-[9px] text-neutral-500 font-mono normal-case">XX-00-AB-0000</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={2.5} />
                    <input
                      data-testid="onboard-reg-input"
                      className={`dz-input pl-10 font-mono uppercase ${licenseNumber && !licenseValid ? "!border-[#EF4444]" : ""}`}
                      placeholder="KA-05-AB-1234"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(formatReg(e.target.value))}
                      maxLength={13}
                    />
                  </div>
                  {licenseNumber && !licenseValid && (
                    <div className="text-xs font-bold text-[#EF4444] mt-1">Format: KA-05-AB-1234</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="dz-overline block mb-2">City *</label>
                  <input
                    data-testid="onboard-city-input"
                    className="dz-input"
                    placeholder="Bengaluru"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="dz-overline block mb-2">State *</label>
                  <input
                    data-testid="onboard-state-input"
                    className="dz-input"
                    placeholder="Karnataka"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="dz-overline block mb-2">Pincode *</label>
                  <input
                    data-testid="onboard-pincode-input"
                    className="dz-input font-mono"
                    placeholder="560001"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>
              </div>

              <button
                data-testid={AUTH_TESTIDS.onboardingSubmit}
                onClick={submitRider}
                disabled={submitting || !validPhone}
                className="dz-btn-brand inline-flex items-center gap-2 !py-3 !px-6 !text-sm"
              >
                {submitting ? "Verifying…" : "Complete partner setup"} <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
