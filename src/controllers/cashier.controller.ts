import type { Request, Response } from "express";
import { ok } from "../lib/response.js";
import { openStream, registerCashier, sendEvent } from "../lib/sse.js";
import * as orders from "../services/order.service.js";
import { toCashierOrder } from "../services/order.presenter.js";

export const listOrders = async (_req: Request, res: Response) => {
  const { orders: rows, total, date, limit } = await orders.listOrders(res.locals.query);
  ok(res, rows.map(toCashierOrder), "OK", 200, { total, date, limit });
};

export const getOrder = async (_req: Request, res: Response) => {
  ok(res, toCashierOrder(await orders.getOrderByCode(res.locals.params.code)));
};

export const createOrder = async (req: Request, res: Response) => {
  const order = await orders.createCashierOrder(req.body);
  ok(res, toCashierOrder(order), "Pesanan manual berhasil dibuat", 201);
};

export const payCash = async (_req: Request, res: Response) => {
  ok(res, toCashierOrder(await orders.markCashPaid(res.locals.params.code)), "Pembayaran diterima");
};

export const ready = async (_req: Request, res: Response) => {
  ok(res, toCashierOrder(await orders.markReady(res.locals.params.code)), "Pesanan siap diambil");
};

export const complete = async (_req: Request, res: Response) => {
  ok(res, toCashierOrder(await orders.markCompleted(res.locals.params.code)), "Pesanan selesai");
};

export const note = async (req: Request, res: Response) => {
  const order = await orders.setInternalNote(res.locals.params.code, req.body.internalNote);
  ok(res, toCashierOrder(order), "Catatan disimpan");
};

export const stream = (req: Request, res: Response) => {
  openStream(req, res);
  registerCashier(res);
  sendEvent(res, "connected", { ok: true });
};
