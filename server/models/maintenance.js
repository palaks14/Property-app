const mongoose = require("mongoose");

const maintenanceResponseSchema = new mongoose.Schema(
  {
    senderRole: { type: String, default: "system" },
    senderId: { type: String, default: "" },
    senderName: { type: String, default: "" },
    message: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const maintenanceSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, default: "", index: true },
    tenantId: { type: String, default: "", index: true },
    tenantName: { type: String, default: "" },
    tenantPhone: { type: String, default: "" },
    landlordId: { type: String, default: "", index: true },
    landlordName: { type: String, default: "" },
    propertyId: { type: String, default: "", index: true },
    propertyTitle: { type: String, default: "" },
    propertyLocation: { type: String, default: "" },
    unitLabel: { type: String, default: "" },
    category: { type: String, default: "general" },
    message: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    issueLocation: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    preferredVisitTime: { type: String, default: "" },
    preferredEntry: { type: String, default: "" },
    accessInstructions: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "in-progress", "scheduled", "resolved"],
      default: "pending"
    },
    assignedAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    scheduledNote: { type: String, default: "" },
    visitStatus: {
      type: String,
      enum: ["not-started", "scheduled", "on-the-way", "arrived", "completed", "delayed", "cancelled"],
      default: "not-started"
    },
    visitStatusUpdatedAt: { type: Date, default: null },
    reply: { type: String, default: "" },
    resolutionNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
    responses: { type: [maintenanceResponseSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Maintenance", maintenanceSchema);
