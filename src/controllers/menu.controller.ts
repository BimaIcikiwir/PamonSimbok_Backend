import type { Request, Response } from "express";
import { ok } from "../lib/response.js";
import * as menu from "../services/menu.service.js";

export const getMenu = async (_req: Request, res: Response) => {
  ok(res, await menu.getMenu());
};

export const createMenuItem = async (req: Request, res: Response) => {
  ok(res, await menu.createMenuItem(req.body), "Menu berhasil ditambahkan", 201);
};

export const updateMenuItem = async (req: Request, res: Response) => {
  ok(res, await menu.updateMenuItem(res.locals.params.id, req.body), "Menu berhasil diubah");
};

export const setAvailability = async (req: Request, res: Response) => {
  const item = await menu.setAvailability(res.locals.params.id, req.body.isAvailable);
  ok(res, item, item.isAvailable ? "Menu ditandai tersedia" : "Menu ditandai habis");
};
