import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardCheck, MapPin, MessageCircle, TimerReset, Truck } from "lucide-react";
import LandlordLayout from "../components/landlord/LandlordLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";
import {
  appendRequestResponse,
  subscribeLandlordRequests,
  updateMaintenanceRequest,
  updateMaintenanceStatus
} from "../services/maintenanceService";
import { getSessionUser } from "../utils/sessionUser";

const priorityClass = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-600 text-white"
};

const visitStatusLabel = {
  "not-started": "Not Started",
  scheduled: "Scheduled",
  "on-the-way": "On The Way",
  arrived: "Arrived",
  completed: "Completed",
  delayed: "Delayed",
  cancelled: "Cancelled"
};

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString("en-IN");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
};

function LandlordMaintenance() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState({ scheduledFor: "", scheduledNote: "" });
  const [resolutionNote, setResolutionNote] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const session = getSessionUser();
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);

  useEffect(() => {
    if (!session.id) {
      setLoading(false);
      return undefined;
    }

    const unsub = subscribeLandlordRequests(session.id, (docs) => {
      setRequests(docs);
      setSelectedId((prev) => prev || docs[0]?.id || "");
      setLoading(false);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [session.id]);

  const selectedRequest = useMemo(() => requests.find((item) => item.id === selectedId) || null, [requests, selectedId]);

  useEffect(() => {
    if (!selectedRequest) {
      setScheduleDraft({ scheduledFor: "", scheduledNote: "" });
      setResolutionNote("");
      setIsEditingSchedule(false);
      setIsEditingResolution(false);
      return;
    }

    const scheduledDate = selectedRequest.scheduledFor
      ? new Date(
          typeof selectedRequest.scheduledFor?.toDate === "function"
            ? selectedRequest.scheduledFor.toDate()
            : selectedRequest.scheduledFor
        )
      : null;

    if (!isEditingSchedule) {
      setScheduleDraft({
        scheduledFor:
          scheduledDate && !Number.isNaN(scheduledDate.getTime())
            ? new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            : "",
        scheduledNote: selectedRequest.scheduledNote || ""
      });
    }

    if (!isEditingResolution) {
      setResolutionNote(selectedRequest.resolutionNote || "");
    }
  }, [selectedRequest, isEditingResolution, isEditingSchedule]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return requests.filter((request) => {
      const statusMatch = statusFilter === "all" ? true : request.status === statusFilter;
      const textMatch = term
        ? [
            request.ticketNumber,
            request.title,
            request.description,
            request.priority,
            request.propertyTitle,
            request.tenantName,
            request.category
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term)
          )
        : true;
      return statusMatch && textMatch;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const active = requests.filter((request) => ["in-progress", "scheduled"].includes(request.status)).length;
    const resolved = requests.filter((request) => request.status === "resolved").length;
    const urgent = requests.filter((request) => ["urgent", "high"].includes(request.priority)).length;

    return { pending, active, resolved, urgent };
  }, [requests]);

  const applyUpdatedRequest = (updatedRequest) => {
    if (!updatedRequest?.id) return;
    setRequests((prev) => {
      const nextRequests = prev.some((request) => request.id === updatedRequest.id)
        ? prev.map((request) => (request.id === updatedRequest.id ? updatedRequest : request))
        : [updatedRequest, ...prev];

      return [...nextRequests].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      );
    });
  };

  const setStatus = async (status, extra = {}) => {
    if (!selectedRequest) return;

    try {
      const updatedRequest = await updateMaintenanceStatus(selectedRequest.id, status, extra);
      applyUpdatedRequest(updatedRequest);
      setFeedback({ type: "success", message: `Request updated to ${status}.` });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to update request status." });
    }
  };

  const sendReply = async () => {
    if (!selectedRequest || !reply.trim()) return;

    try {
      const updatedRequest = await appendRequestResponse(selectedRequest.id, {
        senderRole: "landlord",
        senderId: session.id,
        senderName: selectedRequest.landlordName || "Landlord",
        message: reply.trim()
      });
      applyUpdatedRequest(updatedRequest);

      if (selectedRequest.status === "pending") {
        const statusUpdatedRequest = await updateMaintenanceStatus(selectedRequest.id, "in-progress");
        applyUpdatedRequest(statusUpdatedRequest);
      }

      setReply("");
      setFeedback({ type: "success", message: "Reply sent to tenant." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to send reply." });
    }
  };

  const saveSchedule = async () => {
    if (!selectedRequest) return;

    try {
      const scheduledDate = scheduleDraft.scheduledFor ? new Date(scheduleDraft.scheduledFor) : null;
      if (scheduleDraft.scheduledFor && (!scheduledDate || Number.isNaN(scheduledDate.getTime()))) {
        setFeedback({ type: "error", message: "Please choose a valid visit date and time." });
        return;
      }

      const scheduledValue = scheduledDate ? scheduledDate.toISOString() : "";
      const updatedRequest = await updateMaintenanceStatus(selectedRequest.id, scheduledValue ? "scheduled" : "in-progress", {
        scheduledFor: scheduledValue,
        scheduledNote: scheduleDraft.scheduledNote,
        visitStatus: scheduledValue ? "scheduled" : "not-started"
      });
      applyUpdatedRequest(updatedRequest);
      setIsEditingSchedule(false);
      setFeedback({ type: "success", message: scheduledValue ? "Visit scheduled for tenant." : "Visit details updated." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to save visit plan." });
    }
  };

  const saveResolution = async () => {
    if (!selectedRequest || !resolutionNote.trim()) {
      setFeedback({ type: "error", message: "Please add a resolution summary before closing the request." });
      return;
    }

    try {
      const updatedRequest = await updateMaintenanceStatus(selectedRequest.id, "resolved", { resolutionNote });
      applyUpdatedRequest(updatedRequest);
      setIsEditingResolution(false);
      setFeedback({ type: "success", message: "Request marked as resolved." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to resolve request." });
    }
  };

  const updateVisitTracking = async (visitStatus) => {
    if (!selectedRequest) return;

    try {
      const updatedRequest = await updateMaintenanceStatus(selectedRequest.id, selectedRequest.status, {
        scheduledFor: selectedRequest.scheduledFor,
        scheduledNote: selectedRequest.scheduledNote,
        visitStatus
      });
      applyUpdatedRequest(updatedRequest);
      setFeedback({ type: "success", message: `Visit tracking updated to ${visitStatusLabel[visitStatus] || visitStatus}.` });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to update visit tracking." });
    }
  };

  const reopenRequest = async () => {
    if (!selectedRequest) return;

    try {
      const resetRequest = await updateMaintenanceRequest(selectedRequest.id, { resolutionNote: "" });
      applyUpdatedRequest(resetRequest);
      const updatedRequest = await updateMaintenanceStatus(selectedRequest.id, "in-progress", {
        visitStatus: selectedRequest.scheduledFor ? "scheduled" : "not-started"
      });
      applyUpdatedRequest(updatedRequest);
      setFeedback({ type: "success", message: "Request reopened for follow-up work." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to reopen request." });
    }
  };

  return (
    <LandlordLayout
      title="Maintenance"
      subtitle="Review tenant issues, schedule visits, reply quickly, and close tickets with clear resolution notes."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search tickets, tenant names, properties, or categories..."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.pending}</p>
        </article>
        <article className="saas-panel">
          <p className="text-sm text-slate-500">Active Work</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.active}</p>
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

      <section className="saas-panel">
        <div className="inline-flex flex-wrap gap-2">
          {["all", "pending", "in-progress", "scheduled", "resolved"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                statusFilter === status ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        {feedback.message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {feedback.message}
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr,1.35fr]">
        <article className="saas-panel">
          <h3 className="saas-panel-title mb-4">Assigned Requests</h3>
          {loading ? (
            <LoadingState rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No assigned requests" description="Maintenance tickets assigned to you will appear here." />
          ) : (
            <div className="space-y-2">
              {filtered.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === request.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{request.ticketNumber}</p>
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{request.title}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {request.tenantName || "Tenant"} • {request.propertyTitle || "Property"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[request.priority] || priorityClass.low}`}>
                      {request.priority || "medium"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                      {request.category || "general"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="saas-panel">
          {!selectedRequest ? (
            <EmptyState title="Select a request" description="Choose a ticket to view details and respond." />
          ) : (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{selectedRequest.ticketNumber}</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedRequest.title}</p>
                  </div>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{selectedRequest.description}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tenant</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedRequest.tenantName || "-"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.contactPhone || selectedRequest.tenantPhone || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Property</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedRequest.propertyTitle || "-"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.propertyLocation || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Issue Type</p>
                  <p className="mt-1 font-medium capitalize text-slate-800">{selectedRequest.category || "general"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.issueLocation || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Requested Visit</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedRequest.preferredVisitTime || "Flexible"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.preferredEntry || "-"}</p>
                </div>
              </div>

              {selectedRequest.accessInstructions && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Access Instructions</p>
                  <p className="mt-2">{selectedRequest.accessInstructions}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStatus("in-progress")} className="saas-button-secondary">
                  Mark In Progress
                </button>
                <button onClick={() => setStatus("scheduled")} className="saas-button-secondary">
                  Mark Scheduled
                </button>
                {selectedRequest.status === "resolved" ? (
                  <button onClick={reopenRequest} className="saas-button-secondary">
                    Reopen Request
                  </button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-indigo-600" />
                  <p className="text-sm font-semibold text-slate-900">Visit Planning</p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Scheduled For</label>
                    <input
                      type="datetime-local"
                      className="saas-control w-full"
                      value={scheduleDraft.scheduledFor}
                      onChange={(event) => {
                        setIsEditingSchedule(true);
                        setScheduleDraft((prev) => ({ ...prev, scheduledFor: event.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Visit Note</label>
                    <input
                      className="saas-control w-full"
                      placeholder="Technician will visit with plumber at 5:30 PM"
                      value={scheduleDraft.scheduledNote}
                      onChange={(event) => {
                        setIsEditingSchedule(true);
                        setScheduleDraft((prev) => ({ ...prev, scheduledNote: event.target.value }));
                      }}
                    />
                  </div>
                </div>
                <button onClick={saveSchedule} className="saas-button-primary mt-3 inline-flex items-center gap-2">
                  <CalendarClock size={16} />
                  Save Visit Plan
                </button>
              </div>

              {(selectedRequest.scheduledFor || selectedRequest.scheduledNote) && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} className="text-sky-700" />
                      <p className="font-semibold">Saved Visit Plan</p>
                    </div>
                    <StatusBadge status={selectedRequest.visitStatus || "not-started"} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-sky-100 bg-white/70 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Scheduled Visit</p>
                      <p className="mt-1 font-medium">
                        {selectedRequest.scheduledFor ? formatDate(selectedRequest.scheduledFor) : "Visit timing will be shared soon."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-sky-100 bg-white/70 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Visit Note</p>
                      <p className="mt-1 font-medium">{selectedRequest.scheduledNote || "No visit note added yet."}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-sky-100 bg-white/70 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">Tenant Tracking</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {visitStatusLabel[selectedRequest.visitStatus] || visitStatusLabel["not-started"]}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedRequest.visitStatusUpdatedAt
                        ? `Last updated ${formatDate(selectedRequest.visitStatusUpdatedAt)}`
                        : "Use the controls below so the tenant can track the visit in real time."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => updateVisitTracking("scheduled")} className="saas-button-secondary inline-flex items-center gap-2">
                        <CalendarClock size={14} />
                        Scheduled
                      </button>
                      <button onClick={() => updateVisitTracking("on-the-way")} className="saas-button-secondary inline-flex items-center gap-2">
                        <Truck size={14} />
                        On The Way
                      </button>
                      <button onClick={() => updateVisitTracking("arrived")} className="saas-button-secondary inline-flex items-center gap-2">
                        <MapPin size={14} />
                        Arrived
                      </button>
                      <button onClick={() => updateVisitTracking("completed")} className="saas-button-secondary inline-flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Visit Done
                      </button>
                      <button onClick={() => updateVisitTracking("delayed")} className="saas-button-secondary inline-flex items-center gap-2">
                        <TimerReset size={14} />
                        Delayed
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {(selectedRequest.responses || []).map((response, index) => (
                  <div
                    key={`${response.senderRole}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      response.senderRole === "landlord" ? "ml-8 bg-indigo-100 text-indigo-900" : "mr-8 bg-white text-slate-700"
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
                  rows={3}
                  className="saas-control w-full p-2.5"
                  placeholder="Reply to tenant with update, estimate, or required access details..."
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <button onClick={sendReply} className="saas-button-primary inline-flex items-center gap-2">
                  <MessageCircle size={16} />
                  Send Reply
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-emerald-700" />
                  <p className="text-sm font-semibold text-emerald-900">Close Ticket</p>
                </div>
                <textarea
                  rows={3}
                  className="saas-control mt-3 w-full p-2.5"
                  placeholder="Describe what was fixed, what was replaced, and anything the tenant should know."
                  value={resolutionNote}
                  onChange={(event) => {
                    setIsEditingResolution(true);
                    setResolutionNote(event.target.value);
                  }}
                />
                <button
                  onClick={saveResolution}
                  className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500 active:scale-[0.98]"
                >
                  Mark Resolved
                </button>
                {selectedRequest.status === "resolved" && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    Request resolved on {formatDate(selectedRequest.resolvedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </article>
      </section>
    </LandlordLayout>
  );
}

export default LandlordMaintenance;
