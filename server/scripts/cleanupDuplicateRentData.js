require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Payment = require("../models/payment");
const Booking = require("../models/booking");

function monthlyKey(tenantId, propertyId, billingPeriodStart) {
  const start = billingPeriodStart ? new Date(billingPeriodStart) : new Date();
  return [
    String(tenantId || "").trim(),
    String(propertyId || "").trim(),
    start.getFullYear(),
    start.getMonth()
  ].join("|");
}

function choosePreferredRecord(records) {
  return [...records].sort((left, right) => {
    const leftPaid = String(left.status || "").toLowerCase() === "paid" ? 1 : 0;
    const rightPaid = String(right.status || "").toLowerCase() === "paid" ? 1 : 0;
    if (leftPaid !== rightPaid) return rightPaid - leftPaid;

    const leftGateway = String(left.razorpayPaymentId || "").trim() ? 1 : 0;
    const rightGateway = String(right.razorpayPaymentId || "").trim() ? 1 : 0;
    if (leftGateway !== rightGateway) return rightGateway - leftGateway;

    const leftDate = new Date(left.date || left.createdAt || 0).getTime();
    const rightDate = new Date(right.date || right.createdAt || 0).getTime();
    if (leftDate !== rightDate) return rightDate - leftDate;

    return String(right._id).localeCompare(String(left._id));
  })[0];
}

async function cleanupPayments() {
  const payments = await Payment.find({}).sort({ date: -1, _id: -1 });
  const groups = new Map();

  for (const payment of payments) {
    const key = monthlyKey(payment.tenantId, payment.propertyId, payment.billingPeriodStart || payment.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(payment);
  }

  const idsToDelete = [];
  let duplicateGroups = 0;

  for (const [, records] of groups) {
    if (records.length <= 1) continue;
    duplicateGroups += 1;
    const keeper = choosePreferredRecord(records);
    for (const record of records) {
      if (String(record._id) !== String(keeper._id)) {
        idsToDelete.push(record._id);
      }
    }
  }

  if (idsToDelete.length) {
    await Payment.deleteMany({ _id: { $in: idsToDelete } });
  }

  return {
    duplicateGroups,
    deletedPayments: idsToDelete.length
  };
}

async function cleanupBookings() {
  const bookings = await Booking.find({}).sort({ createdAt: -1, _id: -1 });
  const groups = new Map();

  for (const booking of bookings) {
    const key = monthlyKey(booking.tenantId, booking.propertyId, booking.billingPeriodStart || booking.startDate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(booking);
  }

  const idsToDelete = [];
  let duplicateGroups = 0;

  for (const [, records] of groups) {
    if (records.length <= 1) continue;
    duplicateGroups += 1;
    const keeper = choosePreferredRecord(records);
    for (const record of records) {
      if (String(record._id) !== String(keeper._id)) {
        idsToDelete.push(record._id);
      }
    }
  }

  if (idsToDelete.length) {
    await Booking.deleteMany({ _id: { $in: idsToDelete } });
  }

  return {
    duplicateGroups,
    deletedBookings: idsToDelete.length
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const paymentResult = await cleanupPayments();
    const bookingResult = await cleanupBookings();

    console.log(JSON.stringify({ paymentResult, bookingResult }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
