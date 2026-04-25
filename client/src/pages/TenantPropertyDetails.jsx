import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, CreditCard, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import TenantLayout from "../components/tenant/TenantLayout";
import LoadingState from "../components/admin/LoadingState";
import EmptyState from "../components/admin/EmptyState";
import { getPropertyById } from "../services/propertyBookingService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const buildAmenityList = (property) => {
  const list = Array.isArray(property?.facilities) && property.facilities.length
    ? property.facilities
    : Array.isArray(property?.amenities) && property.amenities.length
      ? property.amenities
      : [];

  if (list.length) {
    return list;
  }

  return [
    "24/7 security",
    "Fast maintenance support",
    "Verified landlord",
    "Digital rent tracking"
  ];
};

function TenantPropertyDetails() {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const [searchParams] = useSearchParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("Property not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const propertyData = await getPropertyById(propertyId);
        setProperty(propertyData);
        setError("");
      } catch (fetchError) {
        console.error("Property details fetch failed", fetchError);
        setError("Unable to load property details right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const amenityList = useMemo(() => buildAmenityList(property), [property]);
  const imageGallery = useMemo(() => {
    const images = Array.isArray(property?.images) && property.images.length ? property.images : [];
    if (images.length) {
      return images;
    }
    return property?.image ? [property.image] : [];
  }, [property]);

  const handlePayRent = () => {
    const params = new URLSearchParams();
    if (property?.id || property?._id) {
      params.set("propertyId", String(property.id || property._id));
    }
    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }
    navigate(`/tenant/payments?${params.toString()}`);
  };

  return (
    <TenantLayout
      title="Property Details"
      subtitle="Explore the home, verify the rent, and continue to secure checkout."
    >
      {loading ? (
        <section className="saas-panel">
          <LoadingState rows={6} />
        </section>
      ) : error ? (
        <section className="saas-panel">
          <EmptyState title="Unable to open this property" description={error} />
        </section>
      ) : !property ? (
        <section className="saas-panel">
          <EmptyState title="Property missing" description="This listing is no longer available." />
        </section>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="relative min-h-[300px] bg-slate-200">
                {imageGallery[0] ? (
                  <img src={imageGallery[0]} alt={property.title || "Property"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full min-h-[300px] place-items-center bg-slate-200 text-sm text-slate-500">No image available</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-5 text-white">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                    <Sparkles size={14} />
                    Featured Rental
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{property.title || "Property"}</h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-100">
                    <MapPin size={16} />
                    {property.location || "Prime location"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_52%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-6 sm:p-8">
                <div>
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <div className="mt-6 flex items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      {property.propertyType || property.type || "Home"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Ready to Rent
                    </span>
                  </div>

                  <p className="mt-6 text-sm uppercase tracking-[0.18em] text-slate-500">Monthly Rent</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-950">{formatCurrency(property.price)}</p>
                  <p className="mt-2 text-sm text-slate-500">Includes seamless online rent payment and booking confirmation.</p>
                  <p className="mt-3 text-sm text-slate-600">
                    Landlord: <span className="font-semibold text-slate-900">{property.landlordName || "Not available"}</span>
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                      <BedDouble size={18} className="text-sky-600" />
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">Type</p>
                      <p className="mt-1 font-semibold text-slate-900">{property.propertyType || property.type || "Apartment"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                      <Bath size={18} className="text-sky-600" />
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">Support</p>
                      <p className="mt-1 font-semibold text-slate-900">On-demand help</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                      <ShieldCheck size={18} className="text-sky-600" />
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">Verified</p>
                      <p className="mt-1 font-semibold text-slate-900">Secure listing</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <button onClick={handlePayRent} className="saas-button-primary inline-flex w-full items-center justify-center gap-2 py-3">
                    <CreditCard size={16} />
                    Pay Rent
                  </button>
                  <button
                    onClick={() => navigate("/tenant/browse")}
                    className="saas-button-secondary inline-flex w-full items-center justify-center gap-2 py-3"
                  >
                    <Building2 size={16} />
                    Explore More Homes
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.4fr,0.8fr]">
            <article className="saas-panel">
              <h2 className="saas-panel-title">About This Property</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {property.description ||
                  "This rental is designed for tenants who want a clean, dependable, and digitally managed home experience with fast support and transparent monthly payments."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {amenityList.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>

              {imageGallery.length > 1 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {imageGallery.slice(1).map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img src={image} alt={`${property.title || "Property"} ${index + 2}`} className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <aside className="space-y-5">
              <article className="saas-panel">
                <h2 className="saas-panel-title">Booking Snapshot</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Rent Cycle</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">Monthly payment</p>
                    <p className="mt-1 text-sm text-slate-500">Secure the home and keep transactions in one tenant dashboard.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                      <CalendarDays size={14} />
                      Selected Stay
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{startDate || "Start date not selected"}</p>
                    <p className="mt-1 text-sm text-slate-500">{endDate || "End date not selected"}</p>
                  </div>
                </div>
              </article>

              <article className="saas-panel bg-[linear-gradient(180deg,_rgba(14,165,233,0.08),_rgba(255,255,255,0.9))]">
                <h2 className="saas-panel-title">Why Tenants Like This Flow</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>Review the listing before you commit.</p>
                  <p>Pay securely with Razorpay checkout.</p>
                  <p>Your rent activity automatically appears in bookings and payment history.</p>
                </div>
              </article>
            </aside>
          </section>
        </>
      )}
    </TenantLayout>
  );
}

export default TenantPropertyDetails;
