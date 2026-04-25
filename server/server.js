const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const axios = require("axios");
const { verifyToken, requireRole } = require("./middleware/auth");

// ✅ CREATE APP FIRST
const app = express();

app.use(express.json({ limit: "16mb" }));
app.use(cors({
  origin: "*"
}));

// Google client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// DB
function buildMongoConnectionUri(rawUri) {
  if (!rawUri || !rawUri.startsWith("mongodb+srv://")) {
    return rawUri;
  }

  const match = rawUri.match(
    /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(?:\?.*)?$/
  );

  if (!match) {
    return rawUri;
  }

  const [, username, password, host, dbPath = "/"] = match;

  if (host !== "cluster0.ofuqekr.mongodb.net") {
    return rawUri;
  }

  const hosts = [
    "ac-hfb2fu4-shard-00-00.ofuqekr.mongodb.net:27017",
    "ac-hfb2fu4-shard-00-01.ofuqekr.mongodb.net:27017",
    "ac-hfb2fu4-shard-00-02.ofuqekr.mongodb.net:27017",
  ].join(",");

  const query =
    "ssl=true&authSource=admin&replicaSet=atlas-14ehln-shard-0&retryWrites=true&w=majority";

  return `mongodb://${username}:${password}@${hosts}${dbPath}?${query}`;
}

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGO_DIRECT_URI || buildMongoConnectionUri(process.env.MONGO_URI);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected");
  } catch (err) {
    if (err?.code === "ECONNREFUSED" && err?.syscall === "querySrv") {
      console.error(
        "MongoDB SRV lookup failed. This is usually a DNS or network issue on the current machine. " +
          "Try switching networks, disabling VPN/proxy, or replacing mongodb+srv with a standard mongodb:// URI from Atlas."
      );
    }
    console.error(err);
    throw err;
  }
}

let databaseConnectionPromise = null;

function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!databaseConnectionPromise) {
    databaseConnectionPromise = connectToDatabase().catch((error) => {
      databaseConnectionPromise = null;
      throw error;
    });
  }

  return databaseConnectionPromise;
}

// Models
const User = require("./models/user");
const Property = require("./models/property");
const Payment = require("./models/payment");
const Maintenance = require("./models/maintenance");
const Booking = require("./models/booking");

// Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// ================= AUTH =================

// Register
app.post("/register", async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    propertyName,
    propertyLocation,
    propertyImage,
    price,
    facilities
  } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  const facilityList = Array.isArray(facilities)
    ? facilities.map((item) => String(item).trim()).filter(Boolean)
    : String(facilities || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const user = new User({
    name,
    email,
    phone,
    password: hashed,
    role,
    isApproved: role === "tenant",
    propertyName: propertyName || "",
    propertyLocation: propertyLocation || "",
    propertyImage: propertyImage || "",
    propertyPrice: Number(price) || 0,
    propertyFacilities: facilityList
  });

  await user.save();
  res.send("Registered");
});
// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  // 🚨 IMPORTANT CHECK
  if (user.role === "landlord" && !user.isApproved) {
    return res.status(403).send("Wait for admin approval");
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
});

// Firebase login (email/password + Google handled in Firebase client SDK)
app.post("/auth/firebase-login", async (req, res) => {
  try {
    const { idToken, name, phone, role, mode } = req.body;

    if (!idToken) {
      return res.status(400).send("Missing Firebase token");
    }

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
      { idToken }
    );

    const account = firebaseRes.data?.users?.[0];
    const emailFromProvider = (account?.providerUserInfo || []).find((p) => p?.email)?.email;
    const email = account?.email || emailFromProvider;

    if (!email) {
      return res
        .status(401)
        .send("No email was returned by Firebase for this account. For GitHub login, enable the email scope and ensure a verified email exists on GitHub.");
    }

    let user = await User.findOne({ email });
    const requestedRole = role === "landlord" ? "landlord" : "tenant";
    const isRegistration = mode === "register";

    // Auto-create a role-aware account for first-time Firebase logins.
    if (!user) {
      user = new User({
        name: name || email.split("@")[0],
        email,
        phone: phone || "",
        role: requestedRole,
        isApproved: requestedRole === "tenant"
      });
      await user.save();
    } else if (isRegistration) {
      return res.status(409).send("An account already exists with this email. Please login instead.");
    }

    if (user.role === "landlord" && !user.isApproved) {
      if (isRegistration) {
        return res.status(201).json({
          role: user.role,
          requiresApproval: true,
          message: "Landlord account created. Wait for admin approval before logging in."
        });
      }
      return res.status(403).send("Wait for admin approval");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error("Firebase auth error:", err.response?.data || err.message);
    const firebaseMessage = err.response?.data?.error?.message;
    res.status(401).send(firebaseMessage ? `Firebase authentication failed: ${firebaseMessage}` : "Firebase authentication failed");
  }
});

app.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -googleId").lean();
    if (!user) return res.status(404).json({ message: "Profile not found" });
    return res.json({ ...user, id: user._id });
  } catch (error) {
    console.error("GET /profile failed:", error);
    return res.status(500).json({ message: "Unable to load profile" });
  }
});

app.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -googleId").lean();
    if (!user) return res.status(404).json({ message: "Profile not found" });
    return res.json({ ...user, id: user._id });
  } catch (error) {
    console.error("GET /profile/:id failed:", error);
    return res.status(500).json({ message: "Unable to load profile" });
  }
});

app.put("/profile", verifyToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.email;
    delete updateData.role;
    delete updateData.password;
    delete updateData.googleId;
    updateData.profileCompleted = updateData.profileCompleted !== false;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    }).select("-password -googleId").lean();

    if (!user) return res.status(404).json({ message: "Profile not found" });
    return res.json(user);
  } catch (error) {
    console.error("PUT /profile failed:", error);
    return res.status(500).json({ message: "Unable to update profile" });
  }
});

app.post("/profile/photo", verifyToken, async (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ message: "Missing file upload payload" });
    }

    const normalizedFileName = String(fileName).trim();
    if (!normalizedFileName) {
      return res.status(400).json({ message: "Invalid file name" });
    }

    const matches = String(fileData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
      return res.status(400).json({ message: "Invalid image payload" });
    }

    const [, mimeType, base64Payload] = matches;
    const approxBytes = Math.floor((base64Payload.length * 3) / 4);
    if (approxBytes > 2 * 1024 * 1024) {
      return res.status(413).json({ message: "Profile image must be 2MB or smaller" });
    }

    const normalizedDataUrl = `data:${mimeType};base64,${base64Payload}`;
    await User.findByIdAndUpdate(req.user.id, { profilePic: normalizedDataUrl });
    return res.json({ url: normalizedDataUrl });
  } catch (error) {
    console.error("POST /profile/photo failed:", error);
    return res.status(500).json({ message: "Unable to upload profile photo" });
  }
});

