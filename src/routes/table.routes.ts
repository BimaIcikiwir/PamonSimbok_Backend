import { Router } from "express";
import { getTable } from "../controllers/table.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { tableNumberParam } from "../validators/common.validator.js";

export const tableRoutes = Router();
tableRoutes.get("/:number", validate({ params: tableNumberParam }), getTable);
