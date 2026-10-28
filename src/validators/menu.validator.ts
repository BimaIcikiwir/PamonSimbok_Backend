import { z } from "zod";

export const createMenuItemBody = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  price: z.number().int().min(0),
  imageUrl: z.url().optional(),
  isAvailable: z.boolean().default(true),
});

export const updateMenuItemBody = z
  .object({
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(300).nullable(),
    price: z.number().int().min(0),
    imageUrl: z.url().nullable(),
    isAvailable: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Minimal 1 field harus diisi" });

export const availabilityBody = z.object({ isAvailable: z.boolean() });

export type CreateMenuItemInput = z.infer<typeof createMenuItemBody>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemBody>;
