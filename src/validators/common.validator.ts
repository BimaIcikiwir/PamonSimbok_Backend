import { z } from "zod";

export const codeParam = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(12)
    .transform((s) => s.toUpperCase()),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const tableNumberParam = z.object({ number: z.coerce.number().int().positive() });
