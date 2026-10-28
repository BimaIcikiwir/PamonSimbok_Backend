import { randomInt } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import { todayJakarta } from "../lib/time.js";
import { pushToCashiers, pushToCustomer } from "../lib/sse.js";
import type {
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentMethod,
  NotifyPreference,
  Prisma,
} from "../generated/prisma/client.js";
import type {
  CreateCashierOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
} from "../validators/order.validator.js";
import { createQrisCharge } from "./payment.gateway.js";
import { orderInclude, toCashierOrder, toPublicOrder } from "./order.presenter.js";
import type { OrderWithRelations } from "./order.presenter.js";

type CashierEvent =
  | "order.pending_cash"
  | "order.paid"
  | "order.ready"
  | "order.completed"
  | "order.expired";

// Tanpa huruf/angka yang mudah tertukar (0/O, 1/I)
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (len = 6) =>
  Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/* ---------------------------------- helpers --------------------------------- */

function publish(order: OrderWithRelations, cashierEvent?: CashierEvent) {
  pushToCustomer(order.code, "order.updated", toPublicOrder(order));
  if (cashierEvent) pushToCashiers(cashierEvent, toCashierOrder(order));
}

export async function getOrderByCode(code: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({ where: { code }, include: orderInclude });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");
  return order;
}

async function resolveTableId(orderType: OrderType, tableNumber?: number): Promise<number | null> {
  if (orderType !== "DINE_IN" || tableNumber === undefined) return null;
  const table = await prisma.table.findUnique({ where: { number: tableNumber } });
  if (!table || !table.isActive) {
    throw new AppError(404, "TABLE_NOT_FOUND", `Meja ${tableNumber} tidak ditemukan`);
  }
  return table.id;
}

async function buildItems(items: CreateOrderInput["items"]) {
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const menu = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(menu.map((m) => [m.id, m]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new AppError(404, "MENU_NOT_FOUND", `Menu tidak ditemukan: ${missing.join(", ")}`);
  }
  const unavailable = menu.filter((m) => !m.isAvailable);
  if (unavailable.length) {
    throw new AppError(
      422,
      "MENU_UNAVAILABLE",
      `Menu sedang habis: ${unavailable.map((m) => m.name).join(", ")}`,
      unavailable.map((m) => ({
        menuItemId: m.id,
        name: m.name,
        message: `${m.name} sedang habis`,
      })),
    );
  }

  // Harga selalu diambil dari database, bukan dari FE
  const rows = items.map((i) => {
    const m = byId.get(i.menuItemId)!;
    return {
      menuItemId: m.id,
      name: m.name,
      price: m.price,
      quantity: i.quantity,
      note: i.note || null,
    };
  });
  const subtotal = rows.reduce((sum, r) => sum + r.price * r.quantity, 0);
  return { rows, subtotal };
}

type CreateRecordArgs = {
  customerName: string;
  orderType: OrderType;
  tableId: number | null;
  paymentMethod: PaymentMethod;
  notifyPreference: NotifyPreference;
  source: OrderSource;
  rows: Awaited<ReturnType<typeof buildItems>>["rows"];
  subtotal: number;
  paidNow: boolean;
  expiryMinutes: number;
  provider: string; // SIMULATOR | MIDTRANS | CASH
};

async function createOrderRecord(a: CreateRecordArgs) {
  const now = new Date();
  const date = todayJakarta(now);

  return prisma.$transaction(async (tx) => {
    // Nomor antrean harian, atomik
    const counter = await tx.queueCounter.upsert({
      where: { date },
      update: { last: { increment: 1 } },
      create: { date, last: 1 },
    });

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await tx.order.findUnique({ where: { code }, select: { id: true } });
      if (!clash) break;
      code = randomCode();
    }

    const expiresAt = a.paidNow ? null : new Date(now.getTime() + a.expiryMinutes * 60_000);

    return tx.order.create({
      data: {
        code,
        queueNumber: counter.last,
        queueDate: date,
        customerName: a.customerName,
        orderType: a.orderType,
        tableId: a.tableId,
        status: a.paidNow ? "PAID" : "PENDING",
        paymentMethod: a.paymentMethod,
        notifyPreference: a.notifyPreference,
        source: a.source,
        subtotal: a.subtotal,
        total: a.subtotal,
        expiresAt,
        paidAt: a.paidNow ? now : null,
        items: { create: a.rows },
        payment: {
          create: {
            provider: a.provider,
            method: a.paymentMethod,
            status: a.paidNow ? "PAID" : "PENDING",
            amount: a.subtotal,
            providerOrderId: a.provider === "CASH" ? null : code,
            expiresAt,
            paidAt: a.paidNow ? now : null,
          },
        },
      },
      include: orderInclude,
    });
  });
}

