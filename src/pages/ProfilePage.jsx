import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Phone, User as UserIcon, MapPin, Star, Trash2, Plus, Edit3, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/AppHeader";
import AddressForm from "@/components/AddressForm";

const ROLE_LABEL = { customer: "Customer", concierge: "Delivery Partner", admin: "Admin" };
const ROLE_COLOR = { customer: "dz-chip-brand", concierge: "dz-chip-amber", admin: "dz-chip-dark" };

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  // addresses
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [addrSaving, setAddrSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadAddrs = async () => {
    setAddrLoading(true);
    try {
      const { data } = await api.get("/addresses");
      const unique = [];
      const seen = new Set();
      for (const a of data) {
        const flatStr = (a.flat || a.houseNo || a.building || a.line1 || "").toString().trim().toLowerCase();
        const pinStr = (a.pincode || "").toString().trim();
        const key = flatStr && pinStr ? `${flatStr}_${pinStr}` : (a.address_id || a.id);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(a);
        }
      }
      setAddresses(unique);
    } finally { setAddrLoading(false); }
  };
  useEffect(() => { loadAddrs(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", { name, phone });
      setUser(data);
      toast.success("Profile updated");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
    finally { setSaving(false); }
  };

  const saveAddress = async (form) => {
    setAddrSaving(true);
    try {
      if (editingId) {
        await api.patch(`/addresses/${editingId}`, form);
        toast.success("Address updated");
      } else {
        const flatStr = (form.flat || form.houseNo || form.building || form.line1 || "").toString().trim().toLowerCase();
        const pinStr = (form.pincode || "").toString().trim();
        const existingDup = addresses.find(a => {
          const aFlat = (a.flat || a.houseNo || a.building || a.line1 || "").toString().trim().toLowerCase();
          const aPin = (a.pincode || "").toString().trim();
          return aFlat === flatStr && (!pinStr || !aPin || aPin === pinStr);
        });
        if (existingDup) {
          toast.info("This address is already saved");
          setModalOpen(false);
          setEditingId(null);
          setAddrSaving(false);
          return;
        }
        await api.post("/addresses", form);
        toast.success("Address added");
      }
      await loadAddrs();
      setModalOpen(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally { setAddrSaving(false); }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success("Deleted");
      loadAddrs();
    } catch (e) { toast.error("Failed to delete"); }
  };

  const setPrimary = async (a) => {
    try {
      await api.patch(`/addresses/${a.address_id}`, {
        label: a.label, flat: a.flat, building: a.building, line1: a.line1,
        area: a.area, landmark: a.landmark, city: a.city, state: a.state,
        pincode: a.pincode, lat: a.lat, lng: a.lng, is_primary: true,
        receiver_name: a.receiver_name, receiver_phone: a.receiver_phone,
      });
      toast.success("Marked as primary");
      loadAddrs();
    } catch (e) { toast.error("Failed"); }
  };

  const editingAddress = editingId ? addresses.find((a) => a.address_id === editingId) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900">
      <AppHeader subtitle="PROFILE" />
      <main className="max-w-4xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        <div>
          <span className="dz-chip">// Account</span>
          <h1 className="font-display text-4xl font-black mt-3">Your profile</h1>
        </div>

        <div className="dz-card p-6 md:p-8 bg-white space-y-5">
          <div className="flex items-center gap-4 pb-6 border-b-2 border-dashed border-black">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-16 h-16 rounded-xl border-2 border-black" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }} />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-black bg-[#00E181] flex items-center justify-center" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,1)" }}>
                <UserIcon className="w-7 h-7" strokeWidth={2.5} />
              </div>
            )}
            <div>
              <div className="font-display text-xl font-black">{user?.name}</div>
              <div className="text-sm font-medium text-neutral-600">{user?.email}</div>
              <span className={`dz-chip mt-2 ${ROLE_COLOR[user?.role] || ""}`}>{ROLE_LABEL[user?.role] || user?.role}</span>
            </div>
          </div>

          <div>
            <label className="dz-overline block mb-2">Display Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={2.5} />
              <input data-testid="profile-name-input" className="dz-input pl-10" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="dz-overline block mb-2">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={2.5} />
              <input data-testid="profile-phone-input" className="dz-input pl-10 font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          {user?.role === "concierge" && (
            <div className="p-4 border-2 border-black rounded-lg bg-[#FBBF24]/20">
              <div className="dz-overline mb-1">Vehicle Details</div>
              <div className="font-bold text-sm">{user.vehicle_brand}</div>
              <div className="font-mono font-black">{user.license_number}</div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t-2 border-dashed border-black">
            <button data-testid="profile-save-btn" onClick={saveProfile} disabled={saving} className="dz-btn-brand inline-flex items-center gap-2">
              <Save className="w-4 h-4" strokeWidth={2.5} /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Addresses section */}
        {user?.role === "customer" && (
          <div className="dz-card p-6 md:p-8 bg-white" data-testid="profile-addresses-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-black flex items-center gap-2">
                <MapPin className="w-5 h-5" strokeWidth={2.5} /> Saved Addresses
              </h2>
              <button
                data-testid="add-address-btn"
                onClick={() => { setEditingId(null); setModalOpen(true); }}
                className="dz-btn-brand inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" strokeWidth={3} /> Add address
              </button>
            </div>

            {addrLoading ? (
              <div className="text-center py-6 text-sm font-bold text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-black rounded-lg bg-[#F5F5F5]">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-neutral-400" strokeWidth={1.5} />
                <div className="text-sm font-bold text-neutral-600">No addresses saved yet.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addresses.map((a) => (
                  <div key={a.address_id} data-testid="address-card" className="dz-card-sm p-4 bg-white relative">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="dz-chip !border-black uppercase text-[10px]">{a.label}</span>
                        {a.is_primary && <span className="dz-chip dz-chip-brand"><Star className="w-3 h-3" strokeWidth={3} /> Primary</span>}
                      </div>
                    </div>
                    <div className="text-sm font-bold leading-relaxed">
                      {[a.flat, a.building, a.line1, a.area].filter(Boolean).join(", ")}
                      {a.landmark && <div className="text-neutral-500 text-xs mt-1">Landmark: {a.landmark}</div>}
                      <div className="text-neutral-700 font-medium mt-1">{a.city}, {a.state} - {a.pincode}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t-2 border-dashed border-black">
                      {!a.is_primary && (
                        <button data-testid="address-primary-btn" onClick={() => setPrimary(a)} className="text-[10px] font-black uppercase tracking-wider text-neutral-700 hover:text-black px-2 py-1 border-2 border-black rounded-md bg-white">
                          Set primary
                        </button>
                      )}
                      <button data-testid="address-edit-btn" onClick={() => { setEditingId(a.address_id); setModalOpen(true); }} className="p-1.5 border-2 border-black rounded-md bg-white hover:bg-[#00E181]">
                        <Edit3 className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <button data-testid="address-delete-btn" onClick={() => deleteAddress(a.address_id)} className="p-1.5 border-2 border-black rounded-md bg-white hover:bg-[#EF4444] hover:text-white">
                        <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Address modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="relative w-full max-w-2xl bg-white border-2 border-black rounded-xl p-6 max-h-[90vh] overflow-y-auto dz-scrollbar" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,1)" }}>
              <button
                onClick={() => { setModalOpen(false); setEditingId(null); }}
                className="absolute top-4 right-4 p-2 rounded-lg border-2 border-black bg-white hover:bg-[#EF4444] hover:text-white"
                style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}
                data-testid="address-modal-close-btn"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <span className="dz-chip dz-chip-brand mb-3">Add Address Details</span>
              <h3 className="font-display font-black text-2xl mt-2 mb-4">
                {editingAddress ? "Edit address" : "Add a new address"}
              </h3>
              <AddressForm
                testIdPrefix="prof-addr"
                initial={editingAddress || null}
                onSave={saveAddress}
                onCancel={() => { setModalOpen(false); setEditingId(null); }}
                saving={addrSaving}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
