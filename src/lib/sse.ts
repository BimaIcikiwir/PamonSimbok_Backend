import type { Request, Response } from "express";

// Hub SSE di memori. Cukup untuk 1 instance server.
// Jika nanti dijalankan > 1 instance, ganti dengan Redis pub/sub.
const customers = new Map<string, Set<Response>>();
const cashiers = new Set<Response>();

export function openStream(req: Request, res: Response) {
  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  req.on("close", () => res.end());
}

export function sendEvent(res: Response, event: string, data: unknown) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* koneksi sudah putus */
  }
}

export function registerCustomer(code: string, res: Response) {
  let set = customers.get(code);
  if (!set) customers.set(code, (set = new Set()));
  const mine = set;
  mine.add(res);
  res.on("close", () => {
    mine.delete(res);
    if (mine.size === 0) customers.delete(code);
  });
}

export function registerCashier(res: Response) {
  cashiers.add(res);
  res.on("close", () => cashiers.delete(res));
}

export function pushToCustomer(code: string, event: string, data: unknown) {
  customers.get(code)?.forEach((res) => sendEvent(res, event, data));
}

export function pushToCashiers(event: string, data: unknown) {
  cashiers.forEach((res) => sendEvent(res, event, data));
}

// Heartbeat agar koneksi tidak diputus proxy/browser saat sepi
setInterval(() => {
  const ping = (res: Response) => {
    try {
      res.write(": ping\n\n");
    } catch {
      /* abaikan */
    }
  };
  cashiers.forEach(ping);
  customers.forEach((set) => set.forEach(ping));
}, 25_000).unref();