/* --------------------------------- create ----------------------------------- */

export async function createCustomerOrder(input: CreateOrderInput) {
  const tableId = await resolveTableId(input.orderType, input.tableNumber);
  const { rows, subtotal } = await buildItems(input.items);
  const isQris = input.paymentMethod === "QRIS";

  const created = await createOrderRecord({
    customerName: input.customerName,
    orderType: input.orderType,
    tableId,
    paymentMethod: input.paymentMethod,
    notifyPreference: input.notifyPreference,
    source: "CUSTOMER",
    rows,
    subtotal,
    paidNow: false,
    expiryMinutes: isQris ? env.QRIS_EXPIRY_MINUTES : env.CASH_EXPIRY_MINUTES,
    provider: isQris ? env.PAYMENT_PROVIDER.toUpperCase() : "CASH",
  });

  if (isQris) {
    try {
      const charge = await createQrisCharge({
        orderCode: created.code,
        amount: created.total,
        customerName: created.customerName,
        expiryMinutes: env.QRIS_EXPIRY_MINUTES,
      });
      await prisma.payment.update({
        where: { orderId: created.id },
        data: {
          transactionId: charge.transactionId,
          qrString: charge.qrString,
          qrUrl: charge.qrUrl,
          rawResponse: charge.raw as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.error("Gagal membuat QRIS:", err);
      await prisma.$transaction([
        prisma.order.update({ where: { id: created.id }, data: { status: "EXPIRED" } }),
        prisma.payment.update({ where: { orderId: created.id }, data: { status: "FAILED" } }),
      ]);
      throw new AppError(502, "PAYMENT_GATEWAY_ERROR", "Gagal membuat pembayaran QRIS, coba lagi");
    }
  }

  const order = await getOrderByCode(created.code);
  // Pesanan QRIS baru muncul di kasir setelah PAID. Pesanan tunai langsung tampil sebagai pending.
  publish(order, isQris ? undefined : "order.pending_cash");
  return order;
}

export async function createCashierOrder(input: CreateCashierOrderInput) {
  const tableId = await resolveTableId(input.orderType, input.tableNumber);
  const { rows, subtotal } = await buildItems(input.items);

  const created = await createOrderRecord({
    customerName: input.customerName,
    orderType: input.orderType,
    tableId,
    paymentMethod: "CASH",
    notifyPreference: input.notifyPreference,
    source: "CASHIER",
    rows,
    subtotal,
    paidNow: true,
    expiryMinutes: 0,
    provider: "CASH",
  });

  const order = await getOrderByCode(created.code);
  publish(order, "order.paid");
  return order;
}

/* ---------------------------------- list ------------------------------------ */

export async function listOrders(q: ListOrdersQuery) {
  const date = q.date ?? todayJakarta();
  const where: Prisma.OrderWhereInput = {
    queueDate: date,
    ...(q.status ? { status: { in: q.status } } : {}),
    ...(q.orderType ? { orderType: q.orderType } : {}),
    ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
  };

  if (q.search) {
    const or: Prisma.OrderWhereInput[] = [
      { customerName: { contains: q.search, mode: "insensitive" } },
      { code: { contains: q.search.toUpperCase() } },
    ];
    const n = Number(q.search.replace("#", ""));
    if (Number.isInteger(n) && n > 0) or.push({ queueNumber: n });
    where.OR = or;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "asc" }, // terlama dulu (FIFO untuk dapur)
      take: q.limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, date, limit: q.limit };
}

/* ------------------------------- transitions -------------------------------- */

async function transition(
  code: string,
  from: OrderStatus[],
  data: Prisma.OrderUpdateManyMutationInput,
  event: CashierEvent,
) {
  const r = await prisma.order.updateMany({ where: { code, status: { in: from } }, data });
  if (r.count === 0) {
    const current = await getOrderByCode(code); // 404 jika tidak ada
    throw new AppError(
      409,
      "INVALID_STATUS",
      `Status pesanan saat ini ${current.status}, aksi ini tidak dapat dilakukan`,
    );
  }
  const order = await getOrderByCode(code);
  publish(order, event);
  return order;
}

export const markReady = (code: string) =>
  transition(code, ["PAID"], { status: "READY", readyAt: new Date() }, "order.ready");

export const markCompleted = (code: string) =>
  transition(code, ["READY"], { status: "COMPLETED", completedAt: new Date() }, "order.completed");

export async function markCashPaid(code: string) {
  const existing = await getOrderByCode(code);
  if (existing.paymentMethod !== "CASH") {
    throw new AppError(409, "NOT_CASH_ORDER", "Pesanan ini bukan pembayaran tunai");
  }
  if (existing.status === "PENDING" && existing.expiresAt && existing.expiresAt < new Date()) {
    await expireOrder(code);
    throw new AppError(409, "ORDER_EXPIRED", "Pesanan sudah kedaluwarsa, buat pesanan manual baru");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: { code, status: "PENDING" },
      data: { status: "PAID", paidAt: now },
    });
    if (r.count === 0) {
      throw new AppError(
        409,
        "INVALID_STATUS",
        `Status pesanan saat ini ${existing.status}, aksi ini tidak dapat dilakukan`,
      );
    }
    await tx.payment.update({
      where: { orderId: existing.id },
      data: { status: "PAID", paidAt: now },
    });
  });

  const order = await getOrderByCode(code);
  publish(order, "order.paid");
  return order;
}

