import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// Prisma 7 memakai driver adapter: koneksi ke PostgreSQL dikelola oleh "pg".
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