// Google login
app.post("/login/google", async (req, res) => {
  const { tokenId } = req.body;

  const ticket = await googleClient.verifyIdToken({
    idToken: tokenId,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { sub, email, name } = payload;

  let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

  if (!user) {
    user = new User({
      name,
      email,
      googleId: sub,
      role: "tenant",
      isApproved: true
    });
    await user.save();
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
});

// ================= PROPERTY =================

app.post("/property", async (req, res) => {
  try {
    const { title, description, price, location, type, images, image, facilities, amenities, landlordId, status } = req.body;
    const normalizedImages = Array.isArray(images)
      ? images.filter(Boolean)
      : image
        ? [image]
        : [];

    const property = new Property({
      title: title || "Untitled property",
      description: description || "",
      price: Number(price || 0),
      location: location || "",
      type: type || "",
      image: image || normalizedImages[0] || "",
      images: normalizedImages,
      facilities: Array.isArray(facilities)
        ? facilities.filter(Boolean)
        : Array.isArray(amenities)
          ? amenities.filter(Boolean)
          : [],
      landlordId: landlordId || "",
      status: status || "approved"
    });

    await property.save();
    return res.status(201).json(property);
  } catch (error) {
    console.error("POST /property failed:", error);
    return res.status(500).json({ message: "Unable to add property" });
  }
});

// Landlord protected property APIs
app.post("/properties", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const { title, description, price, location, type, images, image, status } = req.body;

    if (!title || !location || !price) {
      return res.status(400).json({ message: "title, location and price are required" });
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter(Boolean)
      : image
        ? [image]
        : [];

    const property = await Property.create({
      title,
      description: description || "",
      price: Number(price),
      location,
      type: type || "",
      image: image || normalizedImages[0] || "",
      images: normalizedImages,
      landlordId: req.user.id,
      status: status || "pending"
    });

    return res.status(201).json(property);
  } catch (error) {
    console.error("POST /properties failed:", error);
    return res.status(500).json({ message: "Unable to add property" });
  }
});

app.get("/properties", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const data = await Property.find(filter).sort({ createdAt: -1 }).lean();
    const hydratedProperties = await hydratePropertiesWithLandlords(data);
    res.json(hydratedProperties);
  } catch (error) {
    console.error("GET /properties failed:", error);
    res.status(500).json({ message: "Unable to fetch properties" });
  }
});

app.get("/properties/landlord", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const data = await Property.find({ landlordId: req.user.id }).sort({ createdAt: -1 }).lean();
    const hydratedProperties = await hydratePropertiesWithAssignments(data);
    return res.json(hydratedProperties);
  } catch (error) {
    console.error("GET /properties/landlord failed:", error);
    return res.status(500).json({ message: "Unable to fetch landlord properties" });
  }
});

app.get("/properties/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) return res.status(404).json({ message: "Property not found" });
    const [hydratedProperty] = await hydratePropertiesWithLandlords([property]);
    return res.json(hydratedProperty);
  } catch (error) {
    console.error("GET /properties/:id failed:", error);
    return res.status(500).json({ message: "Unable to fetch property" });
  }
});

app.put("/properties/:id", verifyToken, async (req, res) => {
  try {
    const allowedRoles = ["landlord", "admin"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized to update property" });
    }

    const update = { ...req.body };
    if (update.price !== undefined) update.price = Number(update.price);
    if (update.images && Array.isArray(update.images) && !update.image) {
      update.image = update.images[0] || "";
    }

    const query = req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user.id };

    const property = await Property.findOneAndUpdate(query, update, { new: true });

    if (!property) return res.status(404).json({ message: "Property not found" });
    return res.json(property);
  } catch (error) {
    console.error("PUT /properties/:id failed:", error);
    return res.status(500).json({ message: "Unable to update property" });
  }
});

app.delete("/properties/:id", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const deleted = await Property.findOneAndDelete({
      _id: req.params.id,
      landlordId: req.user.id
    });
    if (!deleted) return res.status(404).json({ message: "Property not found" });
    return res.json({ message: "Property deleted" });
  } catch (error) {
    console.error("DELETE /properties/:id failed:", error);
    return res.status(500).json({ message: "Unable to delete property" });
  }
});

// ================= MAINTENANCE =================

