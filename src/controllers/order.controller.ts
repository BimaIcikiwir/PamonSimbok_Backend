import type { Request, Response } from "express";
import { ok } from "../lib/response.js";
import { openStream, registerCustomer, sendEvent } from "../lib/sse.js";
import * as orders from "../services/order.service.js";
import { toPublicOrder } from "../services/order.presenter.js";

export const createOrder = async (req: Request, res: Response) => {
  const order = await orders.createCustomerOrder(req.body);
  ok(res, toPublicOrder(order), "Pesanan berhasil dibuat", 201);
};

export const getOrder = async (_req: Request, res: Response) => {
  ok(res, toPublicOrder(await orders.getOrderByCode(res.locals.params.code)));
};

export const streamOrder = async (req: Request, res: Response) => {
  const order = await orders.getOrderByCode(res.locals.params.code);
  openStream(req, res);
  registerCustomer(order.code, res);
  sendEvent(res, "order.updated", toPublicOrder(order)); // state awal
};
