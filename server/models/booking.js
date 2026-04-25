const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    tenantName: { type: String, default: "" },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: Date.now },
    billingPeriodStart: { type: Date, default: Date.now },
    billingPeriodEnd: { type: Date, default: Date.now },
    nextPaymentDate: { type: Date, default: Date.now },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
