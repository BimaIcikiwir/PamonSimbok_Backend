import { app } from "./app.js";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { expireStaleOrders } from "./services/order.service.js";

const server = app.listen(env.PORT, () => {
  console.log(`Pamon Simbok API berjalan di http://localhost:${env.PORT}`);
  console.log(`Swagger: http://localhost:${env.PORT}/docs  | Pembayaran: ${env.PAYMENT_PROVIDER}`);
});

// Pesanan PENDING yang melewati batas bayar otomatis menjadi EXPIRED
const expiryJob = setInterval(() => {
  expireStaleOrders().catch((err) => console.error("Job expire gagal:", err));
}, 30_000);

async function shutdown() {
  clearInterval(expiryJob);
  server.closeAllConnections(); // putuskan koneksi SSE
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
