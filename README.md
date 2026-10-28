# Pamon Simbok - Backend

Express 5 + TypeScript + Prisma 7 (PostgreSQL). Dokumentasi API: `http://localhost:3000/docs`
(JSON untuk import Postman: `/docs.json`).

## Menjalankan

```bash
npm install
cp .env.example .env            # lalu isi JWT_SECRET
docker compose up -d            # opsional: PostgreSQL lokal
npx prisma generate             # wajib setelah install (Prisma 7 tidak generate otomatis)
npx prisma migrate dev --name init
npx prisma db seed              # akun kasir, 10 meja, menu contoh
npm run dev
```

Akun seed: `kasir / kasir123` dan `admin / admin123` (ganti setelah deploy).

## Struktur

```
prisma/schema.prisma, seed.ts
prisma.config.ts               # konfigurasi Prisma 7 (URL database, seed)
src/index.ts                   # start server + job expire pesanan
src/app.ts                     # setup express, helmet, cors, swagger
src/{routes,controllers,services,validators,middleware,lib}
```

## Pembayaran

- `PAYMENT_PROVIDER=simulator` : tanpa akun apa pun. Gunakan `POST /api/payments/:code/simulate`.
- `PAYMENT_PROVIDER=midtrans`  : isi `MIDTRANS_SERVER_KEY` (sandbox). Daftarkan
  `https://<domain-publik>/api/payments/midtrans/notification` di dashboard Midtrans
  (saat lokal gunakan ngrok/cloudflared).
