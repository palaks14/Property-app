const express = require("express");
const { onRequest } = require("firebase-functions/v2/https");
const app = require("./server");

const api = express();

api.use(async (_req, res, next) => {
  try {
    await app.ensureDatabaseConnection();
    next();
  } catch (error) {
    console.error("Database connection failed for Firebase request:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// Hosting rewrite sends /api/* to this function; strip prefix for existing routes.
api.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4);
  } else if (req.url === "/api") {
    req.url = "/";
  }
  next();
});

api.use(app);

exports.api = onRequest({ region: "asia-south1" }, api);
