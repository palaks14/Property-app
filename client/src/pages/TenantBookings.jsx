import { useEffect, useMemo, useState } from "react";
import TenantLayout from "../components/tenant/TenantLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";
import { bookingDate, getCurrentAuthUserId, getTenantBookings } from "../services/propertyBookingService";

function TenantBookings() {
  const [bookingsData, setBookingsData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tenantId = getCurrentAuthUserId();
        if (!tenantId) {
          setStatusMessage({ type: "error", message: "Please login again to view your bookings." });
          setBookingsData([]);
          return;
        }
        const docs = await getTenantBookings(tenantId);
        setBookingsData(docs || []);
      } catch (error) {
        console.error("Tenant bookings fetch failed", error);
        setStatusMessage({ type: "error", message: "Unable to load bookings." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const bookings = useMemo(
    () =>
      bookingsData.map((booking) => {
        const bookingStatus = String(booking.status || "pending").toLowerCase();
        const start = bookingDate(booking.startDate || booking.createdAt) || new Date();
        const end = bookingDate(booking.endDate) || new Date(start.getTime() + 1000 * 60 * 60 * 24 * 30);
        return {
          ...booking,
          bookingStatus,
          propertyName: booking.property?.title || "Property",
          startDate: start,
          endDate: end
        };
      }),
    [bookingsData]
  );

  const filteredBookings = useMemo(() => {
    const term = search.toLowerCase().trim();
    return bookings.filter((booking) => {
      const textMatch = term
        ? [booking.propertyName, booking.propertyId, booking.tenantId].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term)
          )
        : true;
      const statusMatch = statusFilter === "all" ? true : booking.bookingStatus === statusFilter;
      return textMatch && statusMatch;
    });
  }, [bookings, search, statusFilter]);

  return (
    <TenantLayout
      title="My Bookings"
      subtitle="Track active and past bookings with quick actions."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by property, tenant ID, or booking ID..."
    >
      <section className="saas-panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="saas-panel-title">Booking List</h3>
          <select className="saas-control w-full sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState title="No bookings found" description="Bookings will appear here after payments are created." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Booking Dates</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id || booking._id}>
                    <td>
                      <p className="font-semibold text-slate-900">{booking.propertyName}</p>
                      <p className="text-xs text-slate-500">{booking.propertyId || "No property ID"}</p>
                    </td>
                    <td className="text-slate-600">
                      {booking.startDate.toLocaleDateString("en-IN")} - {booking.endDate.toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <StatusBadge status={booking.bookingStatus} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="saas-button-secondary px-2.5 py-1.5 text-xs">
                          View Details
                        </button>
                        {booking.bookingStatus === "active" && (
                          <button className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-rose-500 active:scale-[0.98]">
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {statusMessage.message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${statusMessage.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {statusMessage.message}
          </p>
        )}
      </section>
    </TenantLayout>
  );
}

export default TenantBookings;
