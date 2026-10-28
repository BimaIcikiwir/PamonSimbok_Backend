import "dotenv/config";
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z
  .object({
    PORT: z.coerce.number().int().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET minimal 16 karakter"),
    JWT_EXPIRES_IN: z.string().default("12h"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    PAYMENT_PROVIDER: z.enum(["simulator", "midtrans"]).default("simulator"),
    MIDTRANS_SERVER_KEY: z.string().optional(),
    MIDTRANS_IS_PRODUCTION: bool,
    QRIS_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(15),
    CASH_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(10),
  })
  .superRefine((v, ctx) => {
    if (v.PAYMENT_PROVIDER === "midtrans" && !v.MIDTRANS_SERVER_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["MIDTRANS_SERVER_KEY"],
        message: "MIDTRANS_SERVER_KEY wajib diisi jika PAYMENT_PROVIDER=midtrans",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Konfigurasi .env tidak valid:");
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
