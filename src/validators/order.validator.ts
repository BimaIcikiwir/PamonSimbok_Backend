import { z } from "zod";

export const ORDER_STATUSES = ["PENDING", "PAID", "READY", "COMPLETED", "EXPIRED"] as const;

const orderItem = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional(),
});

const baseOrder = z.object({
  customerName: z.string().trim().min(1, "Nama wajib diisi").max(40, "Nama maksimal 40 karakter"),
  orderType: z.enum(["DINE_IN", "TAKE_AWAY"]),
  tableNumber: z.number().int().positive().optional(),
  notifyPreference: z.enum(["SOUND", "MESSAGE"]).default("SOUND"),
  items: z.array(orderItem).min(1, "Pilih minimal 1 menu").max(50),
});

const needTable = (d: { orderType: string; tableNumber?: number }) =>
  d.orderType !== "DINE_IN" || d.tableNumber !== undefined;
const needTableMsg = { path: ["tableNumber"], message: "Nomor meja wajib untuk makan di sini" };

// Pesanan dari pelanggan
export const createOrderBody = baseOrder
  .extend({ paymentMethod: z.enum(["QRIS", "CASH"]) })
  .refine(needTable, needTableMsg);

// Pesanan manual dari kasir (selalu tunai & langsung lunas)
export const createCashierOrderBody = baseOrder.refine(needTable, needTableMsg);

export const listOrdersQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.enum(ORDER_STATUSES)).optional()),
  orderType: z.enum(["DINE_IN", "TAKE_AWAY"]).optional(),
  paymentMethod: z.enum(["QRIS", "CASH"]).optional(),
  search: z.string().trim().max(50).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const orderNoteBody = z.object({
  internalNote: z.string().trim().max(500).nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderBody>;
export type CreateCashierOrderInput = z.infer<typeof createCashierOrderBody>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
