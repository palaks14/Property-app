import axios from "axios";
import { auth } from "../firebase";
import { getSessionUser } from "../utils/sessionUser";

export function getCurrentAuthUserId() {
  const sessionUser = getSessionUser();
  if (sessionUser?.id) {
    return sessionUser.id;
  }

  const authId = auth.currentUser?.uid;
  if (authId) {
    return authId;
  }

  return "";
}

function authHeaderConfig() {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

const normalizeProperty = (property) => ({
  ...property,
  id: property.id || property._id || "",
  _id: property._id || property.id || "",
  images: property.images || (property.image ? [property.image] : []),
  image: property.image || (property.images?.[0] || ""),
  propertyType: property.propertyType || property.type || "",
  type: property.type || property.propertyType || "",
  facilities: property.facilities || property.amenities || [],
  amenities: property.amenities || property.facilities || [],
  landlordName: property.landlordName || "",
  assignedTenantId: property.assignedTenantId || "",
  assignedTenantName: property.assignedTenantName || "",
  assignedAt: property.assignedAt || null,
  status: property.status || "pending"
});

const normalizeBooking = (booking) => ({
  ...booking,
  id: booking.id || booking._id || "",
  _id: booking._id || booking.id || "",
  property: booking.property ? normalizeProperty(booking.property) : null
});

export async function getLandlordProperties() {
  const response = await axios.get("/api/properties/landlord", authHeaderConfig());
  return (response.data || []).map(normalizeProperty);
}

export async function getAllProperties() {
  const response = await axios.get("/api/properties");
  return (response.data || []).map(normalizeProperty);
}

export async function getApprovedProperties() {
  const response = await axios.get("/api/properties?status=approved");
  return (response.data || []).map(normalizeProperty);
}

export async function getPropertyById(propertyId) {
  const response = await axios.get(`/api/properties/${propertyId}`);
  return normalizeProperty(response.data || {});
}

export async function addLandlordProperty(payload) {
  const basePayload = {
    title: payload.title,
    description: payload.description || "",
    price: Number(payload.price || 0),
    location: payload.location,
    type: payload.type || payload.propertyType || "",
    image: payload.image || (payload.images?.[0] || ""),
    images: payload.images || (payload.image ? [payload.image] : []),
    facilities: payload.facilities || payload.amenities || [],
    status: payload.status || "approved"
  };

  try {
    const response = await axios.post("/api/properties", basePayload, authHeaderConfig());
    return normalizeProperty(response.data || {});
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      const landlordId = getCurrentAuthUserId();
      const response = await axios.post("/api/property", { ...basePayload, landlordId }, { headers: { "Content-Type": "application/json" } });
      return normalizeProperty(response.data || {});
    }
    throw error;
  }
}

export async function updatePropertyById(propertyId, updatePayload) {
  const response = await axios.put(`/api/properties/${propertyId}`, updatePayload, authHeaderConfig());
  return normalizeProperty(response.data || {});
}

export async function deletePropertyById(propertyId) {
  await axios.delete(`/api/properties/${propertyId}`, authHeaderConfig());
}

export async function setPropertyStatus(propertyId, status) {
  const response = await axios.put(`/api/properties/${propertyId}`, { status }, authHeaderConfig());
  return normalizeProperty(response.data || {});
}

export async function linkPropertyToLandlord(property, landlordId) {
  const propertyId = String(property.id || property._id);
  const response = await axios.put(
    `/api/properties/${propertyId}`,
    { landlordId },
    authHeaderConfig()
  );
  return normalizeProperty(response.data || {});
}

export async function createBookingForProperty({ propertyId, tenantId, startDate, endDate }) {
  const property = await getPropertyById(propertyId);
  if (!property || !property._id) {
    throw new Error("Property not found");
  }
  const response = await axios.post(
    "/api/payment",
    {
      propertyId: property._id,
      tenantId,
      tenantName: "",
      amount: Number(property.price || 0),
      status: "paid",
      date: startDate || new Date().toISOString()
    },
    authHeaderConfig()
  );
  return response.data;
}

export async function createRentPaymentRecord({
  propertyId,
  tenantId,
  tenantName,
  amount,
  date,
  status = "paid",
  razorpayOrderId = "",
  razorpayPaymentId = "",
  razorpaySignature = ""
}) {
  const property = await getPropertyById(propertyId);
  if (!property || !property._id) {
    throw new Error("Property not found");
  }

  const response = await axios.post(
    "/api/payment",
    {
      propertyId: property._id,
      tenantId,
      tenantName: tenantName || "",
      amount: Number(amount || property.price || 0),
      status,
      date: date || new Date().toISOString(),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    },
    authHeaderConfig()
  );

  return response.data;
}

export async function getTenantBookings() {
  const response = await axios.get("/api/bookings/tenant", authHeaderConfig());
  return (response.data || []).map(normalizeBooking);
}

export async function getLandlordBookings() {
  const response = await axios.get("/api/bookings/landlord", authHeaderConfig());
  return (response.data || []).map(normalizeBooking);
}

export async function getLandlordPayments() {
  const response = await axios.get("/api/payments/landlord", authHeaderConfig());
  return response.data || [];
}

export function bookingDate(value) {
  if (!value) return null;
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}
