import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  // Akun kasir & admin (ganti password setelah deploy!)
  const users = [
    { username: "admin", password: "admin123", name: "Admin Simbok", role: "ADMIN" as const },
    { username: "kasir", password: "kasir123", name: "Kasir 1", role: "CASHIER" as const },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      },
    });
  }

  // Meja 1-10
  for (let number = 1; number <= 10; number++) {
    await prisma.table.upsert({ where: { number }, update: {}, create: { number } });
  }

  // Menu contoh (hanya diisi jika masih kosong)
  if ((await prisma.menuItem.count()) === 0) {
    const catalog = [
      {
        name: "Makanan",
        sortOrder: 1,
        items: [
          ["Nasi Pecel", "Sayur rebus, bumbu kacang, rempeyek", 15000],
          ["Gudeg Jogja", "Nangka muda, ayam, telur, krecek", 22000],
          ["Soto Ayam Lamongan", "Kuah kuning, koya, telur", 18000],
          ["Rawon", "Kuah kluwek, daging sapi, tauge", 24000],
        ],
      },
      {
        name: "Jajanan",
        sortOrder: 2,
        items: [
          ["Tempe Mendoan", "3 potong, sambal kecap", 8000],
          ["Tahu Isi", "4 potong, cabai rawit", 8000],
          ["Pisang Goreng", "5 potong", 10000],
        ],
      },
      {
        name: "Minuman",
        sortOrder: 3,
        items: [
          ["Es Teh Manis", "Teh tubruk, gula batu", 5000],
          ["Wedang Jahe", "Jahe, gula aren, serai", 7000],
          ["Es Dawet", "Santan, gula aren, cendol", 10000],
        ],
      },
    ] as const;

    for (const c of catalog) {
      const category = await prisma.category.upsert({
        where: { name: c.name },
        update: {},
        create: { name: c.name, sortOrder: c.sortOrder },
      });
      for (const [name, description, price] of c.items) {
        await prisma.menuItem.create({
          data: { categoryId: category.id, name, description, price },
        });
      }
    }
  }

  console.log("Seed selesai. Login: kasir / kasir123  |  admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
