import { Router } from "express";
import { login, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBody } from "../validators/auth.validator.js";

export const authRoutes = Router();
authRoutes.post("/login", validate({ body: loginBody }), login);
authRoutes.get("/me", requireAuth, me);
