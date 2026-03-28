import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// SECURITY: Universally apply CORS, but restrict the origin in production.
// This allows the separate Vercel frontend domain to access this Vercel backend domain.
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "OPTIONS"],
};
app.use(cors(corsOptions));

// Root route to prevent 404 on the base Vercel URL
app.get("/", (req, res) => {
  res.json({ message: "DevRev RWT API is online." });
});

app.get("/api/timeline/:ticketId", async (req, res) => {
  const token = process.env.DEVREV_TOKEN;
  if (!token) {
    return res.status(500).json({
      success: false,
      message: "Server configuration error (Missing DevRev Token)",
    });
  }

  try {
    let cursor = null;
    let hasNext = true;
    let safetyCounter = 0;
    const MAX_PAGES = 50; // Fail-safe to prevent infinite loops from bad external APIs

    const stageUpdates = [];
    const ticketId = req.params.ticketId;

    while (hasNext && safetyCounter < MAX_PAGES) {
      safetyCounter++;

      const url = `https://api.devrev.ai/timeline-entries.list?object=${ticketId}${cursor ? `&cursor=${cursor}` : ""}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const entries = response.data.timeline_entries || [];

      entries.forEach((entry) => {
        if (
          entry.type === "timeline_change_event" &&
          entry.event?.type === "updated"
        ) {
          const stageDelta = (entry.event.updated?.field_deltas || []).find(
            (d) => d.name === "stage",
          );

          if (stageDelta) {
            stageUpdates.push({
              timestamp: entry.created_date,
              from: stageDelta.old_value?.fields?.name?.value || "unknown",
              to: stageDelta.new_value?.fields?.name?.value || "unknown",
            });
          }
        }
      });

      cursor = response.data.next_cursor;
      hasNext = !!cursor;
    }

    if (safetyCounter >= MAX_PAGES) {
      console.warn(`[WARN] Pagination limit reached for ticket ${ticketId}`);
    }

    res.json({ success: true, data: stageUpdates });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch timeline from DevRev API",
    });
  }
});

// VERCEL FIX: Only listen on a port if running locally.
// Vercel Serverless executes the exported app directly and will crash if app.listen is called.
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`🚀 API running locally on port ${PORT}`));
}

export default app;
