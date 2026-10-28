import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./lib/env.js";
import { openapi } from "./lib/swagger.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

// Swagger dipasang SEBELUM helmet: CSP bawaan helmet (upgrade-insecure-requests)
// membuat aset Swagger gagal dimuat saat berjalan lewat http://localhost.
app.get("/docs.json", (_req, res) => res.json(openapi));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Pamon Simbok API" }));

app.use(helmet());

const origins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origins.includes("*") ? "*" : origins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ name: "Pamon Simbok API", docs: "/docs", health: "/api/health" });
});
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);
