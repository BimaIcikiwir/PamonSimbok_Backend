// Spesifikasi OpenAPI 3 (ditulis manual agar selalu sinkron dengan kontrak FE).
// UI: /docs  |  JSON untuk import Postman: /docs.json

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const success = (data: object, description = "Berhasil") => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "OK" },
          data,
          meta: { type: "object" },
        },
      },
    },
  },
});

const failure = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("Error") } },
});

const sse = (description: string) => ({
  description,
  content: { "text/event-stream": { schema: { type: "string" } } },
});

const body = (schema: object, example?: object) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const codeParam = {
  name: "code",
  in: "path",
  required: true,
  schema: { type: "string" },
  example: "A7K2X9",
  description: "Kode pesanan (6 karakter)",
};
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 };
const auth = [{ bearerAuth: [] }];

const e400 = failure("VALIDATION_ERROR");
const e401 = failure("UNAUTHORIZED");
const e404 = failure("NOT_FOUND");
const e409 = failure("INVALID_STATUS / ORDER_EXPIRED");

const orderItemInput = {
  type: "object",
  required: ["menuItemId", "quantity"],
  properties: {
    menuItemId: { type: "integer", example: 1 },
    quantity: { type: "integer", minimum: 1, maximum: 50, example: 2 },
    note: { type: "string", example: "tidak pedas" },
  },
};

