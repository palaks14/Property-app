import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, MessageCircle, PlusSquare, ShieldAlert, Wrench } from "lucide-react";
import TenantLayout from "../components/tenant/TenantLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";
import { getSessionUser } from "../utils/sessionUser";
import {
  appendRequestResponse,
  createMaintenanceRequest,
  subscribeTenantRequests
} from "../services/maintenanceService";
import { getAllProperties, getTenantBookings } from "../services/propertyBookingService";
import { getFullProfile } from "../services/profileService";

const priorityClass = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-600 text-white"
};

const categoryOptions = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliance", label: "Appliance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "pest-control", label: "Pest Control" },
  { value: "general", label: "General" }
];

const entryOptions = [
  { value: "call-before-visit", label: "Call before visit" },
  { value: "tenant-present", label: "Visit only when tenant is present" },
  { value: "security-desk", label: "Coordinate with security / caretaker" },
  { value: "spare-key", label: "Landlord can use spare key if needed" }
];

const visitStatusLabel = {
  "not-started": "Not Started",
  scheduled: "Scheduled",
  "on-the-way": "On The Way",
  arrived: "Arrived",
  completed: "Completed",
  delayed: "Delayed",
  cancelled: "Cancelled"
};

const visitTrackingSteps = ["scheduled", "on-the-way", "arrived", "completed"];

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString("en-IN");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
};

const initialForm = {
  propertyId: "",
  category: "general",
  title: "",
  description: "",
  issueLocation: "",
  priority: "medium",
  preferredVisitTime: "",
  preferredEntry: "call-before-visit",
  accessInstructions: "",
  contactPhone: ""
};

