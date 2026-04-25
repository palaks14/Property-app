const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  tenantId: String,
  propertyId: String,
  tenantName: { type: String, default: "" },
  amount: Number,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now },
  billingPeriodStart: { type: Date, default: Date.now },
  billingPeriodEnd: { type: Date, default: Date.now },
  nextPaymentDate: { type: Date, default: Date.now },
  razorpayOrderId: { type: String, default: undefined },
  razorpayPaymentId: { type: String, default: undefined },
  razorpaySignature: { type: String, default: undefined }
});

paymentSchema.index(
  { tenantId: 1, propertyId: 1, billingPeriodStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tenantId: { $exists: true, $type: "string", $ne: "" },
      propertyId: { $exists: true, $type: "string", $ne: "" },
      billingPeriodStart: { $exists: true }
    }
  }
);

paymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      razorpayPaymentId: { $exists: true, $type: "string", $ne: "" }
    }
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
