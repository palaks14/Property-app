const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    password: { type: String, default: "" },
    role: { type: String, default: "tenant" },
    isApproved: { type: Boolean, default: false },
    googleId: { type: String, default: "" },
    profilePic: { type: String, default: "" },
    preferredLocation: { type: String, default: "" },
    budget: { type: String, default: "" },
    propertyType: { type: String, default: "" },
    address: { type: String, default: "" },
    propertyName: { type: String, default: "" },
    propertyLocation: { type: String, default: "" },
    propertyImage: { type: String, default: "" },
    propertyPrice: { type: Number, default: 0 },
    propertyFacilities: { type: [String], default: [] },
    landlordProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
    landlordOnboardingDraft: { type: mongoose.Schema.Types.Mixed, default: {} },
    onboardingStep: { type: Number, default: 1 },
    profileCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
