import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TenantLayout from "../components/tenant/TenantLayout";
import PropertyCard from "../components/tenant/PropertyCard";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import { getApprovedProperties } from "../services/propertyBookingService";

function TenantBrowse() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [bookingDraft, setBookingDraft] = useState({ propertyId: "", startDate: "", endDate: "" });
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const docs = await getApprovedProperties();
        setProperties(docs || []);
      } catch (error) {
        console.error("Browse properties fetch failed", error);
        setStatus({ type: "error", message: "Unable to load properties right now." });
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const locationOptions = useMemo(
    () => ["all", ...Array.from(new Set(properties.map((item) => item.location).filter(Boolean)))],
    [properties]
  );
  const typeOptions = useMemo(() => ["all", "1BHK", "2BHK", "3BHK", "4BHK"], []);

  const filteredProperties = useMemo(() => {
    const term = search.toLowerCase().trim();

    return properties.filter((item) => {
      const textMatch = term
        ? [item.title, item.location, item.type, item.propertyType].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term)
          )
        : true;

      const locationMatch = locationFilter === "all" ? true : item.location === locationFilter;
      const normalizedType = item.propertyType || item.type;
      const typeMatch = typeFilter === "all" ? true : normalizedType === typeFilter;

      const price = Number(item.price || 0);
      const priceMatch =
        priceFilter === "all"
          ? true
          : priceFilter === "under_8000"
            ? price < 8000
            : priceFilter === "8000_15000"
              ? price >= 8000 && price <= 15000
              : price > 15000;

      return textMatch && locationMatch && typeMatch && priceMatch;
    });
  }, [locationFilter, priceFilter, properties, search, typeFilter]);

  const buildPropertyUrl = (propertyId, basePath = `/tenant/property/${propertyId}`) => {
    const params = new URLSearchParams();
    const startDate = bookingDraft.startDate || new Date().toISOString().slice(0, 10);
    const endDate = bookingDraft.endDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

    params.set("startDate", startDate);
    params.set("endDate", endDate);

    return `${basePath}?${params.toString()}`;
  };

  return (
    <TenantLayout
      title="Browse Properties"
      subtitle="Explore rentals with smart filters and fast search."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by property name, type, or location..."
    >
      <section className="saas-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Booking Start Date</label>
            <input
              type="date"
              className="saas-control w-full"
              value={bookingDraft.startDate}
              onChange={(event) => setBookingDraft((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Booking End Date</label>
            <input
              type="date"
              className="saas-control w-full"
              value={bookingDraft.endDate}
              onChange={(event) => setBookingDraft((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="saas-control w-full" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All locations" : option}
              </option>
            ))}
          </select>
          <select className="saas-control w-full" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All types" : option}
              </option>
            ))}
          </select>
          <select className="saas-control w-full" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
            <option value="all">All prices</option>
            <option value="under_8000">Under INR 8,000</option>
            <option value="8000_15000">INR 8,000 - 15,000</option>
            <option value="above_15000">Above INR 15,000</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {filteredProperties.length} properties found
        </p>
        {status.message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {status.message}
          </p>
        )}
      </section>

      <section className="saas-panel">
        {loading ? (
          <LoadingState rows={6} />
        ) : filteredProperties.length === 0 ? (
          <EmptyState title="No properties match these filters" description="Try changing location, type, or price range." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id || property._id}
                property={property}
                onView={() => {
                  const targetId = String(property.id || property._id);
                  setBookingDraft((prev) => ({ ...prev, propertyId: targetId }));
                  navigate(buildPropertyUrl(targetId));
                }}
                onPay={() => {
                  const targetId = String(property.id || property._id);
                  setBookingDraft((prev) => ({ ...prev, propertyId: targetId }));
                  navigate(buildPropertyUrl(targetId, "/tenant/payments"));
                }}
              />
            ))}
          </div>
        )}
      </section>
    </TenantLayout>
  );
}

export default TenantBrowse;
