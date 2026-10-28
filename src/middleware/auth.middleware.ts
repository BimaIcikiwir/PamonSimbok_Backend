import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/client.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";

export type AuthUser = { id: string; role: Role; name: string };

function authenticate(allowQueryToken: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    let token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    // EventSource di browser tidak bisa mengirim header, jadi SSE boleh pakai ?token=
    if (!token && allowQueryToken && typeof req.query.token === "string") token = req.query.token;
    if (!token) throw new AppError(401, "UNAUTHORIZED", "Token tidak ditemukan");

    try {
      const p = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & { role: Role; name: string };
      res.locals.user = { id: p.sub as string, role: p.role, name: p.name } satisfies AuthUser;
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Token tidak valid atau sudah kedaluwarsa");
    }
    next();
  };
}

export const requireAuth = authenticate(false);
export const requireAuthSse = authenticate(true);

export const requireRole =
  (...roles: Role[]) =>
  (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AuthUser | undefined;
    if (!user || !roles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "Anda tidak punya akses untuk aksi ini");
    }
    next();
  };