function TenantMaintenance() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);

  const session = getSessionUser();

  useEffect(() => {
    let unsub = null;

    if (!session.id) {
      setLoading(false);
      return undefined;
    }

    const init = async () => {
      try {
        setLoading(true);

        const [bookings, allProperties, tenantProfile] = await Promise.all([
          getTenantBookings(),
          getAllProperties(),
          getFullProfile(session.id)
        ]);

        const bookedPropertyIds = Array.from(
          new Set(
            (bookings || [])
              .map((booking) => String(booking.property?._id || booking.property?.id || ""))
              .filter(Boolean)
          )
        );

        const allowedProperties = (allProperties || []).filter((property) =>
          bookedPropertyIds.includes(String(property._id || property.id))
        );

        const visibleProperties = allowedProperties.length ? allowedProperties : allProperties || [];

        setProfile(tenantProfile);
        setProperties(visibleProperties);
        setForm((prev) => ({
          ...prev,
          propertyId: prev.propertyId || String(visibleProperties[0]?._id || visibleProperties[0]?.id || ""),
          contactPhone: prev.contactPhone || tenantProfile?.phone || ""
        }));

        unsub = subscribeTenantRequests(session.id, (docs) => {
          setRequests(docs);
          setSelectedId((prev) => prev || docs[0]?.id || "");
          setLoading(false);
        });
      } catch (error) {
        console.error("Tenant maintenance init failed", error);
        setStatus({ type: "error", message: "Unable to load maintenance requests right now." });
        setLoading(false);
      }
    };

    init();

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [session.id]);

  const selectedRequest = useMemo(() => requests.find((item) => item.id === selectedId) || null, [requests, selectedId]);

  const visibleRequests = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return requests;

    return requests.filter((request) =>
      [
        request.ticketNumber,
        request.title,
        request.description,
        request.status,
        request.priority,
        request.propertyTitle,
        request.category
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [requests, search]);

  const summary = useMemo(() => {
    const openCount = requests.filter((request) => ["pending", "in-progress", "scheduled"].includes(request.status)).length;
    const resolvedCount = requests.filter((request) => request.status === "resolved").length;
    const urgentCount = requests.filter((request) => request.priority === "urgent" || request.priority === "high").length;

    return {
      total: requests.length,
      open: openCount,
      resolved: resolvedCount,
      urgent: urgentCount
    };
  }, [requests]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitRequest = async () => {
    if (!form.propertyId || !form.title.trim() || !form.description.trim() || !form.issueLocation.trim()) {
      setStatus({
        type: "error",
        message: "Property, title, exact issue location, and description are required."
      });
      return;
    }

    const property = properties.find((item) => String(item._id || item.id) === String(form.propertyId));
    const landlordId = property?.landlordId ? String(property.landlordId) : "";

    if (!landlordId) {
      setStatus({ type: "error", message: "Selected property has no assigned landlord yet." });
      return;
    }

    try {
      await createMaintenanceRequest({
        tenantId: session.id,
        tenantName: profile?.name || "Tenant",
        tenantPhone: profile?.phone || form.contactPhone,
        landlordId,
        propertyId: String(property._id || property.id),
        propertyTitle: property.title || "Property",
        propertyLocation: property.location || "",
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        issueLocation: form.issueLocation.trim(),
        priority: form.priority,
        preferredVisitTime: form.preferredVisitTime.trim(),
        preferredEntry: form.preferredEntry,
        accessInstructions: form.accessInstructions.trim(),
        contactPhone: form.contactPhone.trim() || profile?.phone || ""
      });

      setForm((prev) => ({
        ...initialForm,
        propertyId: prev.propertyId,
        contactPhone: profile?.phone || prev.contactPhone || ""
      }));
      setStatus({ type: "success", message: "Maintenance request sent to your landlord." });
    } catch (error) {
      console.error("Create maintenance request failed", error);
      setStatus({ type: "error", message: "Unable to create maintenance request." });
    }
  };

  const sendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    try {
      await appendRequestResponse(selectedRequest.id, {
        senderRole: "tenant",
        senderId: session.id,
        senderName: profile?.name || "Tenant",
        message: replyMessage.trim()
      });
      setReplyMessage("");
      setStatus({ type: "success", message: "Message added to request thread." });
    } catch (error) {
      console.error("Tenant reply failed", error);
      setStatus({ type: "error", message: "Unable to send reply." });
    }
  };

  return (
    <TenantLayout
      title="Maintenance"
      subtitle="Raise detailed maintenance tickets and track landlord updates in real time."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by ticket, property, issue type, or status..."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Total Tickets</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </article>
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Open Requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.open}</p>
        </article>
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Resolved</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.resolved}</p>
        </article>
        <article className="saas-panel">
          <p className="text-sm text-slate-500">High Priority</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.urgent}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr,1.4fr]">
        <article className="saas-panel">
          <h3 className="saas-panel-title">Create Request</h3>
          <p className="saas-panel-subtitle mb-4">Share the exact issue so your landlord can act without back-and-forth.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Property</label>
              <select className="saas-control w-full" value={form.propertyId} onChange={(event) => updateForm("propertyId", event.target.value)}>
                {properties.map((property) => (
                  <option key={property._id || property.id} value={property._id || property.id}>
                    {property.title} - {property.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Issue Category</label>
              <select className="saas-control w-full" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Priority</label>
              <select className="saas-control w-full" value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Short Title</label>
              <input
                className="saas-control w-full"
                placeholder="Kitchen sink leaking continuously"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Exact Location</label>
              <input
                className="saas-control w-full"
                placeholder="Kitchen sink under cabinet / Master bedroom AC"
                value={form.issueLocation}
                onChange={(event) => updateForm("issueLocation", event.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Full Description</label>
              <textarea
                rows={4}
                className="saas-control w-full p-2.5"
                placeholder="Explain what happened, when it started, how serious it is, and whether anything is damaged."
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Preferred Visit Time</label>
              <input
                className="saas-control w-full"
                placeholder="After 6 PM on weekdays"
                value={form.preferredVisitTime}
                onChange={(event) => updateForm("preferredVisitTime", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Contact Phone</label>
              <input
                className="saas-control w-full"
                placeholder="Tenant phone number"
                value={form.contactPhone}
                onChange={(event) => updateForm("contactPhone", event.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Entry Preference</label>
              <select className="saas-control w-full" value={form.preferredEntry} onChange={(event) => updateForm("preferredEntry", event.target.value)}>
                {entryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Access Instructions</label>
              <textarea
                rows={3}
                className="saas-control w-full p-2.5"
                placeholder="Flat number, landmark, security gate instructions, pet caution, or spare key details."
                value={form.accessInstructions}
                onChange={(event) => updateForm("accessInstructions", event.target.value)}
              />
            </div>
          </div>

          <button onClick={submitRequest} className="saas-button-primary mt-4 inline-flex items-center gap-2">
            <PlusSquare size={16} />
            Submit Request
          </button>

          {status.message && (
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                status.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {status.message}
            </p>
          )}
        </article>

        <article className="saas-panel">
          <h3 className="saas-panel-title">My Requests</h3>
          <p className="saas-panel-subtitle mb-4">See ticket details, landlord responses, scheduled visits, and final resolution notes.</p>

          {loading ? (
            <LoadingState rows={6} />
          ) : visibleRequests.length === 0 ? (
            <EmptyState title="No maintenance requests yet" description="Create your first request to get started." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.95fr,1.45fr]">
              <div className="space-y-2">
                {visibleRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => setSelectedId(request.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedId === request.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{request.ticketNumber}</p>
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{request.title}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                      {request.propertyTitle || "Property"} • {request.category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[request.priority] || priorityClass.low}`}>
                        {request.priority || "medium"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(request.updatedAt || request.createdAt)}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {!selectedRequest ? (
                  <EmptyState title="Select a request" description="Choose a request to view full conversation." />
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{selectedRequest.ticketNumber}</p>
                          <p className="text-base font-semibold text-slate-900">{selectedRequest.title}</p>
                        </div>
                        <StatusBadge status={selectedRequest.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{selectedRequest.description}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Property</p>
                        <p className="mt-1 font-medium text-slate-800">{selectedRequest.propertyTitle || "-"}</p>
                        <p className="text-xs text-slate-500">{selectedRequest.propertyLocation || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Issue Type</p>
                        <p className="mt-1 font-medium capitalize text-slate-800">{selectedRequest.category || "-"}</p>
                        <p className="text-xs text-slate-500">{selectedRequest.issueLocation || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Preferred Visit</p>
                        <p className="mt-1 font-medium text-slate-800">{selectedRequest.preferredVisitTime || "Flexible"}</p>
                        <p className="text-xs text-slate-500">{selectedRequest.preferredEntry || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Contact</p>
                        <p className="mt-1 font-medium text-slate-800">{selectedRequest.contactPhone || selectedRequest.tenantPhone || "-"}</p>
                        <p className="text-xs text-slate-500">Created {formatDate(selectedRequest.createdAt)}</p>
                      </div>
                    </div>

                    {selectedRequest.accessInstructions && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Access Instructions</p>
                        <p className="mt-2">{selectedRequest.accessInstructions}</p>
                      </div>
                    )}

                    {(selectedRequest.scheduledFor || selectedRequest.scheduledNote) && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock3 size={16} />
                            <p className="font-semibold">Landlord Visit Plan</p>
                          </div>
                          <StatusBadge status={selectedRequest.visitStatus || "not-started"} />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-sky-100 bg-white/70 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Scheduled Visit</p>
                            <p className="mt-1 font-medium">
                              {selectedRequest.scheduledFor ? formatDate(selectedRequest.scheduledFor) : "Visit timing will be shared soon."}
                            </p>
                          </div>
                          <div className="rounded-xl border border-sky-100 bg-white/70 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Visit Note</p>
                            <p className="mt-1 font-medium text-sky-800">{selectedRequest.scheduledNote || "No visit note added yet."}</p>
                          </div>
                        </div>
                        <div className="mt-3 rounded-xl border border-sky-100 bg-white/70 p-3">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Live Visit Tracking</p>
                          <p className="mt-1 font-medium text-slate-900">
                            {visitStatusLabel[selectedRequest.visitStatus] || visitStatusLabel["not-started"]}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {selectedRequest.visitStatusUpdatedAt
                              ? `Last updated ${formatDate(selectedRequest.visitStatusUpdatedAt)}`
                              : "Your landlord will update the visit stage here."}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-4">
                            {visitTrackingSteps.map((step, index) => {
                              const currentIndex = visitTrackingSteps.indexOf(selectedRequest.visitStatus);
                              const isActive = selectedRequest.visitStatus === step;
                              const isCompleted = currentIndex >= index;

                              return (
                                <div
                                  key={step}
                                  className={`rounded-xl border px-3 py-2 text-center ${
                                    isActive
                                      ? "border-sky-300 bg-sky-100 text-sky-900"
                                      : isCompleted
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-slate-200 bg-white text-slate-500"
                                  }`}
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                                    Step {index + 1}
                                  </p>
                                  <p className="mt-1 text-xs font-medium">{visitStatusLabel[step]}</p>
                                </div>
                              );
                            })}
                          </div>
                          {selectedRequest.visitStatus === "delayed" && (
                            <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700">
                              The visit is delayed. Check the latest landlord note or message thread for the revised timing.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedRequest.resolutionNote && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <div className="flex items-center gap-2">
                          <Wrench size={16} />
                          <p className="font-semibold">Resolution Summary</p>
                        </div>
                        <p className="mt-2">{selectedRequest.resolutionNote}</p>
                        {selectedRequest.resolvedAt ? <p className="mt-1 text-xs text-emerald-700">Resolved on {formatDate(selectedRequest.resolvedAt)}</p> : null}
                      </div>
                    )}

                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                      {(selectedRequest.responses || []).map((response, index) => (
                        <div
                          key={`${response.senderRole}-${index}`}
                          className={`rounded-xl px-3 py-2 text-sm ${
                            response.senderRole === "tenant" ? "ml-8 bg-sky-100 text-sky-900" : "mr-8 bg-white text-slate-700"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {response.senderName
                              ? `${response.senderRole === "tenant" ? "Tenant" : "Landlord"} ${response.senderName}`
                              : response.senderRole === "tenant"
                                ? "Tenant"
                                : "Landlord"}
                          </p>
                          <p className="mt-1">{response.message}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDate(response.timestamp)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        className="saas-control w-full p-2.5"
                        placeholder="Add a follow-up message for your landlord..."
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                      />
                      <button onClick={sendReply} className="saas-button-primary inline-flex items-center gap-2">
                        <MessageCircle size={16} />
                        Send Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
      </section>

      {!session.id && (
        <section className="saas-panel">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle size={18} />
            <p className="text-sm font-medium">User session id is missing. Please login again to use maintenance requests.</p>
          </div>
        </section>
      )}

      {!loading && properties.length === 0 && session.id && (
        <section className="saas-panel">
          <div className="flex items-start gap-3 text-slate-700">
            <ShieldAlert size={18} className="mt-0.5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">No rentable property linked yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Maintenance requests are usually raised against an active rented property. Once a booking exists, it will appear in the property selector here.
              </p>
            </div>
          </div>
        </section>
      )}
    </TenantLayout>
  );
}

export default TenantMaintenance;
