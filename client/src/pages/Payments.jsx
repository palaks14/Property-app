import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CreditCard, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import TenantLayout from "../components/tenant/TenantLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";
import { getFullProfile } from "../services/profileService";
import {
  createRentPaymentRecord,
  getApprovedProperties,
  getCurrentAuthUserId,
  getTenantBookings
} from "../services/propertyBookingService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

function Payments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [profileName, setProfileName] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const selectedPropertyId = searchParams.get("propertyId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const fetchData = async () => {
    const tenantId = getCurrentAuthUserId();
    const token = localStorage.getItem("token");
    const authConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    try {
      setLoading(true);
      const [paymentResponse, propertyDocs, bookingDocs, profileDoc] = await Promise.all([
        axios.get("/api/payments", authConfig),
        getApprovedProperties(),
        tenantId ? getTenantBookings(tenantId) : Promise.resolve([]),
        tenantId ? getFullProfile(tenantId) : Promise.resolve(null)
      ]);

      setPayments(paymentResponse.data || []);
      setProperties(propertyDocs || []);
      setBookings(bookingDocs || []);
      setProfileName(profileDoc?.name || "");
    } catch (error) {
      console.error("Payments fetch failed", error);
      setStatus({ type: "error", message: "Unable to load payments right now." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tenantId = getCurrentAuthUserId();
  const tenantName = profileName || localStorage.getItem("tenant_name") || "Tenant";

  const tenantPayments = useMemo(
    () => payments.filter((item) => String(item.tenantId || "") === String(tenantId || "")),
    [payments, tenantId]
  );

  const bookingPropertyIds = useMemo(
    () =>
      Array.from(
        new Set(
          bookings
            .map((booking) => String(booking.property?._id || booking.property?.id || ""))
            .filter(Boolean)
        )
      ),
    [bookings]
  );

  const availableProperties = useMemo(() => {
    const bookingBackedProperties = properties.filter((property) =>
      bookingPropertyIds.includes(String(property._id || property.id))
    );

    if (bookingBackedProperties.length) {
      return bookingBackedProperties;
    }

    return properties;
  }, [bookingPropertyIds, properties]);

  const selectedProperty = useMemo(() => {
    if (selectedPropertyId) {
      return properties.find((item) => String(item._id || item.id) === String(selectedPropertyId)) || null;
    }

    if (availableProperties.length) {
      return availableProperties[0];
    }

    return null;
  }, [availableProperties, properties, selectedPropertyId]);

  const selectedBooking = useMemo(
    () =>
      bookings.find(
        (booking) =>
          String(booking.property?._id || booking.property?.id || "") ===
          String(selectedProperty?._id || selectedProperty?.id || "")
      ) || null,
    [bookings, selectedProperty]
  );

  const monthlyRentAmount = Number(selectedBooking?.amount || selectedProperty?.price || 0);
  const billingPeriodStart = selectedBooking?.billingPeriodStart || selectedBooking?.startDate || startDate || "";
  const billingPeriodEnd = selectedBooking?.billingPeriodEnd || selectedBooking?.endDate || endDate || "";
  const nextDueDate = selectedBooking?.nextPaymentDate || selectedBooking?.billingPeriodEnd || selectedBooking?.endDate || "";

  useEffect(() => {
    if (!selectedProperty && !availableProperties.length) {
      return;
    }

    const nextPropertyId = String(selectedProperty?._id || selectedProperty?.id || "");
    if (!nextPropertyId || nextPropertyId === selectedPropertyId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("propertyId", nextPropertyId);
    setSearchParams(nextParams, { replace: true });
  }, [availableProperties, searchParams, selectedProperty, selectedPropertyId, setSearchParams]);

  useEffect(() => {
    if (!selectedProperty && customAmount) {
      setCustomAmount("");
      return;
    }

    if (!selectedProperty) {
      return;
    }

    setCustomAmount(String(monthlyRentAmount || ""));
  }, [monthlyRentAmount, selectedProperty]);

  const filteredPayments = useMemo(() => {
    const propertyMap = Object.fromEntries(
      properties.map((property) => [String(property._id || property.id), property.title || "Property"])
    );
    const term = search.toLowerCase().trim();

    return tenantPayments.filter((item) => {
      const propertyName = propertyMap[String(item.propertyId || "")] || "";
      return term
        ? [item._id, item.tenantId, item.propertyId, item.status, propertyName].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term)
          )
        : true;
    });
  }, [payments, properties, search, tenantPayments]);

  const totalSpent = useMemo(
    () =>
      tenantPayments
        .filter((item) => String(item.status || "").toLowerCase() === "paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [tenantPayments]
  );

  const lastPaymentDate = useMemo(() => {
    if (!tenantPayments.length) {
      return null;
    }

    const sorted = [...tenantPayments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return sorted[0]?.date || null;
  }, [tenantPayments]);

  const handleSelectProperty = (propertyId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("propertyId", propertyId);
    setSearchParams(nextParams);
  };

  const payNow = async (amountToPay) => {
    if (!selectedProperty) {
      setStatus({ type: "error", message: "Please select a property before making a rent payment." });
      return;
    }

    if (!tenantId) {
      setStatus({ type: "error", message: "Please login again to continue." });
      return;
    }

    const amount = Number(amountToPay);
    if (!amount || amount <= 0) {
      setStatus({ type: "error", message: "Enter a valid amount." });
      return;
    }

    if (monthlyRentAmount > 0 && amount !== monthlyRentAmount) {
      setStatus({ type: "error", message: `Only one monthly rent cycle can be paid at a time: ${formatCurrency(monthlyRentAmount)}.` });
      return;
    }

    try {
      setPaying(true);
      setStatus({ type: "", message: "" });

      const response = await axios.post("/api/create-order", { amount });
      const orderData = response?.data || {};
      const razorpayKey = orderData?.key;
      if (!razorpayKey) {
        throw new Error("Missing Razorpay checkout key from server.");
      }

            const options = {
                key: razorpayKey,
                amount: response.data.amount,
                currency: "INR",
                order_id: orderData?.id || "",
                name: "RentApp",
                description: `Rent for ${selectedProperty.title || "Property"}`,
                handler: async (paymentResponse) => {
          try {
            const verificationPayload = {
              razorpay_order_id:
                paymentResponse?.razorpay_order_id ||
                paymentResponse?.razorpayOrderId ||
                orderData?.id ||
                "",
              razorpay_payment_id:
                paymentResponse?.razorpay_payment_id ||
                paymentResponse?.razorpayPaymentId ||
                "",
              razorpay_signature:
                paymentResponse?.razorpay_signature ||
                paymentResponse?.razorpaySignature ||
                ""
            };

                        const verifyResponse = await fetch("/api/verify-payment", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(verificationPayload)
                        });

                        if (!verifyResponse.ok) {
                            const verifyErrorData = await verifyResponse.json().catch(() => ({}));
                            const verifyError = new Error(
                                verifyErrorData?.message || "Payment verification failed"
                            );
                            verifyError.response = { data: verifyErrorData };
                            throw verifyError;
                        }
            await createRentPaymentRecord({
              propertyId: String(selectedProperty._id || selectedProperty.id),
              tenantId,
              tenantName,
              amount,
              date: new Date().toISOString(),
              status: "paid",
              razorpayOrderId: verificationPayload.razorpay_order_id,
              razorpayPaymentId: verificationPayload.razorpay_payment_id,
              razorpaySignature: verificationPayload.razorpay_signature
            });
            setStatus({ type: "success", message: "Rent paid successfully. Your booking and payment history have been updated." });
            await fetchData();
          } catch (error) {
            console.error("Payment verification failed", error);
            const rawResponseData = error?.response?.data;
            const backendMessage =
              (typeof rawResponseData === "string" && rawResponseData) ||
              error?.response?.data?.error ||
              error?.response?.data?.message ||
              "Payment was captured, but we could not save the rent record. Please contact support.";
            setStatus({ type: "error", message: backendMessage });
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: tenantName
        },
        notes: {
          propertyId: String(selectedProperty._id || selectedProperty.id),
          tenantId
        },
        theme: {
          color: "#0ea5e9"
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setStatus({ type: "error", message: "Payment window closed before completion." });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      setPaying(false);
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to start the payment right now.";
      setStatus({ type: "error", message: backendMessage });
    }
  };

  return (
    <TenantLayout
      title="Payments"
      subtitle="Review the selected home, pay rent securely, and track every transaction."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by transaction ID, property, or status..."
    >
      <section className="saas-hero overflow-hidden">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <Sparkles size={14} />
          Smart Checkout
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Pay rent in a modern, guided flow</h2>
            <p className="mt-2 max-w-2xl text-sm text-sky-50 sm:text-base">
              Choose a property, confirm the monthly amount, and complete your rent securely with Razorpay.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Selected Rent</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyRentAmount)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Transactions</p>
              <p className="mt-2 text-2xl font-semibold">{tenantPayments.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Next Due</p>
              <p className="mt-2 text-lg font-semibold">{nextDueDate ? new Date(nextDueDate).toLocaleDateString("en-IN") : lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString("en-IN") : "No payments yet"}</p>
            </div>
          </div>
        </div>
      </section>

      {status.message ? (
        <section className={`rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {status.message}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
        <article className="saas-panel">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="saas-panel-title">Choose Property</h3>
              <p className="saas-panel-subtitle">Pay rent for your active or selected rental listing.</p>
            </div>
            <button onClick={() => navigate("/tenant/browse")} className="saas-button-secondary">
              Browse Homes
            </button>
          </div>

          {loading ? (
            <LoadingState rows={4} />
          ) : availableProperties.length === 0 ? (
            <EmptyState title="No properties available yet" description="Choose a property from Browse Properties, then return here to pay rent." />
          ) : (
            <div className="grid gap-3">
              {availableProperties.map((property) => {
                const propertyId = String(property._id || property.id);
                const active = propertyId === String(selectedProperty?._id || selectedProperty?.id || "");
                return (
                  <button
                    key={propertyId}
                    onClick={() => handleSelectProperty(propertyId)}
                    className={`overflow-hidden rounded-[22px] border text-left transition-all duration-200 ${
                      active
                        ? "border-sky-300 bg-sky-50 shadow-sm ring-2 ring-sky-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid gap-0 md:grid-cols-[180px,1fr]">
                      <div className="h-full min-h-[150px] bg-slate-200">
                        {property.image ? (
                          <img src={property.image} alt={property.title || "Property"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{property.title || "Property"}</h4>
                            <p className="mt-1 text-sm text-slate-500">{property.location || "Location unavailable"}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm">
                            {property.propertyType || property.type || "Home"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Monthly Rent</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatCurrency(property.price)}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {active ? "Selected for checkout" : "Tap to select"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </article>

        <article className="saas-panel bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_45%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="saas-panel-title">Rent Checkout</h3>
              <p className="saas-panel-subtitle">A clean summary before you pay.</p>
            </div>
            <CreditCard className="text-sky-600" size={22} />
          </div>

          {selectedProperty ? (
            <>
              <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="h-44 bg-slate-200">
                  {selectedProperty.image ? (
                    <img src={selectedProperty.image} alt={selectedProperty.title || "Property"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-slate-500">No image available</div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Selected Property</p>
                    <h4 className="mt-1 text-xl font-semibold text-slate-900">{selectedProperty.title || "Property"}</h4>
                    <p className="mt-1 text-sm text-slate-500">{selectedProperty.location || "Location unavailable"}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Monthly Amount</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(monthlyRentAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Rent Type</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProperty.propertyType || selectedProperty.type || "Residential"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                        <CalendarDays size={14} />
                        Billing Period
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingPeriodStart ? new Date(billingPeriodStart).toLocaleDateString("en-IN") : "Starts on payment date"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {billingPeriodEnd ? `Ends on ${new Date(billingPeriodEnd).toLocaleDateString("en-IN")}` : "One monthly cycle only"}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Next payment due</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {nextDueDate ? new Date(nextDueDate).toLocaleDateString("en-IN") : "Calculated after payment"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                        <ShieldCheck size={14} />
                        Secure Payment
                      </p>
                      <p className="mt-2 text-sm text-slate-700">Checkout is handled through Razorpay and the rent record is saved after successful verification.</p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Amount to Pay</label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                      placeholder="Monthly rent"
                      className="saas-control w-full"
                    />
                    <p className="mt-2 text-xs text-slate-500">Only one month of rent can be paid in a single transaction.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-1">
                    {[monthlyRentAmount].filter((amount) => amount > 0).map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setCustomAmount(String(amount));
                          payNow(amount);
                        }}
                        disabled={paying}
                        className="saas-interactive-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Quick Pay</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(amount)}</p>
                      </button>
                    ))}
                  </div>

                  <button onClick={() => payNow(customAmount)} disabled={paying} className="saas-button-primary mt-2 inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-60">
                    <Landmark size={16} />
                    {paying ? "Opening payment..." : "Pay Rent Securely"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="Select a property" description="Choose a home on the left to enable rent checkout." />
          )}
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(totalSpent)}</p>
        </article>
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Payment Records</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{tenantPayments.length}</p>
        </article>
      </section>

      <section className="saas-panel">
        <h3 className="saas-panel-title">Payment History</h3>
        <p className="saas-panel-subtitle mb-4">Your recent rent transactions with linked property details.</p>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredPayments.length === 0 ? (
          <EmptyState title="No payments found" description="Your rent transactions will appear here after your first successful payment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Next Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const property = properties.find((item) => String(item._id || item.id) === String(payment.propertyId || ""));
                  return (
                    <tr key={payment._id}>
                      <td className="font-medium text-slate-700">{payment._id}</td>
                      <td>
                        <p className="font-semibold text-slate-900">{property?.title || "Property"}</p>
                        <p className="text-xs text-slate-500">{property?.location || payment.propertyId || "-"}</p>
                      </td>
                      <td className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="text-slate-600">
                        {payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="text-slate-600">
                        {payment.nextPaymentDate ? new Date(payment.nextPaymentDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td>
                        <StatusBadge status={payment.status || "pending"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TenantLayout>
  );
}

export default Payments;
