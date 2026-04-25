import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2, MessageCircle, RefreshCcw } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";
import {
  appendRequestResponse,
  assignMaintenanceLandlord,
  subscribeAllRequests,
  updateMaintenanceStatus
} from "../services/maintenanceService";
import { getSessionUser } from "../utils/sessionUser";

const priorityClass = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-600 text-white"
};

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString("en-IN");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
};

function AdminMaintenance() {
  const [requests, setRequests] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [landlordIdInput, setLandlordIdInput] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const session = getSessionUser();

  useEffect(() => {
    const loadLandlords = async () => {
      try {
        const response = await axios.get("/api/users");
        const allUsers = response.data || [];
        setLandlords(allUsers.filter((user) => user.role === "landlord"));
      } catch (error) {
        console.error("Load landlords failed", error);
      }
    };

    loadLandlords();

    const unsub = subscribeAllRequests((docs) => {
      setRequests(docs);
      setSelectedId((prev) => prev || docs[0]?.id || "");
      setLoading(false);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const landlordMap = useMemo(
    () =>
      Object.fromEntries(
        landlords.map((landlord) => [String(landlord._id), landlord.name || landlord.email || "Landlord"])
      ),
    [landlords]
  );

  const selectedRequest = useMemo(() => requests.find((item) => item.id === selectedId) || null, [requests, selectedId]);

  useEffect(() => {
    setLandlordIdInput(selectedRequest?.landlordId || "");
  }, [selectedRequest]);

  const filteredRequests = useMemo(() => {
    const term = search.toLowerCase().trim();

    return requests.filter((request) => {
      const statusMatch = statusFilter === "all" ? true : request.status === statusFilter;
      const textMatch = term
        ? [
            request.ticketNumber,
            request.title,
            request.description,
            request.priority,
            request.status,
            request.tenantName,
            request.propertyTitle,
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

  const changeStatus = async (status) => {
    if (!selectedRequest) return;

    try {
      await updateMaintenanceStatus(selectedRequest.id, status);
      setFeedback({ type: "success", message: `Status updated to ${status}.` });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to update status." });
    }
  };

  const assignLandlord = async () => {
    if (!selectedRequest || !landlordIdInput.trim()) return;

    try {
      await assignMaintenanceLandlord(
        selectedRequest.id,
        landlordIdInput.trim(),
        landlordMap[landlordIdInput.trim()] || selectedRequest.landlordName || "Landlord"
      );
      setFeedback({ type: "success", message: "Landlord assigned successfully." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to assign landlord." });
    }
  };

  const sendMessage = async () => {
    if (!selectedRequest || !message.trim()) return;

    try {
      await appendRequestResponse(selectedRequest.id, {
        senderRole: "admin",
        senderId: session.id || "admin",
        senderName: "Admin",
        message: message.trim()
      });
      setMessage("");
      setFeedback({ type: "success", message: "Reply sent." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Unable to send reply." });
    }
  };

  return (
    <AdminLayout
      title="Maintenance Requests"
      subtitle="Monitor all tickets, step in when required, and keep tenant-to-landlord resolution moving."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search ticket, property, tenant, category, or status..."
    >
      <section className="saas-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex flex-wrap gap-2">
            {["all", "pending", "in-progress", "scheduled", "resolved"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === status ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button onClick={() => setFeedback({ type: "", message: "" })} className="saas-button-secondary inline-flex items-center gap-2">
            <RefreshCcw size={14} />
            Clear Message
          </button>
        </div>
        {feedback.message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {feedback.message}
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr,1.3fr]">
        <article className="saas-panel">
          <h3 className="saas-panel-title mb-4">All Requests</h3>
          {loading ? (
            <LoadingState rows={6} />
          ) : filteredRequests.length === 0 ? (
            <EmptyState title="No requests found" description="Try adjusting filters or search query." />
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((request) => (
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[request.priority] || priorityClass.low}`}>
                      {request.priority || "medium"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                      {request.category || "general"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(request.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="saas-panel">
          {!selectedRequest ? (
            <EmptyState title="Select a request" description="Choose a ticket to view details and manage status." />
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
                <p className="mt-1 text-sm text-slate-600">{selectedRequest.description}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tenant</p>
                  <p className="mt-1 font-medium text-slate-700">{selectedRequest.tenantName || "-"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.contactPhone || selectedRequest.tenantPhone || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Property</p>
                  <p className="mt-1 font-medium text-slate-700">{selectedRequest.propertyTitle || "-"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.propertyLocation || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Assigned Landlord</p>
                  <p className="mt-1 font-medium text-slate-700">
                    {selectedRequest.landlordName || landlordMap[selectedRequest.landlordId] || selectedRequest.landlordId || "-"}
                  </p>
                  <p className="text-xs text-slate-500">{selectedRequest.landlordId || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Issue Details</p>
                  <p className="mt-1 font-medium capitalize text-slate-700">{selectedRequest.category || "-"}</p>
                  <p className="text-xs text-slate-500">{selectedRequest.issueLocation || "-"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {["pending", "in-progress", "scheduled", "resolved"].map((status) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(status)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                      selectedRequest.status === status ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <select className="saas-control flex-1" value={landlordIdInput} onChange={(event) => setLandlordIdInput(event.target.value)}>
                  <option value="">Assign landlord...</option>
                  {landlords.map((landlord) => (
                    <option key={landlord._id} value={landlord._id}>
                      {landlord.name || landlord.email || "Landlord"}
                    </option>
                  ))}
                </select>
                <button onClick={assignLandlord} className="saas-button-primary">
                  Assign
                </button>
              </div>

              {(selectedRequest.scheduledFor || selectedRequest.scheduledNote || selectedRequest.resolutionNote) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Scheduled Visit</p>
                    <p className="mt-1 font-medium text-slate-700">{selectedRequest.scheduledFor ? formatDate(selectedRequest.scheduledFor) : "-"}</p>
                    <p className="text-xs text-slate-500">{selectedRequest.scheduledNote || "No visit note added yet."}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Resolution Note</p>
                    <p className="mt-1 text-slate-700">{selectedRequest.resolutionNote || "Not resolved yet."}</p>
                  </div>
                </div>
              )}

              <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {(selectedRequest.responses || []).map((response, index) => (
                  <div key={`${response.senderRole}-${index}`} className="rounded-lg bg-white px-3 py-2 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {response.senderName || response.senderRole}
                    </p>
                    <p className="mt-1 text-slate-700">{response.message}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatDate(response.timestamp)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  rows={2}
                  className="saas-control w-full p-2.5"
                  placeholder="Send update to tenant or landlord..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button onClick={sendMessage} className="saas-button-primary inline-flex items-center gap-2">
                  <MessageCircle size={16} />
                  Reply
                </button>
                {selectedRequest.status === "resolved" && (
                  <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    This request is resolved.
                  </p>
                )}
              </div>
            </div>
          )}
        </article>
      </section>
    </AdminLayout>
  );
}

export default AdminMaintenance;
