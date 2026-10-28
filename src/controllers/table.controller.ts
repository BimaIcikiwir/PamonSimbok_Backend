import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { ok } from "../lib/response.js";

export const getTable = async (_req: Request, res: Response) => {
  const number: number = res.locals.params.number;
  const table = await prisma.table.findUnique({ where: { number } });
  if (!table || !table.isActive) {
    throw new AppError(404, "TABLE_NOT_FOUND", `Meja ${number} tidak ditemukan`);
  }
  ok(res, { number: table.number, isActive: table.isActive });
};
