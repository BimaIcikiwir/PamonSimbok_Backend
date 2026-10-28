// Tanggal "YYYY-MM-DD" menurut zona waktu Asia/Jakarta (dipakai untuk nomor antrean harian)
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayJakarta(date: Date = new Date()): string {
  return formatter.format(date);
}
