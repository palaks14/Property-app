const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, default: "" }, // 2BHK, 3BHK
    price: { type: Number, required: true },
    location: { type: String, required: true },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedTenantId: { type: String, default: "", index: true },
    assignedTenantName: { type: String, default: "" },
    assignedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", propertySchema);
