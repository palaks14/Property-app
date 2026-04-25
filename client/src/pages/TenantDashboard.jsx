import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck2, Clock3, Home, Sparkles } from "lucide-react";
import TenantLayout from "../components/tenant/TenantLayout";
import PropertyCard from "../components/tenant/PropertyCard";
import ProfileCard from "../components/common/ProfileCard";
import StatCard from "../components/admin/StatCard";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import { getApprovedProperties, getCurrentAuthUserId, getTenantBookings } from "../services/propertyBookingService";
import { getFullProfile } from "../services/profileService";

function TenantDashboard() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tenantId = getCurrentAuthUserId();
        const [propertiesDocs, bookingsDocs, profileData] = await Promise.all([
          getApprovedProperties(),
          tenantId ? getTenantBookings(tenantId) : Promise.resolve([]),
          tenantId ? getFullProfile(tenantId) : Promise.resolve(null)
        ]);
        setProperties(propertiesDocs || []);
        setPayments(bookingsDocs || []);
        setProfile(profileData);
      } catch (error) {
        console.error("Tenant dashboard fetch failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProperties = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return properties;
    return properties.filter((item) =>
      [item.title, item.location, item.type].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [properties, search]);

  const summary = useMemo(() => {
    const totalBookings = payments.length;
    const activeRentals = payments.filter((payment) => (payment.status || "").toLowerCase() === "active").length;
    const pendingPayments = payments.filter((payment) => (payment.status || "pending").toLowerCase() === "pending").length;
    return { totalBookings, activeRentals, pendingPayments };
  }, [payments]);

  const userName = localStorage.getItem("tenant_name") || "Tenant";

  return (
    <TenantLayout
      title="Tenant Home"
      subtitle="Manage your rentals and discover properties."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search homes by title, location, or type..."
    >
      <section className="saas-hero">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <Sparkles size={14} />
          Welcome
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Welcome back, {userName}</h1>
        <p className="mt-2 text-sm text-sky-50 sm:text-base">
          Here is a quick view of your bookings, pending payments, and recommended homes.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Bookings" value={summary.totalBookings} hint="All-time booking records" icon={CalendarCheck2} trend="positive" />
        <StatCard label="Active Rentals" value={summary.activeRentals} hint="Currently active rental payments" icon={Home} trend="positive" />
        <StatCard label="Pending Payments" value={summary.pendingPayments} hint="Payments waiting for completion" icon={Clock3} />
      </section>

      {profile ? (
        <section className="saas-panel">
          <div className="mb-5">
            <h2 className="saas-panel-title">Your tenant profile</h2>
            <p className="saas-panel-subtitle">Review your profile details and update preferences as needed.</p>
          </div>
          <ProfileCard profile={profile} editable />
        </section>
      ) : null}

      <section className="saas-panel">
        <div className="mb-5">
          <h2 className="saas-panel-title">Recommended Properties</h2>
          <p className="saas-panel-subtitle">Handpicked listings based on your recent activity.</p>
        </div>

        {loading ? (
          <LoadingState rows={5} />
        ) : filteredProperties.length === 0 ? (
          <EmptyState title="No recommended properties right now" description="Try adjusting your search or check back after new listings are added." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.slice(0, 6).map((property) => (
              <PropertyCard
                key={property._id}
                property={property}
                featured
                onView={() => navigate(`/tenant/property/${property.id || property._id}`)}
                onPay={() => navigate(`/tenant/payments?propertyId=${property.id || property._id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </TenantLayout>
  );
}

export default TenantDashboard;
