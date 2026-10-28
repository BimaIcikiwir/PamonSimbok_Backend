import type { Request, Response } from "express";
import { ok } from "../lib/response.js";
import type { AuthUser } from "../middleware/auth.middleware.js";
import * as auth from "../services/auth.service.js";

export const login = async (req: Request, res: Response) => {
  ok(res, await auth.login(req.body.username, req.body.password), "Login berhasil");
};

export const me = async (_req: Request, res: Response) => {
  const user = res.locals.user as AuthUser;
  ok(res, await auth.getMe(user.id));
};
