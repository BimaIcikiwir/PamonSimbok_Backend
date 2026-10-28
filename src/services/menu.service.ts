import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { pushToCashiers } from "../lib/sse.js";
import type { CreateMenuItemInput, UpdateMenuItemInput } from "../validators/menu.validator.js";
import type { MenuItem } from "../generated/prisma/client.js";

export const toMenuItemDto = (m: MenuItem) => ({
  id: m.id,
  categoryId: m.categoryId,
  name: m.name,
  description: m.description,
  price: m.price,
  imageUrl: m.imageUrl,
  isAvailable: m.isAvailable,
});

export async function getMenu() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    items: c.items.map(toMenuItemDto),
  }));
}

async function ensureItem(id: number) {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) throw new AppError(404, "MENU_NOT_FOUND", "Menu tidak ditemukan");
  return item;
}

export async function createMenuItem(input: CreateMenuItemInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new AppError(404, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan");
  const item = await prisma.menuItem.create({ data: input });
  const dto = toMenuItemDto(item);
  pushToCashiers("menu.updated", dto);
  return dto;
}

export async function updateMenuItem(id: number, input: UpdateMenuItemInput) {
  await ensureItem(id);
  const item = await prisma.menuItem.update({ where: { id }, data: input });
  const dto = toMenuItemDto(item);
  pushToCashiers("menu.updated", dto);
  return dto;
}

export async function setAvailability(id: number, isAvailable: boolean) {
  return updateMenuItem(id, { isAvailable });
}
