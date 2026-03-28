// src/server.ts
import express from "express";
import cors from "cors";

// src/schema/index.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3e3),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
  DEVREV_TOKEN: z.string().min(10, "DEVREV_TOKEN is required")
});
var getTimelineSchema = z.object({
  params: z.object({
    // Strictly enforce DevRev ticket format (e.g., TKT-12345) to prevent URL injection
    ticketId: z.string().regex(/^TKT-\d+$/i, "Invalid ticket ID format. Expected TKT-[numbers]")
  }),
  query: z.object({
    cursor: z.string().optional()
  })
});

// src/config/env.ts
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\u274C Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables. Check server logs for details.");
}
var env = parsed.data;

// src/utils/logger.ts
import pino from "pino";
var logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport: env.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: { colorize: true }
  } : void 0
});

// src/modules/timeline/timeline.route.ts
import { Router } from "express";

// src/clients/devrev.client.ts
import axios from "axios";

// src/utils/errors.ts
var AppError = class extends Error {
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};
var UpstreamApiError = class extends AppError {
  constructor(message, statusCode, code) {
    super(message, statusCode, code);
  }
};

// src/clients/devrev.client.ts
var DevRevClient = class {
  client;
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.devrev.ai",
      headers: {
        Authorization: `Bearer ${env.DEVREV_TOKEN}`
      },
      timeout: 8e3
      // Never let a 3rd party hang our server indefinitely
    });
  }
  /**
   * Fetches raw timeline entries from DevRev
   */
  async getTimelineEntries(ticketId, cursor) {
    try {
      const params = new URLSearchParams({ object: ticketId });
      if (cursor) {
        params.append("cursor", cursor);
      }
      const response = await this.client.get("/timeline-entries.list", {
        params
      });
      return response.data;
    } catch (error) {
      logger.error({ err: error, ticketId, cursor }, "DevRev API request failed");
      if (error.response?.status === 429) {
        throw new UpstreamApiError("DevRev API rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
      }
      throw new UpstreamApiError(
        "Failed to communicate with upstream telemetry provider",
        error.response?.status || 502,
        "UPSTREAM_API_FAILURE"
      );
    }
  }
};
var devRevClient = new DevRevClient();

// src/modules/timeline/timeline.svc.ts
var TimelineService = class {
  /**
   * Orchestrates data fetching and parsing for RWT formatting
   */
  async getProcessedTimeline(ticketId, cursor) {
    const rawData = await devRevClient.getTimelineEntries(ticketId, cursor);
    const stageUpdates = [];
    const entries = rawData.timeline_entries || [];
    for (const entry of entries) {
      if (entry.type === "timeline_change_event" && entry.event?.type === "updated") {
        const stageDelta = (entry.event.updated?.field_deltas || []).find((d) => d.name === "stage");
        if (stageDelta) {
          stageUpdates.push({
            timestamp: entry.created_date,
            // Fallbacks prevent undefined crashes if DevRev changes payload structure slightly
            from: stageDelta.old_value?.fields?.name?.value || "unknown",
            to: stageDelta.new_value?.fields?.name?.value || "unknown"
          });
        }
      }
    }
    return {
      data: stageUpdates,
      next_cursor: rawData.next_cursor || null
    };
  }
};
var timelineService = new TimelineService();

// src/modules/timeline/timeline.ctrl.ts
var TimelineController = class {
  /**
   * Handles the HTTP request, invokes service, and formats response
   */
  async getTimeline(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { cursor } = req.query;
      const result = await timelineService.getProcessedTimeline(ticketId, cursor);
      res.status(200).json({
        success: true,
        data: result.data,
        next_cursor: result.next_cursor
      });
    } catch (error) {
      next(error);
    }
  }
};
var timelineController = new TimelineController();

// src/middleware/validate.middleware.ts
import { ZodError } from "zod";
var validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ err: error }, "Zod validation failed");
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          // .issues is the strict, standard property for ZodError arrays
          details: error.issues,
          code: "VALIDATION_ERROR"
        });
        return;
      }
      next(error);
    }
  };
};

// src/modules/timeline/timeline.route.ts
var router = Router();
router.get(
  "/:ticketId",
  validateRequest(getTimelineSchema),
  timelineController.getTimeline
);

// src/middleware/error.middleware.ts
var errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, "Operational error occurred");
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
    return;
  }
  logger.error({ err }, "Unhandled exception occurred");
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    code: "INTERNAL_ERROR"
  });
};

// src/server.ts
var app = express();
var allowedOrigin = env.NODE_ENV === "production" ? env.FRONTEND_URL || false : "*";
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "OPTIONS"]
}));
app.use(express.json());
app.get("/debug-env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasDevrevToken: !!process.env.DEVREV_TOKEN,
    hasFrontendUrl: !!process.env.FRONTEND_URL
  });
});
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Strict TS RWT Engine Online" });
});
app.use("/api/timeline", router);
app.use(errorHandler);
if (env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`\u{1F680} TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}
var server_default = app;
export {
  server_default as default
};
