import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import type { MidtransNotification } from "../validators/payment.validator.js";
import { verifyMidtransSignature } from "./payment.gateway.js";
import { expireOrder, getOrderByCode, settleQrisPayment } from "./order.service.js";

/** Webhook Midtrans. Alur ini sama persis dengan yang dipakai simulator. */
export async function handleMidtransNotification(n: MidtransNotification) {
  if (env.PAYMENT_PROVIDER !== "midtrans") {
    throw new AppError(403, "MIDTRANS_DISABLED", "Webhook Midtrans tidak aktif (mode simulator)");
  }
  if (!verifyMidtransSignature(n)) {
    throw new AppError(401, "INVALID_SIGNATURE", "Signature tidak valid");
  }

  try {
    const s = n.transaction_status;
    if (s === "settlement" || (s === "capture" && n.fraud_status !== "deny")) {
      await settleQrisPayment(n.order_id, n.transaction_id);
    } else if (["deny", "cancel", "expire", "failure"].includes(s)) {
      await expireOrder(n.order_id);
    }
    // "pending" -> tidak ada yang perlu dilakukan
  } catch (err) {
    // Order tidak dikenal: balas 200 agar Midtrans tidak mengulang terus
    if (err instanceof AppError && err.code === "ORDER_NOT_FOUND") {
      return { orderCode: n.order_id, ignored: true };
    }
    throw err;
  }
  return { orderCode: n.order_id, ignored: false };
}

/** Simulasi pembayaran QRIS (hanya mode simulator). */
export async function simulatePayment(code: string, result: "SUCCESS" | "EXPIRE") {
  if (env.PAYMENT_PROVIDER !== "simulator") {
    throw new AppError(
      403,
      "SIMULATOR_DISABLED",
      "Simulator hanya aktif saat PAYMENT_PROVIDER=simulator",
    );
  }
  const order = await getOrderByCode(code);
  if (order.paymentMethod !== "QRIS") {
    throw new AppError(409, "NOT_QRIS_ORDER", "Pesanan ini bukan pembayaran QRIS");
  }
  return result === "SUCCESS" ? settleQrisPayment(code, `SIM-${code}`) : expireOrder(code);
}