const maintenanceTicketNumber = () => `MR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

const visitStatusLabels = {
  "not-started": "Visit not started",
  scheduled: "Visit scheduled",
  "on-the-way": "Technician is on the way",
  arrived: "Technician has arrived",
  completed: "Visit completed",
  delayed: "Visit delayed",
  cancelled: "Visit cancelled"
};

const serializeMaintenance = (ticket) => ({
  _id: ticket._id,
  id: ticket._id,
  ticketNumber: ticket.ticketNumber,
  tenantId: ticket.tenantId,
  tenantName: ticket.tenantName,
  tenantPhone: ticket.tenantPhone,
  landlordId: ticket.landlordId,
  landlordName: ticket.landlordName,
  propertyId: ticket.propertyId,
  propertyTitle: ticket.propertyTitle,
  propertyLocation: ticket.propertyLocation,
  unitLabel: ticket.unitLabel,
  category: ticket.category,
  title: ticket.title,
  description: ticket.description,
  issueLocation: ticket.issueLocation,
  priority: ticket.priority,
  preferredVisitTime: ticket.preferredVisitTime,
  preferredEntry: ticket.preferredEntry,
  accessInstructions: ticket.accessInstructions,
  contactPhone: ticket.contactPhone,
  status: ticket.status,
  assignedAt: ticket.assignedAt,
  scheduledFor: ticket.scheduledFor,
  scheduledNote: ticket.scheduledNote,
  visitStatus: ticket.visitStatus,
  visitStatusUpdatedAt: ticket.visitStatusUpdatedAt,
  resolutionNote: ticket.resolutionNote,
  resolvedAt: ticket.resolvedAt,
  responses: ticket.responses || [],
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt
});

async function enrichMaintenanceTickets(tickets) {
  const tenantIds = Array.from(new Set(tickets.map((ticket) => String(ticket.tenantId || "")).filter(Boolean)));
  const landlordIds = Array.from(new Set(tickets.map((ticket) => String(ticket.landlordId || "")).filter(Boolean)));
  const propertyIds = Array.from(new Set(tickets.map((ticket) => String(ticket.propertyId || "")).filter(Boolean)));

  const [tenantUsers, landlordUsers, properties] = await Promise.all([
    tenantIds.length ? User.find({ _id: { $in: tenantIds } }).select("name phone").lean() : [],
    landlordIds.length ? User.find({ _id: { $in: landlordIds } }).select("name phone").lean() : [],
    propertyIds.length ? Property.find({ _id: { $in: propertyIds } }).select("title location landlordId").lean() : []
  ]);

  const tenantMap = Object.fromEntries(tenantUsers.map((user) => [String(user._id), user]));
  const landlordMap = Object.fromEntries(landlordUsers.map((user) => [String(user._id), user]));
  const propertyMap = Object.fromEntries(properties.map((property) => [String(property._id), property]));

  return tickets.map((ticket) => {
    const tenant = tenantMap[String(ticket.tenantId || "")];
    const landlord = landlordMap[String(ticket.landlordId || "")];
    const property = propertyMap[String(ticket.propertyId || "")];

    return {
      ...ticket,
      tenantName: ticket.tenantName || tenant?.name || "Tenant",
      tenantPhone: ticket.tenantPhone || ticket.contactPhone || tenant?.phone || "",
      landlordId: ticket.landlordId || String(property?.landlordId || ""),
      landlordName: ticket.landlordName || landlord?.name || "Landlord",
      propertyTitle: ticket.propertyTitle || property?.title || "",
      propertyLocation: ticket.propertyLocation || property?.location || ""
    };
  });
}

function maintenanceAccessQuery(user) {
  if (user.role === "admin") return {};
  if (user.role === "landlord") return { landlordId: String(user.id) };
  return { tenantId: String(user.id) };
}

function canAccessMaintenance(user, ticket) {
  if (user.role === "admin") return true;
  if (user.role === "landlord") return String(ticket.landlordId || "") === String(user.id);
  return String(ticket.tenantId || "") === String(user.id);
}

app.post("/maintenance", verifyToken, requireRole("tenant"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name phone").lean();
    const property = req.body.propertyId ? await Property.findById(req.body.propertyId).select("title location landlordId").lean() : null;
    const landlordId = String(req.body.landlordId || property?.landlordId || "");
    const landlord = landlordId ? await User.findById(landlordId).select("name").lean() : null;

    const ticket = await Maintenance.create({
      ticketNumber: maintenanceTicketNumber(),
      tenantId: String(req.user.id),
      tenantName: req.body.tenantName || user?.name || "Tenant",
      tenantPhone: req.body.tenantPhone || user?.phone || "",
      landlordId,
      landlordName: req.body.landlordName || landlord?.name || "Landlord",
      propertyId: String(req.body.propertyId || ""),
      propertyTitle: req.body.propertyTitle || property?.title || "",
      propertyLocation: req.body.propertyLocation || property?.location || "",
      unitLabel: req.body.unitLabel || "",
      category: req.body.category || "general",
      title: req.body.title || "Maintenance request",
      description: req.body.description || "",
      issueLocation: req.body.issueLocation || "",
      priority: req.body.priority || "medium",
      preferredVisitTime: req.body.preferredVisitTime || "",
      preferredEntry: req.body.preferredEntry || "",
      accessInstructions: req.body.accessInstructions || "",
      contactPhone: req.body.contactPhone || user?.phone || "",
      status: "pending",
      assignedAt: landlordId ? new Date() : null,
      responses: [
        {
          senderRole: "tenant",
          senderId: String(req.user.id),
          senderName: req.body.tenantName || user?.name || "Tenant",
          message: req.body.description || "",
          timestamp: new Date()
        }
      ]
    });

    return res.status(201).json(serializeMaintenance(ticket));
  } catch (error) {
    console.error("POST /maintenance failed:", error);
    return res.status(500).json({ message: "Unable to create maintenance request" });
  }
});

app.get("/maintenance", verifyToken, async (req, res) => {
  try {
    const tickets = await Maintenance.find(maintenanceAccessQuery(req.user)).sort({ updatedAt: -1 }).lean();
    const enrichedTickets = await enrichMaintenanceTickets(tickets);
    return res.json(enrichedTickets.map(serializeMaintenance));
  } catch (error) {
    console.error("GET /maintenance failed:", error);
    return res.status(500).json({ message: "Unable to fetch maintenance requests" });
  }
});

app.put("/maintenance/:id/reply", verifyToken, async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Maintenance request not found" });
    if (!canAccessMaintenance(req.user, ticket)) return res.status(403).json({ message: "Forbidden" });

    ticket.responses.push({
      senderRole: req.body.senderRole || req.user.role,
      senderId: String(req.user.id),
      senderName: req.body.senderName || req.user.role,
      message: req.body.message || "",
      timestamp: new Date()
    });
    ticket.updatedAt = new Date();

    await ticket.save();
    return res.json(serializeMaintenance(ticket));
  } catch (error) {
    console.error("PUT /maintenance/:id/reply failed:", error);
    return res.status(500).json({ message: "Unable to reply to maintenance request" });
  }
});

app.put("/maintenance/:id/status", verifyToken, async (req, res) => {
  try {
    if (!["landlord", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Maintenance request not found" });
    if (!canAccessMaintenance(req.user, ticket)) return res.status(403).json({ message: "Forbidden" });

    ticket.status = req.body.status || ticket.status;
    if (req.body.scheduledFor !== undefined) {
      ticket.scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : null;
    }
    if (req.body.scheduledNote !== undefined) {
      ticket.scheduledNote = req.body.scheduledNote || "";
    }
    if (req.body.visitStatus !== undefined) {
      const nextVisitStatus = req.body.visitStatus || (ticket.scheduledFor ? "scheduled" : "not-started");
      if (ticket.visitStatus !== nextVisitStatus) {
        ticket.responses.push({
          senderRole: "system",
          senderId: "",
          senderName: "Visit Tracker",
          message: visitStatusLabels[nextVisitStatus] || "Visit updated",
          timestamp: new Date()
        });
      }
      ticket.visitStatus = nextVisitStatus;
      ticket.visitStatusUpdatedAt = nextVisitStatus ? new Date() : null;
    } else if (req.body.scheduledFor !== undefined || req.body.scheduledNote !== undefined) {
      ticket.visitStatus = ticket.scheduledFor ? "scheduled" : "not-started";
      ticket.visitStatusUpdatedAt = ticket.scheduledFor ? new Date() : null;
    }
    if (req.body.resolutionNote !== undefined) {
      ticket.resolutionNote = req.body.resolutionNote || "";
    }
    if (ticket.status === "resolved") {
      ticket.visitStatus = "completed";
      ticket.visitStatusUpdatedAt = new Date();
    }
    ticket.resolvedAt = ticket.status === "resolved" ? new Date() : null;
    ticket.updatedAt = new Date();

    await ticket.save();
    return res.json(serializeMaintenance(ticket));
  } catch (error) {
    console.error("PUT /maintenance/:id/status failed:", error);
    return res.status(500).json({ message: "Unable to update maintenance status" });
  }
});

app.put("/maintenance/:id/assign", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Maintenance request not found" });

    ticket.landlordId = String(req.body.landlordId || "");
    ticket.landlordName = req.body.landlordName || "Landlord";
    ticket.assignedAt = new Date();
    ticket.updatedAt = new Date();

    await ticket.save();
    return res.json(serializeMaintenance(ticket));
  } catch (error) {
    console.error("PUT /maintenance/:id/assign failed:", error);
    return res.status(500).json({ message: "Unable to assign landlord" });
  }
});

app.put("/maintenance/:id", verifyToken, async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Maintenance request not found" });
    if (!canAccessMaintenance(req.user, ticket)) return res.status(403).json({ message: "Forbidden" });

    const allowedFields = [
      "contactPhone",
      "issueLocation",
      "preferredVisitTime",
      "preferredEntry",
      "accessInstructions",
      "scheduledNote",
      "resolutionNote"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field] || "";
      }
    });

    ticket.updatedAt = new Date();

    await ticket.save();
    return res.json(serializeMaintenance(ticket));
  } catch (error) {
    console.error("PUT /maintenance/:id failed:", error);
    return res.status(500).json({ message: "Unable to update maintenance request" });
  }
});

// ================= PAYMENT =================

function addOneMonth(dateValue) {
  const next = new Date(dateValue);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function addDays(dateValue, days) {
  const next = new Date(dateValue);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeMonthlyCycle(startValue, endValue, nextDueValue) {
  const billingPeriodStart = startValue ? new Date(startValue) : new Date();
  const nextCycleStart = addOneMonth(billingPeriodStart);
  const inferredBillingPeriodEnd = addDays(nextCycleStart, -1);

  let billingPeriodEnd = endValue ? new Date(endValue) : inferredBillingPeriodEnd;
  if (billingPeriodEnd <= billingPeriodStart) {
    billingPeriodEnd = inferredBillingPeriodEnd;
  }

  let nextPaymentDate = nextDueValue ? new Date(nextDueValue) : nextCycleStart;
  if (nextPaymentDate <= billingPeriodStart || nextPaymentDate <= billingPeriodEnd) {
    nextPaymentDate = addDays(billingPeriodEnd, 1);
  }

  return {
    billingPeriodStart,
    billingPeriodEnd,
    nextPaymentDate
  };
}

async function buildTenantNameMap(tenantIds) {
  const normalizedIds = Array.from(new Set((tenantIds || []).map((id) => String(id || "")).filter(Boolean)));
  if (!normalizedIds.length) {
    return {};
  }

  const validObjectIds = normalizedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validObjectIds.length) {
    return {};
  }

  const users = await User.find({ _id: { $in: validObjectIds } }).select("name email").lean();
  return Object.fromEntries(
    users.map((user) => [String(user._id), user.name || user.email || "Tenant"])
  );
}

async function buildUserNameMap(userIds) {
  const normalizedIds = Array.from(new Set((userIds || []).map((id) => String(id || "")).filter(Boolean)));
  const validObjectIds = normalizedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validObjectIds.length) {
    return {};
  }

  const users = await User.find({ _id: { $in: validObjectIds } }).select("name email").lean();
  return Object.fromEntries(
    users.map((user) => [String(user._id), user.name || user.email || "User"])
  );
}

function normalizeTenantDisplayName(candidateName, fallbackUser) {
  const normalizedCandidate = String(candidateName || "").trim();
  const fallbackName = String(fallbackUser?.name || fallbackUser?.email || "").trim();

  if (
    !normalizedCandidate ||
    normalizedCandidate.toLowerCase() === "tenant" ||
    normalizedCandidate.toLowerCase().startsWith("tenant ")
  ) {
    return fallbackName || "Tenant";
  }

  return normalizedCandidate;
}

function isPlaceholderTenantName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "tenant" || normalized.startsWith("tenant ");
}

function landlordMonthlyBookingKey(item) {
  const propertyId = String(item?.property?._id || item?.propertyId || "");
  const start = item?.billingPeriodStart || item?.startDate || item?.date || item?.createdAt || new Date();
  const normalizedStart = new Date(start);

  return [
    propertyId,
    normalizedStart.getFullYear(),
    normalizedStart.getMonth()
  ].join("|");
}

function dedupeLandlordMonthlyRows(items) {
  const grouped = new Map();

  for (const item of items || []) {
    const key = landlordMonthlyBookingKey(item);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, item);
      continue;
    }

    const currentNamed = !isPlaceholderTenantName(current.tenantName);
    const nextNamed = !isPlaceholderTenantName(item.tenantName);
    const currentPaid = ["paid", "active", "completed"].includes(String(current.status || "").toLowerCase());
    const nextPaid = ["paid", "active", "completed"].includes(String(item.status || "").toLowerCase());
    const currentGateway = Boolean(String(current.razorpayPaymentId || "").trim());
    const nextGateway = Boolean(String(item.razorpayPaymentId || "").trim());
    const currentDate = new Date(current.createdAt || current.date || current.billingPeriodStart || current.startDate || 0).getTime();
    const nextDate = new Date(item.createdAt || item.date || item.billingPeriodStart || item.startDate || 0).getTime();

    if (currentNamed !== nextNamed) {
      if (nextNamed) grouped.set(key, item);
      continue;
    }

    if (currentPaid !== nextPaid) {
      if (nextPaid) grouped.set(key, item);
      continue;
    }

    if (currentGateway !== nextGateway) {
      if (nextGateway) grouped.set(key, item);
      continue;
    }

    if (nextDate >= currentDate) {
      grouped.set(key, item);
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b.createdAt || b.date || b.billingPeriodStart || b.startDate || 0) -
      new Date(a.createdAt || a.date || a.billingPeriodStart || a.startDate || 0)
  );
}

async function hydratePropertiesWithAssignments(properties) {
  const propertyList = Array.isArray(properties) ? properties : [];
  if (!propertyList.length) {
    return propertyList;
  }

  const propertyIds = propertyList.map((property) => String(property._id || property.id || "")).filter(Boolean);
  const relevantBookings = await Booking.find({
    propertyId: { $in: propertyIds },
    status: { $in: ["active", "completed"] }
  })
    .sort({ createdAt: -1, startDate: -1 })
    .lean();
  const relevantPayments = await Payment.find({
    propertyId: { $in: propertyIds },
    status: { $in: ["paid", "active", "completed"] }
  })
    .sort({ date: -1, _id: -1 })
    .lean();
  const tenantNameMap = await buildTenantNameMap([
    ...relevantBookings.map((booking) => booking.tenantId),
    ...relevantPayments.map((payment) => payment.tenantId)
  ]);

  return propertyList.map((property) => {
    const propertyId = String(property._id || property.id || "");
    if (property.assignedTenantId || property.assignedTenantName) {
      return property;
    }

    const bookingMatch = relevantBookings.find((booking) => String(booking.propertyId || "") === propertyId);
    if (bookingMatch) {
      return {
        ...property,
        assignedTenantId: String(bookingMatch.tenantId || ""),
        assignedTenantName: normalizeTenantDisplayName(bookingMatch.tenantName, {
          name: tenantNameMap[String(bookingMatch.tenantId || "")] || ""
        }),
        assignedAt: bookingMatch.createdAt || bookingMatch.startDate || null
      };
    }

    const paymentMatch = relevantPayments.find((payment) => String(payment.propertyId || "") === propertyId);
    if (paymentMatch) {
      return {
        ...property,
        assignedTenantId: String(paymentMatch.tenantId || ""),
        assignedTenantName: normalizeTenantDisplayName(paymentMatch.tenantName, {
          name: tenantNameMap[String(paymentMatch.tenantId || "")] || ""
        }),
        assignedAt: paymentMatch.date || null
      };
    }

    return property;
  });
}

async function hydratePropertiesWithLandlords(properties) {
  const propertyList = Array.isArray(properties) ? properties : [];
  if (!propertyList.length) {
    return propertyList;
  }

  const landlordIds = Array.from(
    new Set(propertyList.map((property) => String(property.landlordId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id)))
  );
  const landlords = landlordIds.length
    ? await User.find({ _id: { $in: landlordIds } }).select("name email").lean()
    : [];
  const landlordMap = Object.fromEntries(
    landlords.map((landlord) => [String(landlord._id), landlord.name || landlord.email || "Landlord"])
  );

  return propertyList.map((property) => ({
    ...property,
    landlordName: landlordMap[String(property.landlordId || "")] || property.landlordName || ""
  }));
}

function monthlyPaymentKey(tenantId, propertyId, billingPeriodStart) {
  const start = billingPeriodStart ? new Date(billingPeriodStart) : new Date();
  return [
    String(tenantId || "").trim(),
    String(propertyId || "").trim(),
    start.getFullYear(),
    start.getMonth()
  ].join("|");
}

function dedupeMonthlyPayments(payments) {
  const grouped = new Map();

  for (const payment of payments) {
    const paymentDate = payment.date ? new Date(payment.date) : new Date();
    const { billingPeriodStart, billingPeriodEnd, nextPaymentDate } = normalizeMonthlyCycle(
      payment.billingPeriodStart || paymentDate,
      payment.billingPeriodEnd,
      payment.nextPaymentDate
    );
    const key = monthlyPaymentKey(payment.tenantId, payment.propertyId, billingPeriodStart);
    const current = grouped.get(key);
    const currentIsPaid = String(current?.status || "").toLowerCase() === "paid";
    const nextIsPaid = String(payment.status || "").toLowerCase() === "paid";

    if (!current) {
      grouped.set(key, {
        ...payment.toObject(),
        billingPeriodStart,
        billingPeriodEnd,
        nextPaymentDate
      });
      continue;
    }

    const currentHasGateway = Boolean(String(current.razorpayPaymentId || "").trim());
    const nextHasGateway = Boolean(String(payment.razorpayPaymentId || "").trim());
    const shouldReplace =
      (!currentIsPaid && nextIsPaid) ||
      (!currentHasGateway && nextHasGateway) ||
      new Date(payment.date || 0) > new Date(current.date || 0) ||
      String(payment._id) > String(current._id);

    if (shouldReplace) {
      grouped.set(key, {
        ...payment.toObject(),
        billingPeriodStart,
        billingPeriodEnd,
        nextPaymentDate
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

app.post("/payment", verifyToken, async (req, res) => {
  try {
    const normalizedOrderId = String(req.body.razorpayOrderId || "").trim();
    const normalizedPaymentId = String(req.body.razorpayPaymentId || "").trim();
    const normalizedSignature = String(req.body.razorpaySignature || "").trim();
    const effectiveTenantId = req.user?.role === "tenant" ? String(req.user.id) : String(req.body.tenantId || "").trim();
    const property = req.body.propertyId
      ? await Property.findById(req.body.propertyId).select("price landlordId assignedTenantId assignedTenantName assignedAt").lean()
      : null;
    const tenantUser = effectiveTenantId ? await User.findById(effectiveTenantId).select("name email").lean() : null;
    const normalizedAmount = Number(req.body.amount || property?.price || 0);
    const paymentDate = req.body.date ? new Date(req.body.date) : new Date();
    const {
      billingPeriodStart,
      billingPeriodEnd,
      nextPaymentDate
    } = normalizeMonthlyCycle(paymentDate);
    const resolvedTenantName = normalizeTenantDisplayName(req.body.tenantName, tenantUser);
    const payload = {
      tenantId: effectiveTenantId,
      tenantName: resolvedTenantName,
      propertyId: req.body.propertyId || "",
      amount: normalizedAmount,
      status: req.body.status || "pending",
      date: paymentDate,
      billingPeriodStart,
      billingPeriodEnd,
      nextPaymentDate,
      razorpayOrderId: normalizedOrderId || undefined,
      razorpayPaymentId: normalizedPaymentId || undefined,
      razorpaySignature: normalizedSignature || undefined
    };

    let payment;
    const existingMonthlyPayment = await Payment.findOne({
      tenantId: payload.tenantId,
      propertyId: payload.propertyId,
      billingPeriodStart
    });

    if (existingMonthlyPayment) {
      existingMonthlyPayment.tenantName = payload.tenantName;
      existingMonthlyPayment.amount = payload.amount;
      existingMonthlyPayment.status = payload.status;
      existingMonthlyPayment.date = payload.date;
      existingMonthlyPayment.billingPeriodEnd = payload.billingPeriodEnd;
      existingMonthlyPayment.nextPaymentDate = payload.nextPaymentDate;
      if (payload.razorpayOrderId) existingMonthlyPayment.razorpayOrderId = payload.razorpayOrderId;
      if (payload.razorpayPaymentId) existingMonthlyPayment.razorpayPaymentId = payload.razorpayPaymentId;
      if (payload.razorpaySignature) existingMonthlyPayment.razorpaySignature = payload.razorpaySignature;
      await existingMonthlyPayment.save();
      payment = existingMonthlyPayment;
    } else if (payload.razorpayPaymentId) {
      try {
        payment = await Payment.findOneAndUpdate(
          { razorpayPaymentId: payload.razorpayPaymentId },
          { $setOnInsert: payload },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );
      } catch (error) {
        if (error?.code === 11000) {
          payment = await Payment.findOne({ razorpayPaymentId: payload.razorpayPaymentId });
        } else {
          throw error;
        }
      }
    } else {
      try {
        payment = await Payment.findOneAndUpdate(
          {
            tenantId: payload.tenantId,
            propertyId: payload.propertyId,
            billingPeriodStart
          },
          {
            $set: {
              tenantName: payload.tenantName,
              amount: payload.amount,
              status: payload.status,
              date: payload.date,
              billingPeriodEnd: payload.billingPeriodEnd,
              nextPaymentDate: payload.nextPaymentDate,
              razorpayOrderId: payload.razorpayOrderId,
              razorpayPaymentId: payload.razorpayPaymentId,
              razorpaySignature: payload.razorpaySignature
            },
            $setOnInsert: {
              tenantId: payload.tenantId,
              propertyId: payload.propertyId,
              billingPeriodStart
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );
      } catch (error) {
        if (error?.code === 11000) {
          payment = await Payment.findOne({
            tenantId: payload.tenantId,
            propertyId: payload.propertyId,
            billingPeriodStart
          });
        } else {
          throw error;
        }
      }
    }

    if (!payment) {
      return res.status(500).json({ message: "Unable to load payment record after save" });
    }

    let bookingSyncError = "";

    const normalizedPaymentStatus = String(payload.status || "pending").toLowerCase();
    const isBookedStatus = ["paid", "active", "completed"].includes(normalizedPaymentStatus);

    // Keep booking collection in sync with payment records, but do not fail the
    // payment record if the booking mirror hits a validation issue.
    try {
      if (property?.landlordId) {
        await Booking.findOneAndUpdate(
          {
            tenantId: payload.tenantId || "",
            propertyId: property._id,
            billingPeriodStart,
            billingPeriodEnd
          },
          {
            $setOnInsert: {
              tenantId: payload.tenantId || "",
              tenantName: payload.tenantName || "",
              propertyId: property._id,
              landlordId: property.landlordId,
              startDate: billingPeriodStart,
              endDate: billingPeriodEnd,
              billingPeriodStart,
              billingPeriodEnd,
              nextPaymentDate,
              amount: payload.amount,
              status: isBookedStatus ? "active" : "pending"
            },
            $set: {
              tenantName: payload.tenantName || "",
              amount: payload.amount,
              nextPaymentDate,
              status: isBookedStatus ? "active" : "pending"
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    } catch (bookingError) {
      bookingSyncError = bookingError?.message || "Booking sync failed";
      console.error("POST /payment booking sync failed:", bookingError);
    }

    try {
      if (property?._id && payload.tenantId && isBookedStatus) {
        await Property.findByIdAndUpdate(
          property._id,
          {
            $set: {
              assignedTenantId: payload.tenantId,
              assignedTenantName: payload.tenantName || "",
              assignedAt: paymentDate
            }
          },
          { new: false }
        );
      }
    } catch (assignmentError) {
      console.error("POST /payment property assignment sync failed:", assignmentError);
    }

    res.json({
      message: "Payment created",
      paymentId: payment._id,
      alreadyExists: Boolean(payload.razorpayPaymentId) && String(payment.razorpayPaymentId || "") === String(payload.razorpayPaymentId),
      bookingSyncError
    });
  } catch (error) {
    console.error("POST /payment failed:", error);
    res.status(500).json({
      message: "Unable to create payment",
      error: error?.message || "Unknown payment error"
    });
  }
});

app.get("/payments", verifyToken, async (req, res) => {
  const query = req.user?.role === "tenant" ? { tenantId: String(req.user.id) } : {};
  const data = await Payment.find(query).sort({ date: -1, _id: -1 });
  const propertyIds = Array.from(new Set(data.map((payment) => String(payment.propertyId || "")).filter(Boolean)));
  const tenantNameMap = await buildTenantNameMap(data.map((payment) => payment.tenantId));
  const properties = propertyIds.length
    ? await Property.find({ _id: { $in: propertyIds } }).select("price").lean()
    : [];
  const propertyMap = Object.fromEntries(properties.map((property) => [String(property._id), property]));

  const deduped = dedupeMonthlyPayments(data);

  res.json(
    deduped.map((payment) => {
      const property = propertyMap[String(payment.propertyId || "")];
      const amount = Number(payment.amount || property?.price || 0);

      return {
        ...payment,
        tenantName: normalizeTenantDisplayName(payment.tenantName, {
          name: tenantNameMap[String(payment.tenantId || "")] || ""
        }),
        amount,
        billingPeriodStart: payment.billingPeriodStart,
        billingPeriodEnd: payment.billingPeriodEnd,
        nextPaymentDate: payment.nextPaymentDate
      };
    })
  );
});

app.get("/payments/landlord", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const properties = await Property.find({ landlordId: req.user.id }).select("_id title location type price").lean();
    const propertyIds = properties.map((property) => String(property._id));
    const propertyMap = Object.fromEntries(properties.map((property) => [String(property._id), property]));

    if (!propertyIds.length) {
      return res.json([]);
    }

    const payments = await Payment.find({ propertyId: { $in: propertyIds } }).sort({ date: -1, _id: -1 });
    const dedupedPayments = dedupeMonthlyPayments(payments);
    const tenantNameMap = await buildTenantNameMap(dedupedPayments.map((payment) => payment.tenantId));

    const normalizedPayments = dedupedPayments.map((payment) => {
        const property = propertyMap[String(payment.propertyId || "")];

        return {
          ...payment,
          tenantName: normalizeTenantDisplayName(payment.tenantName, {
            name: tenantNameMap[String(payment.tenantId || "")] || ""
          }),
          amount: Number(payment.amount || property?.price || 0),
          property: property
            ? {
                _id: property._id,
                title: property.title,
                location: property.location,
                type: property.type,
                price: Number(property.price || 0)
              }
            : null,
          billingPeriodStart: payment.billingPeriodStart,
          billingPeriodEnd: payment.billingPeriodEnd,
          nextPaymentDate: payment.nextPaymentDate
        };
      });

    return res.json(dedupeLandlordMonthlyRows(normalizedPayments));
  } catch (error) {
    console.error("GET /payments/landlord failed:", error);
    return res.status(500).json({ message: "Unable to fetch landlord payments" });
  }
});

app.get("/admin/payments", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ date: -1, _id: -1 });
    const dedupedPayments = dedupeMonthlyPayments(payments);
    const propertyIds = Array.from(new Set(dedupedPayments.map((payment) => String(payment.propertyId || "")).filter(Boolean)));
    const tenantNameMap = await buildTenantNameMap(dedupedPayments.map((payment) => payment.tenantId));
    const properties = propertyIds.length
      ? await Property.find({ _id: { $in: propertyIds } }).select("title location type price landlordId").lean()
      : [];
    const propertyMap = Object.fromEntries(properties.map((property) => [String(property._id), property]));
    const landlordNameMap = await buildUserNameMap(properties.map((property) => property.landlordId));

    const normalizedPayments = dedupedPayments.map((payment) => {
      const property = propertyMap[String(payment.propertyId || "")];
      return {
        ...payment,
        tenantName: normalizeTenantDisplayName(payment.tenantName, {
          name: tenantNameMap[String(payment.tenantId || "")] || ""
        }),
        landlordId: String(property?.landlordId || ""),
        landlordName: landlordNameMap[String(property?.landlordId || "")] || "",
        amount: Number(payment.amount || property?.price || 0),
        property: property
          ? {
              _id: property._id,
              title: property.title,
              location: property.location,
              type: property.type,
              price: Number(property.price || 0)
            }
          : null,
        billingPeriodStart: payment.billingPeriodStart,
        billingPeriodEnd: payment.billingPeriodEnd,
        nextPaymentDate: payment.nextPaymentDate
      };
    });

    return res.json(dedupeLandlordMonthlyRows(normalizedPayments));
  } catch (error) {
    console.error("GET /admin/payments failed:", error);
    return res.status(500).json({ message: "Unable to fetch admin payments" });
  }
});

// ================= LANDLORD BOOKINGS =================
app.get("/bookings/landlord", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const bookings = await Booking.find({ landlordId: req.user.id })
      .populate("propertyId", "title location type price")
      .sort({ createdAt: -1 });
    const tenantNameMap = await buildTenantNameMap(bookings.map((booking) => booking.tenantId));

    if (bookings.length === 0) {
      const properties = await Property.find({ landlordId: req.user.id }).select("_id title location type price");
      const propertyIds = properties.map((property) => String(property._id));
      const propertyMap = Object.fromEntries(properties.map((property) => [String(property._id), property]));
      const payments = await Payment.find({ propertyId: { $in: propertyIds } }).sort({ date: -1 });
      const paymentTenantNameMap = await buildTenantNameMap(payments.map((payment) => payment.tenantId));

      const fallbackRows = payments.map((payment) => {
          const property = propertyMap[String(payment.propertyId)];
          const { billingPeriodStart, billingPeriodEnd, nextPaymentDate } = normalizeMonthlyCycle(
            payment.billingPeriodStart || payment.date || new Date(),
            payment.billingPeriodEnd,
            payment.nextPaymentDate
          );

          return {
            _id: payment._id,
            tenantName: normalizeTenantDisplayName(payment.tenantName, {
              name: paymentTenantNameMap[String(payment.tenantId || "")] || ""
            }),
            tenantId: payment.tenantId,
            property: property
              ? {
                  _id: property._id,
                  title: property.title,
                  location: property.location,
                  type: property.type,
                  price: Number(property.price || 0)
                }
              : null,
            startDate: billingPeriodStart,
            endDate: billingPeriodEnd,
            billingPeriodStart,
            billingPeriodEnd,
            nextPaymentDate,
            status: String(payment.status || "").toLowerCase() === "paid" ? "active" : "pending",
            amount: Number(payment.amount || property?.price || 0),
            createdAt: payment.date || new Date()
          };
        });

      return res.json(dedupeLandlordMonthlyRows(fallbackRows));
    }

    const normalizedBookings = bookings.map((booking) => {
        const { billingPeriodStart, billingPeriodEnd, nextPaymentDate } = normalizeMonthlyCycle(
          booking.billingPeriodStart || booking.startDate || booking.createdAt || new Date(),
          booking.billingPeriodEnd || booking.endDate,
          booking.nextPaymentDate
        );

        return {
          _id: booking._id,
          tenantName: normalizeTenantDisplayName(booking.tenantName, {
            name: tenantNameMap[String(booking.tenantId || "")] || ""
          }),
          tenantId: booking.tenantId,
          property: booking.propertyId
            ? {
                _id: booking.propertyId._id,
                title: booking.propertyId.title,
                location: booking.propertyId.location,
                type: booking.propertyId.type,
                price: Number(booking.propertyId.price || 0)
              }
            : null,
          startDate: billingPeriodStart,
          endDate: billingPeriodEnd,
          billingPeriodStart,
          billingPeriodEnd,
          nextPaymentDate,
          status: booking.status,
          amount: Number(booking.amount || booking.propertyId?.price || 0),
          createdAt: booking.createdAt
        };
      });

    return res.json(dedupeLandlordMonthlyRows(normalizedBookings));
  } catch (error) {
    console.error("GET /bookings/landlord failed:", error);
    return res.status(500).json({ message: "Unable to fetch landlord bookings" });
  }
});

app.get("/admin/bookings", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("propertyId", "title location type price landlordId")
      .sort({ createdAt: -1 });
    const tenantNameMap = await buildTenantNameMap(bookings.map((booking) => booking.tenantId));
    const landlordNameMap = await buildUserNameMap(bookings.map((booking) => booking.landlordId));

    const normalizedBookings = bookings.map((booking) => {
      const { billingPeriodStart, billingPeriodEnd, nextPaymentDate } = normalizeMonthlyCycle(
        booking.billingPeriodStart || booking.startDate || booking.createdAt || new Date(),
        booking.billingPeriodEnd || booking.endDate,
        booking.nextPaymentDate
      );

      return {
        _id: booking._id,
        tenantName: normalizeTenantDisplayName(booking.tenantName, {
          name: tenantNameMap[String(booking.tenantId || "")] || ""
        }),
        tenantId: booking.tenantId,
        landlordId: String(booking.landlordId || booking.propertyId?.landlordId || ""),
        landlordName: landlordNameMap[String(booking.landlordId || booking.propertyId?.landlordId || "")] || "",
        property: booking.propertyId
          ? {
              _id: booking.propertyId._id,
              title: booking.propertyId.title,
              location: booking.propertyId.location,
              type: booking.propertyId.type,
              price: Number(booking.propertyId.price || 0)
            }
          : null,
        startDate: billingPeriodStart,
        endDate: billingPeriodEnd,
        billingPeriodStart,
        billingPeriodEnd,
        nextPaymentDate,
        status: booking.status,
        amount: Number(booking.amount || booking.propertyId?.price || 0),
        createdAt: booking.createdAt
      };
    });

    return res.json(dedupeLandlordMonthlyRows(normalizedBookings));
  } catch (error) {
    console.error("GET /admin/bookings failed:", error);
    return res.status(500).json({ message: "Unable to fetch admin bookings" });
  }
});

app.get("/bookings/tenant", verifyToken, requireRole("tenant"), async (req, res) => {
  try {
    const bookings = await Booking.find({ tenantId: req.user.id })
      .populate("propertyId", "title location type price image")
      .sort({ createdAt: -1 });
    const tenantNameMap = await buildTenantNameMap(bookings.map((booking) => booking.tenantId));

    return res.json(
      bookings.map((booking) => {
        const { billingPeriodStart, billingPeriodEnd, nextPaymentDate } = normalizeMonthlyCycle(
          booking.billingPeriodStart || booking.startDate || booking.createdAt || new Date(),
          booking.billingPeriodEnd || booking.endDate,
          booking.nextPaymentDate
        );

        return {
          _id: booking._id,
          tenantName: normalizeTenantDisplayName(booking.tenantName, {
            name: tenantNameMap[String(booking.tenantId || "")] || ""
          }),
          tenantId: booking.tenantId,
          property: booking.propertyId
            ? {
                _id: booking.propertyId._id,
                title: booking.propertyId.title,
                location: booking.propertyId.location,
                type: booking.propertyId.type,
                price: booking.propertyId.price,
                image: booking.propertyId.image
              }
            : null,
          startDate: billingPeriodStart,
          endDate: billingPeriodEnd,
          billingPeriodStart,
          billingPeriodEnd,
          nextPaymentDate,
          status: booking.status,
          amount: Number(booking.amount || booking.propertyId?.price || 0),
          createdAt: booking.createdAt
        };
      })
    );
  } catch (error) {
    console.error("GET /bookings/tenant failed:", error);
    return res.status(500).json({ message: "Unable to fetch tenant bookings" });
  }
});

// ================= LANDLORD EARNINGS =================
app.get("/earnings/landlord", verifyToken, requireRole("landlord"), async (req, res) => {
  try {
    const bookings = await Booking.find({ landlordId: req.user.id }).sort({ createdAt: -1 });
    const paidStatuses = new Set(["active", "completed"]);
    const paidBookings = bookings.filter((booking) => paidStatuses.has(String(booking.status || "").toLowerCase()));
    const tenantNameMap = await buildTenantNameMap(paidBookings.map((booking) => booking.tenantId));

    const totalEarnings = paidBookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
    const monthlyMap = {};
    paidBookings.forEach((booking) => {
      const d = booking.createdAt || booking.startDate || new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(booking.amount || 0);
    });

    const monthlyEarnings = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

    return res.json({
      totalEarnings,
      monthlyEarnings,
      paymentHistory: paidBookings.map((booking) => ({
        bookingId: booking._id,
        tenantId: booking.tenantId,
        tenantName: normalizeTenantDisplayName(booking.tenantName, {
          name: tenantNameMap[String(booking.tenantId || "")] || ""
        }),
        amount: Number(booking.amount || 0),
        status: booking.status,
        date: booking.createdAt || booking.startDate,
        billingPeriodStart: booking.billingPeriodStart || booking.startDate,
        billingPeriodEnd: booking.billingPeriodEnd || booking.endDate,
        nextPaymentDate: booking.nextPaymentDate || booking.billingPeriodEnd || booking.endDate
      }))
    });
  } catch (error) {
    console.error("GET /earnings/landlord failed:", error);
    return res.status(500).json({ message: "Unable to fetch landlord earnings" });
  }
});

app.put("/payment/:id", async (req, res) => {
  try {
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: "paid" },
      { new: true }
    );

    if (updatedPayment?.propertyId && updatedPayment?.tenantId) {
      await Booking.findOneAndUpdate(
        {
          propertyId: updatedPayment.propertyId,
          tenantId: updatedPayment.tenantId
        },
        {
          status: "active",
          amount: Number(updatedPayment.amount || 0)
        },
        { sort: { createdAt: -1 } }
      );
    }

    res.send("Updated");
  } catch (error) {
    console.error("PUT /payment/:id failed:", error);
    res.status(500).send("Unable to update payment");
  }
});

app.put("/admin/payments/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const update = {};
    if (req.body.status !== undefined) update.status = String(req.body.status || "pending").toLowerCase();
    if (req.body.amount !== undefined) update.amount = Number(req.body.amount || 0);
    if (req.body.date !== undefined) update.date = new Date(req.body.date);
    if (req.body.billingPeriodStart !== undefined) update.billingPeriodStart = new Date(req.body.billingPeriodStart);
    if (req.body.billingPeriodEnd !== undefined) update.billingPeriodEnd = new Date(req.body.billingPeriodEnd);
    if (req.body.nextPaymentDate !== undefined) update.nextPaymentDate = new Date(req.body.nextPaymentDate);
    if (req.body.tenantName !== undefined) update.tenantName = String(req.body.tenantName || "").trim();

    const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updatedPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (updatedPayment.propertyId && updatedPayment.tenantId) {
      await Booking.findOneAndUpdate(
        {
          propertyId: updatedPayment.propertyId,
          tenantId: updatedPayment.tenantId,
          billingPeriodStart: updatedPayment.billingPeriodStart
        },
        {
          tenantName: updatedPayment.tenantName || "",
          amount: Number(updatedPayment.amount || 0),
          billingPeriodEnd: updatedPayment.billingPeriodEnd,
          nextPaymentDate: updatedPayment.nextPaymentDate,
          status: ["paid", "active", "completed"].includes(String(updatedPayment.status || "").toLowerCase()) ? "active" : "pending"
        },
        { sort: { createdAt: -1 } }
      );
    }

    return res.json({ message: "Payment updated", payment: updatedPayment });
  } catch (error) {
    console.error("PUT /admin/payments/:id failed:", error);
    return res.status(500).json({ message: "Unable to update payment" });
  }
});

app.delete("/admin/payments/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
    if (!deletedPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    return res.json({ message: "Payment deleted" });
  } catch (error) {
    console.error("DELETE /admin/payments/:id failed:", error);
    return res.status(500).json({ message: "Unable to delete payment" });
  }
});

app.put("/admin/bookings/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const update = {};
    if (req.body.status !== undefined) update.status = String(req.body.status || "pending").toLowerCase();
    if (req.body.amount !== undefined) update.amount = Number(req.body.amount || 0);
    if (req.body.startDate !== undefined) update.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) update.endDate = new Date(req.body.endDate);
    if (req.body.billingPeriodStart !== undefined) update.billingPeriodStart = new Date(req.body.billingPeriodStart);
    if (req.body.billingPeriodEnd !== undefined) update.billingPeriodEnd = new Date(req.body.billingPeriodEnd);
    if (req.body.nextPaymentDate !== undefined) update.nextPaymentDate = new Date(req.body.nextPaymentDate);
    if (req.body.tenantName !== undefined) update.tenantName = String(req.body.tenantName || "").trim();

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true }).populate("propertyId", "title");
    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await Payment.findOneAndUpdate(
      {
        tenantId: updatedBooking.tenantId,
        propertyId: String(updatedBooking.propertyId?._id || updatedBooking.propertyId || ""),
        billingPeriodStart: updatedBooking.billingPeriodStart
      },
      {
        tenantName: updatedBooking.tenantName || "",
        amount: Number(updatedBooking.amount || 0),
        status: String(updatedBooking.status || "").toLowerCase() === "active" ? "paid" : String(updatedBooking.status || "pending").toLowerCase(),
        date: updatedBooking.startDate || updatedBooking.billingPeriodStart,
        billingPeriodEnd: updatedBooking.billingPeriodEnd,
        nextPaymentDate: updatedBooking.nextPaymentDate
      }
    );

    return res.json({ message: "Booking updated", booking: updatedBooking });
  } catch (error) {
    console.error("PUT /admin/bookings/:id failed:", error);
    return res.status(500).json({ message: "Unable to update booking" });
  }
});

app.delete("/admin/bookings/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.json({ message: "Booking deleted" });
  } catch (error) {
    console.error("DELETE /admin/bookings/:id failed:", error);
    return res.status(500).json({ message: "Unable to delete booking" });
  }
});

// ================= RAZORPAY =================

app.post("/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "A valid payment amount is required" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay is not configured on the server" });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR"
    };

    const order = await razorpay.orders.create(options);
    return res.json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("POST /create-order failed:", error);
    return res.status(500).json({
      message: "Unable to create Razorpay order",
      error: error?.message || "Unknown order creation error"
    });
  }
});
app.post("/contact", async (req, res) => {
  const { message } = req.body;

  try {
    console.log("👉 Request received");
    console.log("👉 Message:", message);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Message",
      text: message,
    });

    console.log("✅ Email sent");

    res.send("Email sent successfully");

  } catch (err) {
    console.error("❌ EMAIL ERROR:", err); // 👈 THIS IS KEY
    res.status(500).send("Error sending message");
  }
});
// CREATE QUERY
// SAVE QUERY
app.post("/query", async (req, res) => {
  const newQuery = new Maintenance({
    message: req.body.message,
    category: req.body.category || "General",
    status: "Pending",
    reply: "",
    ticketNumber: "",
    title: "",
    description: ""
  });

  await newQuery.save();
  res.send("Query saved");
});
// ADMIN REPLY
app.put("/query/reply/:id", async (req, res) => {
  try {
    const updated = await Maintenance.findByIdAndUpdate(
      req.params.id,
      {
        reply: req.body.reply,
        status: "Resolved"
      },
      { new: true }
    );

    console.log("Updated:", updated);

    res.json(updated);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating reply");
  }
});
// GET ALL QUERIES
app.get("/query", async (req, res) => {
  const data = await Maintenance.find({
    ticketNumber: { $in: ["", null] },
    message: { $ne: "" }
  });
  res.json(data);
});
app.post("/verify-payment", (req, res) => {
  try {
    const requestBody = req.body || {};
    const razorpay_order_id = String(
      requestBody.razorpay_order_id ||
      requestBody.razorpayOrderId ||
      requestBody.order_id ||
      requestBody.orderId ||
      requestBody?.response?.razorpay_order_id ||
      requestBody?.response?.razorpayOrderId ||
      ""
    ).trim();
    const razorpay_payment_id = String(
      requestBody.razorpay_payment_id ||
      requestBody.razorpayPaymentId ||
      requestBody.payment_id ||
      requestBody.paymentId ||
      requestBody?.response?.razorpay_payment_id ||
      requestBody?.response?.razorpayPaymentId ||
      ""
    ).trim();
    const razorpay_signature = String(
      requestBody.razorpay_signature ||
      requestBody.razorpaySignature ||
      requestBody.signature ||
      requestBody?.response?.razorpay_signature ||
      requestBody?.response?.razorpaySignature ||
      ""
    ).trim();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("POST /verify-payment missing fields:", {
        keys: Object.keys(requestBody),
        nestedResponseKeys: requestBody?.response ? Object.keys(requestBody.response) : [],
        hasOrderId: Boolean(razorpay_order_id),
        hasPaymentId: Boolean(razorpay_payment_id),
        hasSignature: Boolean(razorpay_signature)
      });
      return res.status(400).json({
        message: "Missing Razorpay verification fields",
        receivedKeys: Object.keys(requestBody)
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay verification is not configured on the server" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expected === razorpay_signature) {
      return res.json({ message: "Payment successful" });
    }

    return res.status(400).json({
      message: "Payment signature verification failed"
    });
  } catch (error) {
    console.error("POST /verify-payment failed:", error);
    return res.status(500).json({
      message: "Unable to verify payment",
      error: error?.message || "Unknown payment verification error"
    });
  }
});

// ================= ADMIN =================

app.put("/approve/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    isApproved: true
  });
  res.send("Approved");
});
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});
// ================= START =================
if (require.main === module) {
  const port = process.env.PORT || 5000;
  ensureDatabaseConnection()
    .then(() => {
      app.listen(port, () => console.log(`Server running on ${port}`));
    })
    .catch(() => {
      process.exit(1);
    });
}

app.ensureDatabaseConnection = ensureDatabaseConnection;
module.exports = app;
