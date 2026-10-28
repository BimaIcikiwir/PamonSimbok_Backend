import { z } from "zod";

export const loginBody = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});
