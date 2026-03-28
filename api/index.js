import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "OPTIONS"],
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.json({ message: "DevRev RWT API is online." });
});

app.get("/api/timeline/:ticketId", async (req, res) => {
  const token = process.env.DEVREV_TOKEN;
  if (!token) {
    return res
      .status(500)
      .json({ success: false, message: "Missing DevRev Token" });
  }

  try {
    const ticketId = req.params.ticketId;
    // Extract cursor from frontend query params if it exists
    const incomingCursor = req.query.cursor;

    const cursorParam = incomingCursor
      ? `&cursor=${encodeURIComponent(incomingCursor)}`
      : "";
    const url = `https://api.devrev.ai/timeline-entries.list?object=${ticketId}${cursorParam}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const entries = response.data.timeline_entries || [];
    const stageUpdates = [];

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

    // Send ONE page of data back, plus the cursor for the next page
    res.json({
      success: true,
      data: stageUpdates,
      next_cursor: response.data.next_cursor || null,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch timeline from DevRev",
    });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`🚀 API running locally on port ${PORT}`));
}

export default app;
