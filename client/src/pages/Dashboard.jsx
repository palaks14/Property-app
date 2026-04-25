import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Building2, CalendarCheck2, Clock3, IndianRupee, PlusSquare, Sparkles } from "lucide-react";
import LandlordLayout from "../components/landlord/LandlordLayout";
import LandlordPropertyCard from "../components/landlord/LandlordPropertyCard";
import ProfileCard from "../components/common/ProfileCard";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatCard from "../components/admin/StatCard";
import StatusBadge from "../components/admin/StatusBadge";
import {
  addLandlordProperty,
  bookingDate,
  deletePropertyById,
  getCurrentAuthUserId,
  getLandlordBookings,
  getLandlordPayments,
  getLandlordProperties,
  updatePropertyById
} from "../services/propertyBookingService";
import { getFullProfile } from "../services/profileService";

const monthLabel = (dateValue) =>
  new Date(dateValue).toLocaleString("en-IN", { month: "short", year: "2-digit" });

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const initialFormState = {
  title: "",
  description: "",
  price: "",
  location: "",
  type: "",
  image: ""
};

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [earningsData, setEarningsData] = useState({ totalEarnings: 0, monthlyEarnings: [], paymentHistory: [] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [bookingFilter, setBookingFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [profile, setProfile] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const landlordId = getCurrentAuthUserId();
      if (!landlordId) {
        setFeedback({ type: "error", message: "Please login again to load landlord data." });
        setProperties([]);
        setBookingsData([]);
        setPaymentsData([]);
        setEarningsData({ totalEarnings: 0, monthlyEarnings: [], paymentHistory: [] });
        return;
      }

      const [propertiesResult, bookingsResult, paymentsResult, profileResult] = await Promise.allSettled([
        getLandlordProperties(landlordId),
        getLandlordBookings(landlordId),
        getLandlordPayments(),
        getFullProfile(landlordId)
      ]);

      const propertiesDocs = propertiesResult.status === "fulfilled" ? propertiesResult.value : [];
      const bookingsDocs = bookingsResult.status === "fulfilled" ? bookingsResult.value : [];
      const paymentsDocs = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
      const profileData = profileResult.status === "fulfilled" ? profileResult.value : null;

      const paidStatuses = new Set(["active", "completed"]);
      const totalEarnings = paymentsDocs
        .filter((payment) => ["paid", "active", "completed"].includes(String(payment.status || "").toLowerCase()))
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const monthlyMap = {};
      paymentsDocs.forEach((payment) => {
        const d = bookingDate(payment.date || payment.billingPeriodStart) || new Date();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + Number(payment.amount || 0);
      });

      setProperties(propertiesDocs || []);
      setBookingsData(bookingsDocs || []);
      setPaymentsData(paymentsDocs || []);
      setProfile(profileData);
      setEarningsData({
        totalEarnings,
        monthlyEarnings: Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })),
        paymentHistory: paymentsDocs.map((payment) => ({
          bookingId: payment._id,
          tenantId: payment.tenantId,
          tenantName: payment.tenantName || "Tenant",
          amount: Number(payment.amount || 0),
          status: payment.status,
          date: payment.date,
          billingPeriodStart: payment.billingPeriodStart,
          billingPeriodEnd: payment.billingPeriodEnd,
          nextPaymentDate: payment.nextPaymentDate,
          propertyTitle: payment.property?.title || "Property"
        }))
      });

      if (propertiesResult.status !== "fulfilled" && bookingsResult.status !== "fulfilled" && paymentsResult.status !== "fulfilled") {
        const errorMessages = [propertiesResult, bookingsResult, paymentsResult]
          .filter((result) => result.status === "rejected")
          .map((result) => String(result.reason?.message || result.reason || "Unknown error"));

        setFeedback({
          type: "error",
          message: errorMessages.length
            ? `Unable to load dashboard items: ${errorMessages.join("; ")}`
            : "Unable to load landlord dashboard data."
        });
      }
    } catch (error) {
      console.error("Landlord dashboard fetch failed", error);
      setFeedback({ type: "error", message: String(error?.message || "Unable to load landlord dashboard data.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };

    const handleWindowFocus = () => {
      fetchDashboardData();
    };

    const intervalId = window.setInterval(() => {
      fetchDashboardData();
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    const sectionMap = {
      "/dashboard/properties": "properties",
      "/dashboard/add-property": "add-property",
      "/dashboard/bookings": "bookings",
      "/dashboard/earnings": "earnings",
      "/dashboard/profile": "profile"
    };
    const targetId = sectionMap[location.pathname];
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.pathname === "/dashboard/add-property") {
      setShowAddForm(true);
      setEditingId(null);
      setFormData(initialFormState);
    }
  }, [location.pathname]);

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const activeBookings = bookingsData.filter((booking) => (booking.status || "").toLowerCase() === "active").length;
    const totalEarnings = Number(earningsData.totalEarnings || 0);
    const pendingRequests = paymentsData.filter((payment) => (payment.status || "").toLowerCase() !== "paid").length;
    const totalTenants = new Set(bookingsData.map((booking) => String(booking.tenantId || "")).filter(Boolean)).size;
    return { totalProperties, activeBookings, totalEarnings, pendingRequests, totalTenants };
  }, [bookingsData, earningsData.totalEarnings, properties]);

  const filteredProperties = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return properties;
    return properties.filter((property) =>
      [property.title, property.location, property.type, property.propertyType].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [properties, search]);

  const bookings = useMemo(
    () => {
      return bookingsData
        .map((booking) => ({
        ...booking,
        id: booking.id || booking._id,
        propertyName: booking.property?.title || "Property",
        startDate: bookingDate(booking.billingPeriodStart || booking.startDate || booking.createdAt) || new Date(),
        endDate: bookingDate(booking.billingPeriodEnd || booking.endDate) || new Date(),
        nextPaymentDate: bookingDate(booking.nextPaymentDate || booking.billingPeriodEnd || booking.endDate),
        bookingStatus: String(booking.status || "pending").toLowerCase()
      }))
        .sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0));
    },
    [bookingsData]
  );

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") return bookings;
    return bookings.filter((item) => item.bookingStatus === bookingFilter);
  }, [bookingFilter, bookings]);

  const earningsTrend = useMemo(() => {
    const raw = earningsData.monthlyEarnings || [];
    return raw.map((item) => {
      const label = item.month?.includes("-") ? monthLabel(`${item.month}-01`) : String(item.month || "");
      return { month: label, amount: Number(item.amount || 0) };
    });
  }, [earningsData.monthlyEarnings]);

  const bookingTrend = useMemo(() => {
    const grouped = bookingsData.reduce((acc, booking) => {
      const label = monthLabel(booking.createdAt || booking.startDate || Date.now());
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([month, total]) => ({ month, total }));
  }, [bookingsData]);

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    if (!formData.price || Number(formData.price) <= 0) errors.price = "Valid price is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.type.trim()) errors.type = "Type is required";
    if (!formData.image.trim()) errors.image = "Image URL is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProperty = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title,
      price: Number(formData.price),
      location: formData.location,
      type: formData.type,
      image: formData.image,
      facilities: formData.description
        ? formData.description
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []
    };

    try {
      const landlordId = getCurrentAuthUserId();
      if (!landlordId) throw new Error("Missing logged-in landlord id");

      let savedProperty;
      if (editingId) {
        savedProperty = await updatePropertyById(editingId, {
          title: payload.title,
          description: formData.description || "",
          price: payload.price,
          location: payload.location,
          propertyType: payload.type,
          type: payload.type,
          image: payload.image,
          images: payload.image ? [payload.image] : [],
          facilities: payload.facilities
        });
        setProperties((prev) =>
          prev.map((property) =>
            String(property.id || property._id) === String(editingId) ? savedProperty : property
          )
        );
      } else {
        savedProperty = await addLandlordProperty(
          {
            title: payload.title,
            description: formData.description || "",
            price: payload.price,
            location: payload.location,
            propertyType: payload.type,
            type: payload.type,
            image: payload.image,
            images: payload.image ? [payload.image] : [],
            facilities: payload.facilities
          },
          landlordId
        );
        setProperties((prev) => [savedProperty, ...prev]);
      }

      setFormData(initialFormState);
      setEditingId(null);
      setShowAddForm(false);
      setFeedback({ type: "success", message: editingId ? "Property updated." : "Property added and sent for approval." });
      await fetchDashboardData();
    } catch (error) {
      console.error("Property save failed", error);
      const errorMessage =
        error?.response?.data?.message ||
        (typeof error?.response?.data === "string" ? error.response.data : null) ||
        error.message ||
        "Unable to save property.";
      setFeedback({ type: "error", message: errorMessage });
    }
  };

  const editProperty = (property) => {
    setFormData({
      title: property.title || "",
      description: (property.facilities || []).join(", "),
      price: property.price || "",
      location: property.location || "",
      type: property.type || "",
      image: property.image || ""
    });
    setEditingId(property.id || property._id);
    setShowAddForm(true);
    document.getElementById("add-property")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteProperty = async (id) => {
    try {
      await deletePropertyById(id);
      setProperties((prev) => prev.filter((property) => String(property.id || property._id) !== String(id)));
      setFeedback({ type: "success", message: "Property deleted." });
    } catch (error) {
      console.error("Delete property failed", error);
      setFeedback({ type: "error", message: "Unable to delete property." });
    }
  };

  const landlordName = localStorage.getItem("landlord_name") || "Landlord";

  return (
    <LandlordLayout
      title="Landlord Dashboard"
      subtitle="Manage listings, bookings, and earnings from one place."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search properties by title, location, or type..."
    >
      <section className="saas-hero">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <Sparkles size={14} />
          Host Insights
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Welcome back, {landlordName}</h1>
        <p className="mt-2 text-sm text-indigo-50 sm:text-base">
          Your workspace is ready with live portfolio metrics, bookings, and revenue snapshots.
        </p>
      </section>

      {profile && !profile.profileCompleted ? (
        <section className="saas-panel mb-6 rounded-3xl border border-amber-200 bg-amber-50/90 p-6 text-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Complete your landlord profile</h2>
              <p className="mt-2 text-sm text-slate-700">
                Your account is approved, but your landlord profile is still incomplete. Finish the property details to begin listing and managing rentals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/complete-profile")}
              className="saas-button-primary mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold sm:mt-0"
            >
              Complete profile now
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Properties" value={summary.totalProperties} hint="All listed units" icon={Building2} trend="positive" />
        <StatCard label="Active Bookings" value={summary.activeBookings} hint="Paid bookings in progress" icon={CalendarCheck2} trend="positive" />
        <StatCard label="Total Tenants" value={summary.totalTenants} hint="Unique tenants across properties" icon={Building2} trend="positive" />
        <StatCard label="Total Earnings" value={formatCurrency(summary.totalEarnings)} hint="Collected rental income" icon={IndianRupee} trend="positive" />
        <StatCard label="Rent Due Rows" value={summary.pendingRequests} hint="Outstanding monthly rent cycles" icon={Clock3} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="saas-panel">
          <h3 className="saas-panel-title">Earnings Over Time</h3>
          <p className="saas-panel-subtitle mb-4">Monthly income trend from your bookings.</p>
          {earningsTrend.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No earnings data yet" description="Complete bookings to see earnings trend." />
          )}
        </article>

        <article className="saas-panel">
          <h3 className="saas-panel-title">Booking Activity</h3>
          <p className="saas-panel-subtitle mb-4">Monthly booking volume for your properties.</p>
          {bookingTrend.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No booking data yet" description="Bookings chart appears once payment records exist." />
          )}
        </article>
      </section>

      <section id="properties" className="saas-panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="saas-panel-title">My Properties</h3>
            <p className="saas-panel-subtitle">Manage listing status, pricing, and details.</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setFormData(initialFormState);
              document.getElementById("add-property")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="saas-button-primary inline-flex items-center gap-2"
          >
            <PlusSquare size={16} />
            Add Property
          </button>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredProperties.length === 0 ? (
          <EmptyState title="No properties yet" description="Add your first listing to start getting bookings." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredProperties.map((property) => {
              const propertyId = String(property.id || property._id);
              const propertyBookings = bookings.filter((booking) => String(booking.property?._id || "") === propertyId);
              const propertyPayments = paymentsData.filter((payment) => String(payment.property?._id || payment.propertyId || "") === propertyId);

              return (
                <div key={propertyId} className="space-y-4">
                  <LandlordPropertyCard
                    property={property}
                    onEdit={() => editProperty(property)}
                    onDelete={() => deleteProperty(propertyId)}
                  />

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Tenants</h4>
                        <div className="mt-3 space-y-3">
                          {propertyBookings.length ? propertyBookings.map((booking) => (
                            <div key={booking.id || booking._id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">{booking.tenantName || "Tenant"}</p>
                                <StatusBadge status={booking.bookingStatus} />
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                Lease: {booking.startDate.toLocaleDateString("en-IN")} - {booking.endDate.toLocaleDateString("en-IN")}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Next due: {booking.nextPaymentDate ? booking.nextPaymentDate.toLocaleDateString("en-IN") : "-"}
                              </p>
                            </div>
                          )) : (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">No tenant is assigned yet.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Monthly Rent Status</h4>
                        <div className="mt-3 space-y-3">
                          {propertyPayments.length ? propertyPayments.slice(0, 4).map((payment) => (
                            <div key={payment._id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">{payment.tenantName || "Tenant"}</p>
                                <StatusBadge status={payment.status || "pending"} />
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                Billing: {payment.billingPeriodStart ? new Date(payment.billingPeriodStart).toLocaleDateString("en-IN") : "-"} - {payment.billingPeriodEnd ? new Date(payment.billingPeriodEnd).toLocaleDateString("en-IN") : "-"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Paid on: {payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"} | Next due: {payment.nextPaymentDate ? new Date(payment.nextPaymentDate).toLocaleDateString("en-IN") : "-"}
                              </p>
                            </div>
                          )) : (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">No monthly payment history yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
        {feedback.message && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {feedback.message}
          </p>
        )}
      </section>

      <section id="add-property" className="saas-panel">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="saas-panel-title">{editingId ? "Edit Property" : "Add Property"}</h3>
            <p className="saas-panel-subtitle">Create a clean listing with complete details and media.</p>
          </div>
          <button onClick={() => setShowAddForm((prev) => !prev)} className="saas-button-secondary">
            {showAddForm ? "Hide Form" : "Show Form"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmitProperty} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Title</label>
              <input
                className="saas-control w-full"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="2BHK Luxury Apartment"
              />
              {formErrors.title && <p className="mt-1 text-xs text-rose-600">{formErrors.title}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Type</label>
              <input
                className="saas-control w-full"
                value={formData.type}
                onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value }))}
                placeholder="2BHK / 3BHK"
              />
              {formErrors.type && <p className="mt-1 text-xs text-rose-600">{formErrors.type}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Price</label>
              <input
                type="number"
                className="saas-control w-full"
                value={formData.price}
                onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="12000"
              />
              {formErrors.price && <p className="mt-1 text-xs text-rose-600">{formErrors.price}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Location</label>
              <input
                className="saas-control w-full"
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Bangalore"
              />
              {formErrors.location && <p className="mt-1 text-xs text-rose-600">{formErrors.location}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Description / Facilities
              </label>
              <textarea
                rows={3}
                className="saas-control w-full p-2.5"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Parking, Lift, Security, Balcony"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Image URL</label>
              <input
                className="saas-control w-full"
                value={formData.image}
                onChange={(event) => setFormData((prev) => ({ ...prev, image: event.target.value }))}
                placeholder="https://..."
              />
              {formErrors.image && <p className="mt-1 text-xs text-rose-600">{formErrors.image}</p>}
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="saas-button-primary">
                {editingId ? "Save Changes" : "Add Property"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData(initialFormState);
                  setFormErrors({});
                }}
                className="saas-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section id="bookings" className="saas-panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="saas-panel-title">Bookings</h3>
            <p className="saas-panel-subtitle">Track tenant stays, status, and rental timeline.</p>
          </div>
          <select className="saas-control w-full sm:w-auto" value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState title="No bookings found" description="Bookings will appear here as tenants pay rent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Property</th>
                  <th>Lease Dates</th>
                  <th>Next Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id || booking._id}>
                    <td className="font-medium text-slate-800">{booking.tenantName}</td>
                    <td className="text-slate-700">{booking.propertyName}</td>
                    <td className="text-slate-600">
                      {booking.startDate.toLocaleDateString("en-IN")} - {booking.endDate.toLocaleDateString("en-IN")}
                    </td>
                    <td className="text-slate-600">
                      {booking.nextPaymentDate ? booking.nextPaymentDate.toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="text-slate-700">{formatCurrency(booking.amount || booking.property?.price || 0)}</td>
                    <td>
                      <StatusBadge status={booking.bookingStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="earnings" className="saas-panel">
        <h3 className="saas-panel-title">Earnings & Payment History</h3>
        <p className="saas-panel-subtitle mb-4">Complete history of received rental payments.</p>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total Earnings</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalEarnings)}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Payment Count</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{earningsData.paymentHistory?.length || 0}</p>
          </article>
        </div>
        {loading ? (
          <LoadingState rows={6} />
        ) : (earningsData.paymentHistory?.length || 0) === 0 ? (
          <EmptyState title="No payment history" description="Payment records will appear once bookings are paid." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Tenant</th>
                  <th>Billing Cycle</th>
                  <th>Amount</th>
                  <th>Paid On</th>
                  <th>Next Due</th>
                  <th>Property</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(earningsData.paymentHistory || []).map((payment, index) => (
                  <tr key={payment.bookingId || index}>
                    <td className="font-medium text-slate-800">{payment.bookingId || `txn_${index + 1}`}</td>
                    <td className="text-slate-700">{payment.tenantName || "-"}</td>
                    <td className="text-slate-600">
                      {payment.billingPeriodStart ? (bookingDate(payment.billingPeriodStart) || new Date(payment.billingPeriodStart)).toLocaleDateString("en-IN") : "-"} - {payment.billingPeriodEnd ? (bookingDate(payment.billingPeriodEnd) || new Date(payment.billingPeriodEnd)).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                    <td className="text-slate-600">
                      {payment.date ? (bookingDate(payment.date) || new Date(payment.date)).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="text-slate-600">
                      {payment.nextPaymentDate ? (bookingDate(payment.nextPaymentDate) || new Date(payment.nextPaymentDate)).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="text-slate-700">{payment.propertyTitle || "-"}</td>
                    <td>
                      <StatusBadge status={payment.status || "pending"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </LandlordLayout>
  );
}

export default Dashboard;
