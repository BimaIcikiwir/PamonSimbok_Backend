import { Router } from "express";
import { createOrder, getOrder, streamOrder } from "../controllers/order.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { codeParam } from "../validators/common.validator.js";
import { createOrderBody } from "../validators/order.validator.js";

export const orderRoutes = Router();
orderRoutes.post("/", validate({ body: createOrderBody }), createOrder);
orderRoutes.get("/:code", validate({ params: codeParam }), getOrder);
orderRoutes.get("/:code/stream", validate({ params: codeParam }), streamOrder);
