/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueueCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Table` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tableId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "MenuItem";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "QueueCounter";

-- DropTable
DROP TABLE "Table";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_counters" (
    "date" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "queue_counters_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "queueNumber" INTEGER NOT NULL,
    "queueDate" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "tableId" INTEGER,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notifyPreference" "NotifyPreference" NOT NULL DEFAULT 'SOUND',
    "source" "OrderSource" NOT NULL DEFAULT 'CUSTOMER',
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "internalNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "providerOrderId" TEXT,
    "transactionId" TEXT,
    "qrString" TEXT,
    "qrUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "tables_number_key" ON "tables"("number");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_queueDate_status_idx" ON "orders"("queueDate", "status");

-- CreateIndex
CREATE INDEX "orders_status_expiresAt_idx" ON "orders"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_queueDate_queueNumber_key" ON "orders"("queueDate", "queueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerOrderId_key" ON "payments"("providerOrderId");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
