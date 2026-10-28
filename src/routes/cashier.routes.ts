import { Router } from "express";
import * as cashier from "../controllers/cashier.controller.js";
import * as menu from "../controllers/menu.controller.js";
import { requireAuth, requireAuthSse, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { codeParam, idParam } from "../validators/common.validator.js";
import {
  createCashierOrderBody,
  listOrdersQuery,
  orderNoteBody,
} from "../validators/order.validator.js";
import {
  availabilityBody,
  createMenuItemBody,
  updateMenuItemBody,
} from "../validators/menu.validator.js";

export const cashierRoutes = Router();

// SSE: boleh autentikasi lewat ?token= karena EventSource tidak bisa kirim header
cashierRoutes.get("/stream", requireAuthSse, cashier.stream);

cashierRoutes.use(requireAuth);

cashierRoutes.get("/orders", validate({ query: listOrdersQuery }), cashier.listOrders);
cashierRoutes.post("/orders", validate({ body: createCashierOrderBody }), cashier.createOrder);
cashierRoutes.get("/orders/:code", validate({ params: codeParam }), cashier.getOrder);
cashierRoutes.patch("/orders/:code/pay", validate({ params: codeParam }), cashier.payCash);
cashierRoutes.patch("/orders/:code/ready", validate({ params: codeParam }), cashier.ready);
cashierRoutes.patch("/orders/:code/complete", validate({ params: codeParam }), cashier.complete);
cashierRoutes.patch(
  "/orders/:code/note",
  validate({ params: codeParam, body: orderNoteBody }),
  cashier.note,
);

cashierRoutes.patch(
  "/menu-items/:id/availability",
  validate({ params: idParam, body: availabilityBody }),
  menu.setAvailability,
);
cashierRoutes.post(
  "/menu-items",
  requireRole("ADMIN"),
  validate({ body: createMenuItemBody }),
  menu.createMenuItem,
);
cashierRoutes.patch(
  "/menu-items/:id",
  requireRole("ADMIN"),
  validate({ params: idParam, body: updateMenuItemBody }),
  menu.updateMenuItem,
);
