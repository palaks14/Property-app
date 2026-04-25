import axios from "axios";

function authHeaderConfig() {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

const toDateLike = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeResponse = (response = {}) => ({
  senderRole: response.senderRole || "system",
  senderId: response.senderId || "",
  senderName: response.senderName || "",
  message: response.message || "",
  timestamp: response.timestamp || null
});

const normalizeTicket = (ticket = {}) => ({
  ...ticket,
  id: ticket.id || ticket._id || "",
  _id: ticket._id || ticket.id || "",
  ticketNumber: ticket.ticketNumber || "",
  tenantId: ticket.tenantId || "",
  tenantName: ticket.tenantName || "Tenant",
  tenantPhone: ticket.tenantPhone || ticket.contactPhone || "",
  landlordId: ticket.landlordId || "",
  landlordName: ticket.landlordName || "Landlord",
  propertyId: ticket.propertyId || "",
  propertyTitle: ticket.propertyTitle || "",
  propertyLocation: ticket.propertyLocation || "",
  unitLabel: ticket.unitLabel || "",
  category: ticket.category || "general",
  title: ticket.title || "Maintenance request",
  description: ticket.description || ticket.message || "",
  issueLocation: ticket.issueLocation || "",
  priority: ticket.priority || "medium",
  preferredVisitTime: ticket.preferredVisitTime || "",
  preferredEntry: ticket.preferredEntry || "",
  accessInstructions: ticket.accessInstructions || "",
  contactPhone: ticket.contactPhone || ticket.tenantPhone || "",
  status: ticket.status || "pending",
  assignedAt: ticket.assignedAt || null,
  scheduledFor: ticket.scheduledFor || null,
  scheduledNote: ticket.scheduledNote || "",
  visitStatus: ticket.visitStatus || (ticket.scheduledFor ? "scheduled" : "not-started"),
  visitStatusUpdatedAt: ticket.visitStatusUpdatedAt || null,
  resolutionNote: ticket.resolutionNote || "",
  resolvedAt: ticket.resolvedAt || null,
  responses: Array.isArray(ticket.responses) ? ticket.responses.map(normalizeResponse) : [],
  createdAt: ticket.createdAt || null,
  updatedAt: ticket.updatedAt || ticket.createdAt || null
});

const sortByUpdatedDesc = (tickets) =>
  [...tickets].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

async function fetchMaintenanceTickets() {
  const response = await axios.get("/api/maintenance", authHeaderConfig());
  return sortByUpdatedDesc((response.data || []).map(normalizeTicket));
}

function createPollingSubscription(fetcher, callback, intervalMs = 7000) {
  let active = true;
  let timerId = null;

  const run = async () => {
    try {
      const data = await fetcher();
      if (active) callback(data);
    } catch (error) {
      if (active) callback([]);
      console.error("Maintenance subscription polling failed", error);
    }
  };

  run();
  timerId = window.setInterval(run, intervalMs);

  return () => {
    active = false;
    if (timerId) window.clearInterval(timerId);
  };
}

export async function createMaintenanceRequest(payload) {
  const response = await axios.post(
    "/api/maintenance",
    {
      tenantName: payload.tenantName,
      tenantPhone: payload.tenantPhone,
      landlordId: payload.landlordId,
      landlordName: payload.landlordName,
      propertyId: payload.propertyId,
      propertyTitle: payload.propertyTitle,
      propertyLocation: payload.propertyLocation,
      unitLabel: payload.unitLabel,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      issueLocation: payload.issueLocation,
      priority: payload.priority,
      preferredVisitTime: payload.preferredVisitTime,
      preferredEntry: payload.preferredEntry,
      accessInstructions: payload.accessInstructions,
      contactPhone: payload.contactPhone
    },
    authHeaderConfig()
  );

  return normalizeTicket(response.data || {});
}

export function subscribeTenantRequests(_tenantId, callback) {
  return createPollingSubscription(fetchMaintenanceTickets, callback);
}

export function subscribeLandlordRequests(_landlordId, callback) {
  return createPollingSubscription(fetchMaintenanceTickets, callback);
}

export function subscribeAllRequests(callback) {
  return createPollingSubscription(fetchMaintenanceTickets, callback);
}

export async function getTenantRequests(_tenantId) {
  return fetchMaintenanceTickets();
}

export async function appendRequestResponse(requestId, input) {
  const response = await axios.put(
    `/api/maintenance/${requestId}/reply`,
    {
      senderRole: input.senderRole,
      senderName: input.senderName,
      message: input.message
    },
    authHeaderConfig()
  );

  return normalizeTicket(response.data || {});
}

export async function updateMaintenanceStatus(requestId, status, extras = {}) {
  const response = await axios.put(
    `/api/maintenance/${requestId}/status`,
    {
      status,
      scheduledFor: toDateLike(extras.scheduledFor),
      scheduledNote: extras.scheduledNote,
      visitStatus: extras.visitStatus,
      resolutionNote: extras.resolutionNote
    },
    authHeaderConfig()
  );

  return normalizeTicket(response.data || {});
}

export async function updateMaintenanceRequest(requestId, patch = {}) {
  const response = await axios.put(`/api/maintenance/${requestId}`, patch, authHeaderConfig());
  return normalizeTicket(response.data || {});
}

export async function assignMaintenanceLandlord(requestId, landlordId, landlordName = "") {
  const response = await axios.put(
    `/api/maintenance/${requestId}/assign`,
    { landlordId, landlordName },
    authHeaderConfig()
  );

  return normalizeTicket(response.data || {});
}
