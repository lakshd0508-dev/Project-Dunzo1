import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, MapPin, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import AddressForm from "@/components/AddressForm";

// SavedAddressSelect — dropdown of saved addresses + "Add new" opens a modal AddressForm.
// Emits onChange({ lat, lng, label, address }).
export default function SavedAddressSelect({ value, onChange, testIdPrefix = "addr" }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/addresses");
      setAddresses(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const emit = (a) => {
    onChange?.({
      lat: a.lat,
      lng: a.lng,
      label: [a.flat, a.building, a.line1, a.city].filter(Boolean).join(", "),
      address: a,
    });
  };

  useEffect(() => {
    // Auto-select primary if no value yet
    if (!value && addresses.length > 0) {
      const primary = addresses.find((a) => a.is_primary) || addresses[0];
      emit(primary);
    }
    // eslint-disable-next-line
  }, [addresses.length]);

  const saveNew = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post("/addresses", form);
      toast.success("Address saved");
      await load();
      emit(data);
      setModalOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <select
          data-testid={`${testIdPrefix}-select`}
          className="dz-input flex-1"
          value={value?.address?.address_id || ""}
          onChange={(e) => {
            const a = addresses.find((x) => x.address_id === e.target.value);
            if (a) emit(a);
          }}
          disabled={addresses.length === 0}
        >
          {loading && <option>Loading…</option>}
          {!loading && addresses.length === 0 && <option value="">No saved addresses — add one →</option>}
          {addresses.map((a) => (
            <option key={a.address_id} value={a.address_id}>
              {a.label}: {[a.flat, a.building, a.line1].filter(Boolean).join(", ")}, {a.city}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid={`${testIdPrefix}-add-new-btn`}
          onClick={() => setModalOpen(true)}
          className="dz-btn-brand inline-flex items-center gap-1 !py-2 !px-3 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> New
        </button>
      </div>

      {value?.address && (
        <div className="mt-2 p-3 border-2 border-black rounded-xl bg-[#00E181]/15 text-xs font-bold flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="flex-1">
            <div className="font-black uppercase tracking-widest text-[10px] mb-0.5">{value.address.label}</div>
            {[value.address.flat, value.address.building, value.address.line1, value.address.area].filter(Boolean).join(", ")}
            {value.address.landmark ? ` (${value.address.landmark})` : ""}, {value.address.city}, {value.address.state} - {value.address.pincode}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-2xl bg-white border-2 border-black rounded-xl p-6 max-h-[90vh] overflow-y-auto dz-scrollbar" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,1)" }}>
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg border-2 border-black bg-white hover:bg-[#EF4444] hover:text-white"
              style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}
              data-testid={`${testIdPrefix}-modal-close-btn`}
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <span className="dz-chip dz-chip-brand mb-3">Add Address Details</span>
            <h3 className="font-display font-black text-2xl mt-2 mb-4">Add a new address</h3>
            <AddressForm
              testIdPrefix={`${testIdPrefix}-modal`}
              onSave={saveNew}
              onCancel={() => setModalOpen(false)}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