export async function setInternalNote(code: string, internalNote: string | null) {
  await getOrderByCode(code);
  await prisma.order.update({ where: { code }, data: { internalNote } });
  return getOrderByCode(code);
}

/* ------------------------- dipakai payment.service -------------------------- */

/** QRIS lunas. Idempoten; pesanan EXPIRED yang ternyata dibayar tetap diproses. */
export async function settleQrisPayment(code: string, transactionId?: string) {
  const existing = await getOrderByCode(code);
  if (existing.paymentMethod !== "QRIS") {
    throw new AppError(409, "NOT_QRIS_ORDER", "Pesanan ini bukan pembayaran QRIS");
  }
  if (["PAID", "READY", "COMPLETED"].includes(existing.status)) return existing;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { code, status: { in: ["PENDING", "EXPIRED"] } },
      data: { status: "PAID", paidAt: now },
    });
    await tx.payment.update({
      where: { orderId: existing.id },
      data: { status: "PAID", paidAt: now, ...(transactionId ? { transactionId } : {}) },
    });
  });

  const order = await getOrderByCode(code);
  publish(order, "order.paid");
  return order;
}

/** Pending -> EXPIRED (dipanggil job berkala, webhook gagal, atau simulator). */
export async function expireOrder(code: string) {
  const r = await prisma.order.updateMany({
    where: { code, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
  const order = await getOrderByCode(code);
  if (r.count > 0) {
    await prisma.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    const fresh = await getOrderByCode(code);
    publish(fresh, "order.expired");
    return fresh;
  }
  return order;
}

export async function expireStaleOrders() {
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { code: true },
  });
  for (const { code } of stale) await expireOrder(code);
  return stale.length;
}
