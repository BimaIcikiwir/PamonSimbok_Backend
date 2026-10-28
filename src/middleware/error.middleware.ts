import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} tidak ditemukan`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json({ success: false, code: "INVALID_JSON", message: "Body bukan JSON yang valid" });
  }
  console.error(err);
  return res
    .status(500)
    .json({ success: false, code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" });
}