const stateAction = (summary: string, description: string) => ({
  tags: ["Kasir - Pesanan"],
  summary,
  description,
  security: auth,
  parameters: [codeParam],
  responses: {
    200: success(ref("CashierOrder")),
    401: e401,
    404: e404,
    409: e409,
  },
});

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Pamon Simbok API",
    version: "1.0.0",
    description:
      "Backend pemesanan makanan Pamon Simbok (pelanggan + kasir).\n\n" +
      "Semua response sukses: `{ success: true, message, data, meta? }`. " +
      "Semua error: `{ success: false, code, message, errors? }`.\n\n" +
      "Untuk endpoint kasir: panggil `POST /api/auth/login`, salin `data.token`, lalu klik **Authorize**.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Umum" },
    { name: "Pelanggan" },
    { name: "Pembayaran" },
    { name: "Auth" },
    { name: "Kasir - Pesanan" },
    { name: "Kasir - Menu" },
    { name: "Kasir - Realtime" },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: { path: { type: "string" }, message: { type: "string" } },
            },
          },
        },
      },
      MenuItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          categoryId: { type: "integer", example: 1 },
          name: { type: "string", example: "Nasi Pecel" },
          description: { type: "string", nullable: true },
          price: { type: "integer", example: 15000 },
          imageUrl: { type: "string", nullable: true },
          isAvailable: { type: "boolean", example: true },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string", example: "Makanan" },
          sortOrder: { type: "integer" },
          items: { type: "array", items: ref("MenuItem") },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          menuItemId: { type: "integer" },
          name: { type: "string" },
          price: { type: "integer" },
          quantity: { type: "integer" },
          note: { type: "string", nullable: true },
          subtotal: { type: "integer" },
        },
      },
      Payment: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["SIMULATOR", "MIDTRANS", "CASH"] },
          method: { type: "string", enum: ["QRIS", "CASH"] },
          status: { type: "string", enum: ["PENDING", "PAID", "FAILED", "EXPIRED"] },
          amount: { type: "integer" },
          qrString: { type: "string", nullable: true, description: "Render jadi gambar QR di FE" },
          qrUrl: { type: "string", nullable: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          paidAt: { type: "string", format: "date-time", nullable: true },
          isSimulated: { type: "boolean", description: "true = tampilkan tombol Simulasi bayar" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          code: { type: "string", example: "A7K2X9" },
          queueNumber: { type: "integer", example: 12 },
          queueLabel: { type: "string", example: "#012" },
          queueDate: { type: "string", example: "2026-10-27" },
          customerName: { type: "string", example: "Budi" },
          orderType: { type: "string", enum: ["DINE_IN", "TAKE_AWAY"] },
          tableNumber: { type: "integer", nullable: true },
          status: { type: "string", enum: ["PENDING", "PAID", "READY", "COMPLETED", "EXPIRED"] },
          statusLabel: { type: "string", example: "Menunggu pembayaran" },
          paymentMethod: { type: "string", enum: ["QRIS", "CASH"] },
          notifyPreference: { type: "string", enum: ["SOUND", "MESSAGE"] },
          subtotal: { type: "integer" },
          total: { type: "integer" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          paidAt: { type: "string", format: "date-time", nullable: true },
          readyAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          items: { type: "array", items: ref("OrderItem") },
          payment: { ...ref("Payment"), nullable: true },
        },
      },
      CashierOrder: {
        allOf: [
          ref("Order"),
          {
            type: "object",
            properties: {
              internalNote: { type: "string", nullable: true },
              source: { type: "string", enum: ["CUSTOMER", "CASHIER"] },
            },
          },
        ],
      },
      CreateOrderRequest: {
        type: "object",
        required: ["customerName", "orderType", "paymentMethod", "items"],
        properties: {
          customerName: { type: "string", example: "Budi" },
          orderType: { type: "string", enum: ["DINE_IN", "TAKE_AWAY"] },
          tableNumber: { type: "integer", example: 5, description: "Wajib jika DINE_IN" },
          paymentMethod: { type: "string", enum: ["QRIS", "CASH"] },
          notifyPreference: { type: "string", enum: ["SOUND", "MESSAGE"], default: "SOUND" },
          items: { type: "array", items: orderItemInput },
        },
      },
      CashierCreateOrderRequest: {
        type: "object",
        required: ["customerName", "orderType", "items"],
        properties: {
          customerName: { type: "string", example: "Ibu Sari" },
          orderType: { type: "string", enum: ["DINE_IN", "TAKE_AWAY"] },
          tableNumber: { type: "integer", description: "Wajib jika DINE_IN" },
          notifyPreference: { type: "string", enum: ["SOUND", "MESSAGE"], default: "SOUND" },
          items: { type: "array", items: orderItemInput },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Umum"],
        summary: "Cek server & mode pembayaran",
        responses: { 200: success({ type: "object", properties: { status: { type: "string" }, paymentProvider: { type: "string", enum: ["simulator", "midtrans"] } } }) },
      },
    },
    "/api/menu": {
      get: {
        tags: ["Pelanggan"],
        summary: "Daftar menu per kategori (termasuk yang habis)",
        responses: { 200: success({ type: "array", items: ref("Category") }) },
      },
    },
    "/api/tables/{number}": {
      get: {
        tags: ["Pelanggan"],
        summary: "Validasi nomor meja dari QR",
        parameters: [{ name: "number", in: "path", required: true, schema: { type: "integer" }, example: 5 }],
        responses: {
          200: success({ type: "object", properties: { number: { type: "integer" }, isActive: { type: "boolean" } } }),
          404: failure("TABLE_NOT_FOUND"),
        },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Pelanggan"],
        summary: "Buat pesanan",
        description:
          "Harga dihitung server. QRIS: response berisi `payment.qrString`. Tunai: status PENDING sampai kasir menerima pembayaran. Batas bayar QRIS 15 menit, tunai 10 menit.",
        requestBody: body(ref("CreateOrderRequest"), {
          customerName: "Budi",
          orderType: "DINE_IN",
          tableNumber: 5,
          paymentMethod: "QRIS",
          notifyPreference: "SOUND",
          items: [{ menuItemId: 1, quantity: 2, note: "tidak pedas" }],
        }),
        responses: {
          201: success(ref("Order"), "Pesanan dibuat"),
          400: e400,
          404: failure("TABLE_NOT_FOUND / MENU_NOT_FOUND"),
          422: failure("MENU_UNAVAILABLE"),
          502: failure("PAYMENT_GATEWAY_ERROR"),
        },
      },
    },
    "/api/orders/{code}": {
      get: {
        tags: ["Pelanggan"],
        summary: "Status pesanan (link pelacak)",
        parameters: [codeParam],
        responses: { 200: success(ref("Order")), 404: failure("ORDER_NOT_FOUND") },
      },
    },
    "/api/orders/{code}/stream": {
      get: {
        tags: ["Pelanggan"],
        summary: "SSE status pesanan real-time",
        description:
          "Event `order.updated` (data = objek Order). Event pertama dikirim langsung saat tersambung.",
        parameters: [codeParam],
        responses: { 200: sse("Stream event"), 404: failure("ORDER_NOT_FOUND") },
      },
    },
    "/api/payments/{code}/simulate": {
      post: {
        tags: ["Pembayaran"],
        summary: "Simulasi pembayaran QRIS (hanya PAYMENT_PROVIDER=simulator)",
        parameters: [codeParam],
        requestBody: body(
          { type: "object", properties: { result: { type: "string", enum: ["SUCCESS", "EXPIRE"], default: "SUCCESS" } } },
          { result: "SUCCESS" },
        ),
        responses: { 200: success(ref("Order")), 403: failure("SIMULATOR_DISABLED"), 404: failure("ORDER_NOT_FOUND"), 409: failure("NOT_QRIS_ORDER") },
      },
    },
    "/api/payments/midtrans/notification": {
      post: {
        tags: ["Pembayaran"],
        summary: "Webhook Midtrans (bukan untuk FE)",
        description: "Diverifikasi dengan signature_key. Daftarkan URL ini di dashboard Midtrans.",
        requestBody: body({ type: "object", additionalProperties: true }),
        responses: { 200: success({ type: "object" }), 401: failure("INVALID_SIGNATURE"), 403: failure("MIDTRANS_DISABLED") },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login kasir/admin",
        requestBody: body(
          { type: "object", required: ["username", "password"], properties: { username: { type: "string" }, password: { type: "string" } } },
          { username: "kasir", password: "kasir123" },
        ),
        responses: {
          200: success({
            type: "object",
            properties: {
              token: { type: "string" },
              user: { type: "object", properties: { id: { type: "string" }, username: { type: "string" }, name: { type: "string" }, role: { type: "string", enum: ["ADMIN", "CASHIER"] } } },
            },
          }),
          400: e400,
          401: e401,
        },
      },
    },
    "/api/auth/me": {
      get: { tags: ["Auth"], summary: "Data akun yang sedang login", security: auth, responses: { 200: success({ type: "object" }), 401: e401 } },
    },
    "/api/cashier/orders": {
      get: {
        tags: ["Kasir - Pesanan"],
        summary: "Daftar pesanan (default: hari ini, terlama dulu)",
        security: auth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string" }, example: "PAID,READY", description: "Pisahkan dengan koma" },
          { name: "orderType", in: "query", schema: { type: "string", enum: ["DINE_IN", "TAKE_AWAY"] } },
          { name: "paymentMethod", in: "query", schema: { type: "string", enum: ["QRIS", "CASH"] } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Nama, kode, atau nomor antrean" },
          { name: "date", in: "query", schema: { type: "string" }, example: "2026-10-27" },
          { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 200 } },
        ],
        responses: { 200: success({ type: "array", items: ref("CashierOrder") }), 400: e400, 401: e401 },
      },
      post: {
        tags: ["Kasir - Pesanan"],
        summary: "Input pesanan manual (tunai, langsung PAID)",
        security: auth,
        requestBody: body(ref("CashierCreateOrderRequest"), {
          customerName: "Ibu Sari",
          orderType: "TAKE_AWAY",
          items: [{ menuItemId: 1, quantity: 1 }],
        }),
        responses: { 201: success(ref("CashierOrder")), 400: e400, 401: e401, 422: failure("MENU_UNAVAILABLE") },
      },
    },
    "/api/cashier/orders/{code}": {
      get: {
        tags: ["Kasir - Pesanan"],
        summary: "Detail pesanan",
        security: auth,
        parameters: [codeParam],
        responses: { 200: success(ref("CashierOrder")), 401: e401, 404: e404 },
      },
    },
    "/api/cashier/orders/{code}/pay": {
      patch: stateAction("Terima pembayaran tunai (PENDING -> PAID)", "Hanya untuk pesanan CASH yang masih PENDING."),
    },
    "/api/cashier/orders/{code}/ready": {
      patch: stateAction("Makanan siap (PAID -> READY)", "Memicu event order.updated ke pelanggan."),
    },
    "/api/cashier/orders/{code}/complete": {
      patch: stateAction("Sudah diambil (READY -> COMPLETED)", "Berlaku untuk dine-in maupun take away."),
    },
    "/api/cashier/orders/{code}/note": {
      patch: {
        tags: ["Kasir - Pesanan"],
        summary: "Catatan internal kasir",
        security: auth,
        parameters: [codeParam],
        requestBody: body(
          { type: "object", required: ["internalNote"], properties: { internalNote: { type: "string", nullable: true } } },
          { internalNote: "Pelanggan minta tambah nasi" },
        ),
        responses: { 200: success(ref("CashierOrder")), 400: e400, 401: e401, 404: e404 },
      },
    },
    "/api/cashier/menu-items/{id}/availability": {
      patch: {
        tags: ["Kasir - Menu"],
        summary: "Tandai menu habis / tersedia",
        security: auth,
        parameters: [idParam],
        requestBody: body({ type: "object", required: ["isAvailable"], properties: { isAvailable: { type: "boolean" } } }, { isAvailable: false }),
        responses: { 200: success(ref("MenuItem")), 401: e401, 404: failure("MENU_NOT_FOUND") },
      },
    },
    "/api/cashier/menu-items": {
      post: {
        tags: ["Kasir - Menu"],
        summary: "Tambah menu (ADMIN)",
        security: auth,
        requestBody: body(
          {
            type: "object",
            required: ["categoryId", "name", "price"],
            properties: {
              categoryId: { type: "integer" },
              name: { type: "string" },
              description: { type: "string" },
              price: { type: "integer" },
              imageUrl: { type: "string" },
              isAvailable: { type: "boolean", default: true },
            },
          },
          { categoryId: 1, name: "Nasi Liwet", description: "Nasi gurih khas Solo", price: 20000 },
        ),
        responses: { 201: success(ref("MenuItem")), 400: e400, 401: e401, 403: failure("FORBIDDEN") },
      },
    },
    "/api/cashier/menu-items/{id}": {
      patch: {
        tags: ["Kasir - Menu"],
        summary: "Ubah menu (ADMIN, field parsial)",
        security: auth,
        parameters: [idParam],
        requestBody: body({ type: "object", properties: { name: { type: "string" }, price: { type: "integer" }, description: { type: "string", nullable: true }, imageUrl: { type: "string", nullable: true }, categoryId: { type: "integer" }, isAvailable: { type: "boolean" } } }, { price: 17000 }),
        responses: { 200: success(ref("MenuItem")), 400: e400, 401: e401, 403: failure("FORBIDDEN"), 404: failure("MENU_NOT_FOUND") },
      },
    },
    "/api/cashier/stream": {
      get: {
        tags: ["Kasir - Realtime"],
        summary: "SSE untuk kasir",
        description:
          "Auth lewat query `?token=JWT` (EventSource tidak bisa kirim header). Event: `order.pending_cash`, `order.paid`, `order.ready`, `order.completed`, `order.expired` (data = CashierOrder) dan `menu.updated` (data = MenuItem).",
        parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: sse("Stream event"), 401: e401 },
      },
    },
  },
};
