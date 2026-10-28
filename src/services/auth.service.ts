import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  // Pesan sama untuk username/password salah agar tidak membocorkan akun
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError(401, "UNAUTHORIZED", "Username atau password salah");

  const token = jwt.sign({ role: user.role, name: user.name }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
  return {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  };
}

export async function getMe(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Akun tidak ditemukan");
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}
