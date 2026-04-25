import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity, IndianRupee, Building2, Users } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatCard from "../components/admin/StatCard";
import StatusBadge from "../components/admin/StatusBadge";
import { getAllProperties, linkPropertyToLandlord, setPropertyStatus } from "../services/propertyBookingService";

const chartColors = ["#4f46e5", "#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const monthLabel = (dateValue) =>
  new Date(dateValue).toLocaleString("en-IN", { month: "short", year: "2-digit" });

function AdminDashboard() {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [queries, setQueries] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentSort, setPaymentSort] = useState("latest");
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [linkDrafts, setLinkDrafts] = useState({});

  const authConfig = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, bookingsRes, paymentsRes, propertiesRes, queriesRes] = await Promise.all([
          axios.get("/api/users"),
          axios.get("/api/admin/bookings", authConfig),
          axios.get("/api/admin/payments", authConfig),
          getAllProperties(),
          axios.get("/api/query")
        ]);

        setUsers(usersRes.data || []);
        setBookings(bookingsRes.data || []);
        setPayments(paymentsRes.data || []);
        setProperties(propertiesRes || []);
        setQueries(queriesRes.data || []);
      } catch (error) {
        console.error("Admin dashboard fetch failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authConfig]);

  useEffect(() => {
    const sectionMap = {
      "/admin/properties": "properties",
      "/admin/bookings": "bookings",
      "/admin/payments": "payments",
      "/admin/reports": "reports",
      "/admin/settings": "settings"
    };

    const targetId = sectionMap[location.pathname];
    if (!targetId) return;
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname]);

  const safePayments = useMemo(
    () =>
      [...payments].sort((a, b) => {
        if (paymentSort === "amount_high") return Number(b.amount || 0) - Number(a.amount || 0);
        if (paymentSort === "amount_low") return Number(a.amount || 0) - Number(b.amount || 0);
        return new Date(b.date || 0) - new Date(a.date || 0);
      }),
    [payments, paymentSort]
  );

  const filteredPayments = useMemo(() => {
    if (paymentFilter === "all") return safePayments;
    return safePayments.filter((item) => (item.status || "pending").toLowerCase() === paymentFilter);
  }, [safePayments, paymentFilter]);

  const filteredBookings = useMemo(() => {
    if (paymentFilter === "all") return bookings;
    return bookings.filter((item) => String(item.status || "pending").toLowerCase() === paymentFilter);
  }, [bookings, paymentFilter]);

  const visibleProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter((property) =>
      [property.title, property.location, property.type].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [properties, search]);

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const totalProperties = properties.length;
    const activeBookings = bookings.filter((booking) => ["active", "pending"].includes((booking.status || "").toLowerCase())).length;
    const revenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { totalUsers, totalProperties, activeBookings, revenue };
  }, [users, properties, bookings, payments]);

  const bookingsTrendData = useMemo(() => {
    const grouped = bookings.reduce((acc, booking) => {
      const label = monthLabel(booking.createdAt || booking.startDate || Date.now());
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([month, total]) => ({ month, total }));
  }, [bookings]);

  const revenueData = useMemo(() => {
    const grouped = payments.reduce((acc, payment) => {
      const label = monthLabel(payment.date || Date.now());
      acc[label] = (acc[label] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([month, amount]) => ({ month, amount }));
  }, [payments]);

  const propertyTypeData = useMemo(() => {
    const grouped = properties.reduce((acc, property) => {
      const type = property.type || "Other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const revenueHint = payments.length
    ? `Across ${payments.length} payment records`
    : "No payments have been recorded yet";
  const landlords = users.filter((user) => user.role === "landlord");
  const landlordNameMap = Object.fromEntries(
    landlords.map((landlord) => [String(landlord._id), landlord.name || landlord.email || "Landlord"])
  );

  const autoAssignUnlinked = async () => {
    if (!landlords.length) {
      setStatusMessage({ type: "error", message: "No landlords available to assign." });
      return;
    }

    const unlinked = properties.filter((property) => !property.landlordId);
    if (!unlinked.length) {
      setStatusMessage({ type: "success", message: "All properties are already linked." });
      return;
    }

    try {
      for (let i = 0; i < unlinked.length; i += 1) {
        const property = unlinked[i];
        const landlord = landlords[i % landlords.length];
        await linkPropertyToLandlord(property, landlord._id, landlord.name || landlord.email || "Landlord");
      }

      let assignIndex = 0;
      setProperties((prev) =>
        prev.map((property) => {
          if (property.landlordId) return property;
          const landlord = landlords[assignIndex % landlords.length];
          assignIndex += 1;
          return {
            ...property,
            landlordId: landlord._id,
            landlordName: landlord.name || landlord.email || "Landlord"
          };
        })
      );
      setStatusMessage({ type: "success", message: "Unlinked properties auto-assigned successfully." });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Unable to auto-assign unlinked properties." });
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`/api/admin/bookings/${bookingId}`, { status }, authConfig);
      setBookings((prev) =>
        prev.map((booking) =>
          String(booking._id) === String(bookingId) ? { ...booking, status } : booking
        )
      );
      setStatusMessage({ type: "success", message: "Booking updated." });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Unable to update booking." });
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
      await axios.delete(`/api/admin/bookings/${bookingId}`, authConfig);
      setBookings((prev) => prev.filter((booking) => String(booking._id) !== String(bookingId)));
      setStatusMessage({ type: "success", message: "Booking deleted." });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Unable to delete booking." });
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    try {
      await axios.put(`/api/admin/payments/${paymentId}`, { status }, authConfig);
      setPayments((prev) =>
        prev.map((payment) =>
          String(payment._id) === String(paymentId) ? { ...payment, status } : payment
        )
      );
      setStatusMessage({ type: "success", message: "Payment updated." });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Unable to update payment." });
    }
  };

  const deletePayment = async (paymentId) => {
    try {
      await axios.delete(`/api/admin/payments/${paymentId}`, authConfig);
      setPayments((prev) => prev.filter((payment) => String(payment._id) !== String(paymentId)));
      setStatusMessage({ type: "success", message: "Payment deleted." });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Unable to delete payment." });
    }
  };

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Track platform growth, approvals, and operational health."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by property title, location, or type..."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={metrics.totalUsers}
          hint={`${users.filter((u) => u.role === "landlord").length} landlords`}
          icon={Users}
          trend="positive"
        />
        <StatCard
          label="Total Properties"
          value={metrics.totalProperties}
          hint={`${propertyTypeData.length} property categories`}
          icon={Building2}
          trend="positive"
        />
        <StatCard label="Active Bookings" value={metrics.activeBookings} hint="Paid + Pending bookings" icon={Activity} />
        <StatCard label="Revenue" value={formatCurrency(metrics.revenue)} hint={revenueHint} icon={IndianRupee} trend="positive" />
      </section>

      <section id="reports" className="grid gap-4 xl:grid-cols-3">
        <article className="saas-panel xl:col-span-2">
          <h3 className="saas-panel-title">Bookings Trend</h3>
          <p className="saas-panel-subtitle mb-4">Monthly booking activity over time.</p>
          {bookingsTrendData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No booking trend yet" description="Booking trend will appear as payment records grow." />
          )}
        </article>

        <article className="saas-panel">
          <h3 className="saas-panel-title">Property Types</h3>
          <p className="saas-panel-subtitle mb-4">Distribution by listed property type.</p>
          {propertyTypeData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={propertyTypeData} dataKey="value" nameKey="name" outerRadius={95} innerRadius={60} paddingAngle={3}>
                    {propertyTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No properties yet" description="Add property listings to view mix by type." />
          )}
        </article>

        <article className="saas-panel xl:col-span-3">
          <h3 className="saas-panel-title">Revenue Overview</h3>
          <p className="saas-panel-subtitle mb-4">Monthly revenue from payment collection.</p>
          {revenueData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No revenue history yet" description="Revenue chart will appear when payments are available." />
          )}
        </article>
      </section>

      <section id="properties" className="saas-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="saas-panel-title">Property Management</h3>
            <p className="saas-panel-subtitle">Review listings and mark moderation decisions.</p>
          </div>
          <button onClick={autoAssignUnlinked} className="saas-button-secondary">
            Auto Assign Unlinked
          </button>
        </div>

        {loading ? (
          <LoadingState rows={5} />
        ) : visibleProperties.length === 0 ? (
          <EmptyState title="No property records found" description="Try another search keyword or wait for new listings." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => {
              const decision = property.status || "pending";
              return (
                <article
                  key={property.id || property._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-40 bg-slate-200">
                    {property.image ? (
                      <img src={property.image} alt={property.title || "Property"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-500">No image available</div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="line-clamp-1 text-sm font-semibold text-slate-900">{property.title || "Untitled property"}</h4>
                      <StatusBadge status={decision} />
                    </div>
                    <p className="line-clamp-1 text-sm text-slate-500">{property.location || "Location not provided"}</p>
                    <p className="text-xs text-slate-500">
                      Landlord:{" "}
                      <span className="font-semibold text-slate-700">
                        {property.landlordName ||
                          landlordNameMap[String(property.landlordId)] ||
                          (property.landlordId ? String(property.landlordId).slice(-10) : "Not linked")}
                      </span>
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">{property.type || "Other"}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(property.price)}</span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="saas-control w-full"
                        value={linkDrafts[String(property.id || property._id)] || ""}
                        onChange={(event) =>
                          setLinkDrafts((prev) => ({
                            ...prev,
                            [String(property.id || property._id)]: event.target.value
                          }))
                        }
                      >
                        <option value="">Select landlord</option>
                        {landlords.map((landlord) => (
                          <option key={landlord._id} value={landlord._id}>
                            {landlord.name} ({landlord.email})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          const propertyKey = String(property.id || property._id);
                          const selectedLandlord = linkDrafts[propertyKey];
                          if (!selectedLandlord) {
                            setStatusMessage({ type: "error", message: "Please select landlord before linking." });
                            return;
                          }
                          try {
                            const landlord = landlords.find((user) => String(user._id) === String(selectedLandlord));
                            await linkPropertyToLandlord(
                              property,
                              selectedLandlord,
                              landlord?.name || landlord?.email || "Landlord"
                            );
                            setProperties((prev) =>
                              prev.map((item) =>
                                String(item.id || item._id) === propertyKey
                                  ? {
                                      ...item,
                                      landlordId: selectedLandlord,
                                      landlordName: landlord?.name || landlord?.email || "Landlord"
                                    }
                                  : item
                              )
                            );
                            setStatusMessage({ type: "success", message: "Property linked to landlord successfully." });
                          } catch (error) {
                            console.error(error);
                            setStatusMessage({ type: "error", message: "Unable to link property to landlord." });
                          }
                        }}
                        className="saas-button-primary whitespace-nowrap px-3"
                      >
                        Link
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await setPropertyStatus(String(property.id || property._id), "approved");
                            setProperties((prev) =>
                              prev.map((item) =>
                                String(item.id || item._id) === String(property.id || property._id)
                                  ? { ...item, status: "approved" }
                                  : item
                              )
                            );
                            setStatusMessage({ type: "success", message: "Property approved." });
                          } catch (error) {
                            console.error(error);
                            setStatusMessage({ type: "error", message: "Unable to approve property." });
                          }
                        }}
                        className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await setPropertyStatus(String(property.id || property._id), "pending");
                            setProperties((prev) =>
                              prev.map((item) =>
                                String(item.id || item._id) === String(property.id || property._id)
                                  ? { ...item, status: "pending" }
                                  : item
                              )
                            );
                            setStatusMessage({ type: "success", message: "Property moved to pending." });
                          } catch (error) {
                            console.error(error);
                            setStatusMessage({ type: "error", message: "Unable to update property status." });
                          }
                        }}
                        className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                      >
                        Mark Pending
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {statusMessage.message && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${statusMessage.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {statusMessage.message}
          </p>
        )}
      </section>

      <section id="bookings" className="saas-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="saas-panel-title">All Bookings</h3>
            <p className="saas-panel-subtitle">Admin can review, update, and remove booking records.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="saas-control w-full sm:w-auto"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={paymentSort}
              onChange={(event) => setPaymentSort(event.target.value)}
              className="saas-control w-full sm:w-auto"
            >
              <option value="latest">Latest first</option>
              <option value="amount_high">Amount high to low</option>
              <option value="amount_low">Amount low to high</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState title="No bookings match this filter" description="Try another status filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Landlord</th>
                  <th>Property</th>
                  <th>Cycle</th>
                  <th>Amount</th>
                  <th>Next Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="font-medium text-slate-700">{booking.tenantName || booking.tenantId || "N/A"}</td>
                    <td className="text-slate-600">{booking.landlordName || booking.landlordId || "N/A"}</td>
                    <td className="text-slate-600">{booking.property?.title || "N/A"}</td>
                    <td className="text-slate-600">
                      {booking.billingPeriodStart ? new Date(booking.billingPeriodStart).toLocaleDateString("en-IN") : "-"} - {booking.billingPeriodEnd ? new Date(booking.billingPeriodEnd).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="font-semibold text-slate-900">{formatCurrency(booking.amount)}</td>
                    <td className="text-slate-600">
                      {booking.nextPaymentDate ? new Date(booking.nextPaymentDate).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td>
                      <StatusBadge status={booking.status || "pending"} />
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => updateBookingStatus(booking._id, "active")} className="saas-button-secondary px-2 py-1 text-xs">
                          Active
                        </button>
                        <button onClick={() => updateBookingStatus(booking._id, "cancelled")} className="saas-button-secondary px-2 py-1 text-xs">
                          Cancel
                        </button>
                        <button onClick={() => deleteBooking(booking._id)} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-rose-500">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="payments" className="saas-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="saas-panel-title">All Payments</h3>
            <p className="saas-panel-subtitle">Admin can monitor and control every payment record.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Paid Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {payments.filter((p) => (p.status || "").toLowerCase() === "paid").length}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Pending Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {payments.filter((p) => (p.status || "pending").toLowerCase() === "pending").length}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Open Support Queries</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {queries.filter((query) => (query.status || "").toLowerCase() !== "resolved").length}
              </p>
            </article>
          </div>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredPayments.length === 0 ? (
          <EmptyState title="No payments match this filter" description="Try another status or sort combination." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Landlord</th>
                  <th>Property</th>
                  <th>Billing Cycle</th>
                  <th>Amount</th>
                  <th>Paid On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="font-medium text-slate-700">{payment.tenantName || payment.tenantId || "N/A"}</td>
                    <td className="text-slate-600">{payment.landlordName || payment.landlordId || "N/A"}</td>
                    <td className="text-slate-600">{payment.property?.title || payment.propertyId || "N/A"}</td>
                    <td className="text-slate-600">
                      {payment.billingPeriodStart ? new Date(payment.billingPeriodStart).toLocaleDateString("en-IN") : "-"} - {payment.billingPeriodEnd ? new Date(payment.billingPeriodEnd).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                    <td className="text-slate-600">
                      {payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td>
                      <StatusBadge status={payment.status || "pending"} />
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => updatePaymentStatus(payment._id, "paid")} className="saas-button-secondary px-2 py-1 text-xs">
                          Mark Paid
                        </button>
                        <button onClick={() => updatePaymentStatus(payment._id, "pending")} className="saas-button-secondary px-2 py-1 text-xs">
                          Pending
                        </button>
                        <button onClick={() => deletePayment(payment._id)} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-rose-500">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="settings" className="saas-panel">
        <h3 className="saas-panel-title">Settings Snapshot</h3>
        <p className="saas-panel-subtitle">
          Admin settings section is ready for feature toggles, role policy controls, and notification preferences.
        </p>
      </section>
    </AdminLayout>
  );
}

export default AdminDashboard;
