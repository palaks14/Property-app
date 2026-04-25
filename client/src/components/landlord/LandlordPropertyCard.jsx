import StatusBadge from "../admin/StatusBadge";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

function LandlordPropertyCard({ property, onEdit, onDelete }) {
  const status = property.status || (property.isApproved ? "approved" : "pending");

  return (
    <article className="saas-interactive-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44 bg-slate-200">
        {property.image ? (
          <img
            src={property.image}
            alt={property.title || "Property"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-500">No image available</div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{property.title || "Untitled property"}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="line-clamp-1 text-sm text-slate-500">{property.location || "Location unavailable"}</p>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            {property.propertyType || property.type || "Property"}
          </span>
          <p className="font-semibold text-slate-900">{formatCurrency(property.price)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Assigned tenant:</span>{" "}
          {property.assignedTenantName || "Not assigned yet"}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="saas-button-secondary flex-1">
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-500 active:scale-[0.98]"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default LandlordPropertyCard;
