import { Router } from "express";
import { midtransNotification, simulate } from "../controllers/payment.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { codeParam } from "../validators/common.validator.js";
import {
  midtransNotificationBody,
  simulatePaymentBody,
} from "../validators/payment.validator.js";

export const paymentRoutes = Router();
// Didaftarkan sebelum "/:code/simulate" agar tidak ambigu
paymentRoutes.post(
  "/midtrans/notification",
  validate({ body: midtransNotificationBody }),
  midtransNotification,
);
paymentRoutes.post(
  "/:code/simulate",
  validate({ params: codeParam, body: simulatePaymentBody }),
  simulate,
);
