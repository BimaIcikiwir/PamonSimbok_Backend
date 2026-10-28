import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../lib/env.js";
import type { MidtransNotification } from "../validators/payment.validator.js";

export type QrisCharge = {
  transactionId: string;
  qrString: string;
  qrUrl: string | null;
  raw: unknown;
};

type ChargeParams = {
  orderCode: string;
  amount: number;
  customerName: string;
  expiryMinutes: number;
};

/**
 * Membuat tagihan QRIS.
 *  - simulator : tidak memanggil siapa pun, QR berisi string simulasi.
 *  - midtrans  : memanggil Core API Midtrans (sandbox atau production).
 */
export async function createQrisCharge(p: ChargeParams): Promise<QrisCharge> {
  if (env.PAYMENT_PROVIDER === "simulator") {
    return {
      transactionId: `SIM-${p.orderCode}`,
      qrString: `PAMONSIMBOK-SIMULATOR|${p.orderCode}|${p.amount}`,
      qrUrl: null,
      raw: { simulated: true },
    };
  }

  const base = env.MIDTRANS_IS_PRODUCTION
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
  const auth = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64");

  const res = await fetch(`${base}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: p.orderCode, gross_amount: p.amount },
      qris: { acquirer: "gopay" },
      customer_details: { first_name: p.customerName },
      custom_expiry: { expiry_duration: p.expiryMinutes, unit: "minute" },
    }),
  });

  const json = (await res.json()) as {
    status_code?: string;
    status_message?: string;
    transaction_id?: string;
    qr_string?: string;
    actions?: { name: string; url: string }[];
  };

  if (!res.ok || !["200", "201"].includes(String(json.status_code)) || !json.qr_string) {
    throw new Error(`Midtrans error: ${json.status_code} ${json.status_message}`);
  }

  return {
    transactionId: json.transaction_id ?? p.orderCode,
    qrString: json.qr_string,
    qrUrl: json.actions?.find((a) => a.name === "generate-qr-code")?.url ?? null,
    raw: json,
  };
}

/** signature_key = SHA512(order_id + status_code + gross_amount + serverKey) */
export function verifyMidtransSignature(n: MidtransNotification): boolean {
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${env.MIDTRANS_SERVER_KEY ?? ""}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && timingSafeEqual(a, b);
}
