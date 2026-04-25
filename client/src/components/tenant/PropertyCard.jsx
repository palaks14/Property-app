import { ArrowRight, CreditCard, MapPin, Star } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

function PropertyCard({ property, onView, onPay, featured = false }) {
  const rating = ((property?.title?.length || 12) % 3) + 3;
  const facilities = Array.isArray(property?.facilities) ? property.facilities.slice(0, 2) : [];

  return (
    <article className="saas-interactive-card group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="relative h-48 bg-slate-200">
        {property?.image ? (
          <img
            src={property.image}
            alt={property.title || "Property"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-500">No image available</div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white">
            Recommended
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{property?.title || "Untitled Property"}</h3>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
            {property?.propertyType || property?.type || "Home"}
          </span>
        </div>

        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin size={14} />
          <span className="line-clamp-1">{property?.location || "Location unavailable"}</span>
        </p>

        <p className="text-sm text-slate-500">
          Landlord: <span className="font-medium text-slate-700">{property?.landlordName || "Not available"}</span>
        </p>

        <div className="flex items-end justify-between">
          <div>
            <p className="font-semibold text-slate-900">{formatCurrency(property?.price)}</p>
            <p className="text-xs text-slate-500">per month</p>
          </div>
          <p className="flex items-center gap-1 text-sm text-amber-500">
            <Star size={14} className="fill-current" />
            {rating}.0
          </p>
        </div>

        {facilities.length ? (
          <div className="flex flex-wrap gap-2">
            {facilities.map((facility) => (
              <span key={facility} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {facility}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            onClick={onView}
            className="saas-button-secondary inline-flex flex-1 items-center justify-center gap-2"
          >
            <ArrowRight size={16} />
            View Details
          </button>
          <button
            onClick={onPay}
            className="saas-button-primary inline-flex flex-1 items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            Pay Rent
          </button>
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;
