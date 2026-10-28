import { Router } from "express";
import { env } from "../lib/env.js";
import { ok } from "../lib/response.js";
import { authRoutes } from "./auth.routes.js";
import { cashierRoutes } from "./cashier.routes.js";
import { menuRoutes } from "./menu.routes.js";
import { orderRoutes } from "./order.routes.js";
import { paymentRoutes } from "./payment.routes.js";
import { tableRoutes } from "./table.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/health", (_req, res) =>
  ok(res, { status: "ok", paymentProvider: env.PAYMENT_PROVIDER, time: new Date().toISOString() }),
);
apiRoutes.use("/menu", menuRoutes);
apiRoutes.use("/tables", tableRoutes);
apiRoutes.use("/orders", orderRoutes);
apiRoutes.use("/payments", paymentRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/cashier", cashierRoutes);
