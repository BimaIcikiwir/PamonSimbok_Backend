import { z } from "zod";

export const simulatePaymentBody = z.object({
  result: z.enum(["SUCCESS", "EXPIRE"]).default("SUCCESS"),
});

// Payload notifikasi Midtrans (field lain dibiarkan lewat)
export const midtransNotificationBody = z
  .object({
    order_id: z.string(),
    status_code: z.string(),
    gross_amount: z.string(),
    signature_key: z.string(),
    transaction_status: z.string(),
    transaction_id: z.string().optional(),
    fraud_status: z.string().optional(),
  })
  .passthrough();

export type MidtransNotification = z.infer<typeof midtransNotificationBody>;
