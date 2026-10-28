import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors.js";

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/**
 * Memvalidasi request dengan skema zod dari folder validators.
 * Hasil parse (sudah di-trim/coerce/default) tersedia di:
 *  - req.body              (untuk body)
 *  - res.locals.query      (untuk query)
 *  - res.locals.params     (untuk params)
 */
export const validate =
  (schemas: Schemas) => (req: Request, res: Response, next: NextFunction) => {
    const errors: { path: string; message: string }[] = [];
    const collect = (source: string, issues: { path: PropertyKey[]; message: string }[]) =>
      issues.forEach((i) =>
        errors.push({ path: [source, ...i.path.map(String)].join("."), message: i.message }),
      );

    if (schemas.body) {
      const r = schemas.body.safeParse(req.body ?? {});
      if (r.success) req.body = r.data;
      else collect("body", r.error.issues);
    }
    if (schemas.query) {
      const r = schemas.query.safeParse(req.query);
      if (r.success) res.locals.query = r.data;
      else collect("query", r.error.issues);
    }
    if (schemas.params) {
      const r = schemas.params.safeParse(req.params);
      if (r.success) res.locals.params = r.data;
      else collect("params", r.error.issues);
    }

    if (errors.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Data yang dikirim tidak valid", errors);
    }
    next();
  };
