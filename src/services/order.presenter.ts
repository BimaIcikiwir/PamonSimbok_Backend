import type { OrderStatus, Prisma } from "../generated/prisma/client.js";

export const orderInclude = {
  items: { orderBy: { id: "asc" } },
  payment: true,
  table: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Sedang dibuat",
  READY: "Siap diambil",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
};

// Versi untuk pelanggan (tanpa catatan internal)
export function toPublicOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    code: o.code,
    queueNumber: o.queueNumber,
    queueLabel: `#${String(o.queueNumber).padStart(3, "0")}`,
    queueDate: o.queueDate,
    customerName: o.customerName,
    orderType: o.orderType,
    tableNumber: o.table?.number ?? null,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    paymentMethod: o.paymentMethod,
    notifyPreference: o.notifyPreference,
    subtotal: o.subtotal,
    total: o.total,
    expiresAt: o.expiresAt,
    paidAt: o.paidAt,
    readyAt: o.readyAt,
    completedAt: o.completedAt,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      note: i.note,
      subtotal: i.price * i.quantity,
    })),
    payment: o.payment
      ? {
          provider: o.payment.provider,
          method: o.payment.method,
          status: o.payment.status,
          amount: o.payment.amount,
          qrString: o.payment.qrString,
          qrUrl: o.payment.qrUrl,
          expiresAt: o.payment.expiresAt,
          paidAt: o.payment.paidAt,
          isSimulated: o.payment.provider === "SIMULATOR",
        }
      : null,
  };
}

// Versi untuk kasir (+ catatan internal & sumber pesanan)
export function toCashierOrder(o: OrderWithRelations) {
  return { ...toPublicOrder(o), internalNote: o.internalNote, source: o.source };
}
