import type { Request, Response } from "express";
import { ok } from "../lib/response.js";
import { toPublicOrder } from "../services/order.presenter.js";
import * as payments from "../services/payment.service.js";

export const simulate = async (req: Request, res: Response) => {
  const order = await payments.simulatePayment(res.locals.params.code, req.body.result);
  ok(res, toPublicOrder(order), "Simulasi pembayaran diproses");
};

export const midtransNotification = async (req: Request, res: Response) => {
  ok(res, await payments.handleMidtransNotification(req.body), "Notifikasi diproses");
};
