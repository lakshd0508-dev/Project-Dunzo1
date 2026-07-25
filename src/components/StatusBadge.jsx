const STATUS_MAP = {
  pending: { label: "Broadcasting", cls: "bg-white text-black" },
  accepted: { label: "Accepted", cls: "bg-[#00E181] text-black" },
  picked_up: { label: "Picked Up", cls: "bg-[#FBBF24] text-black" },
  in_transit: { label: "In Transit", cls: "bg-[#FBBF24] text-black" },
  delivered: { label: "Delivered", cls: "bg-black text-[#00E181]" },
  cancelled: { label: "Cancelled", cls: "bg-[#EF4444] text-white" },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={`dz-chip ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}
