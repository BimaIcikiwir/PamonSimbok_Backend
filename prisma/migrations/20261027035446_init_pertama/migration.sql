-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKE_AWAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'READY', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotifyPreference" AS ENUM ('SOUND', 'MESSAGE');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('CUSTOMER', 'CASHIER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueCounter" (
    "date" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QueueCounter_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Order" (
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

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
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

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Table_number_key" ON "Table"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE INDEX "Order_queueDate_status_idx" ON "Order"("queueDate", "status");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_queueDate_queueNumber_key" ON "Order"("queueDate", "queueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
