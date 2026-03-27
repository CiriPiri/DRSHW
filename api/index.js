import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

// SECURITY: Only allow your specific Vercel frontend to call this API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  }),
);

// Root route to prevent 404 on the base Vercel URL
app.get("/", (req, res) => {
  res.json({ message: "API is running successfully on Vercel!" });
});

app.get("/api/timeline/:ticketId", async (req, res) => {
  const token = process.env.DEVREV_TOKEN;
  if (!token)
    return res.status(500).json({
      success: false,
      message: "Server configuration error (Missing Token)",
    });

  try {
    let cursor = null;
    let hasNext = true;
    const stageUpdates = [];
    const ticketId = req.params.ticketId;

    while (hasNext) {
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

    res.json({ success: true, data: stageUpdates });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch timeline from DevRev",
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Headless API running on port ${PORT}`));
export default app;
