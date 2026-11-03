CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'DEPOSIT', 'PAID');

CREATE TABLE "WeddingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partner" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "budget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeddingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT NOT NULL DEFAULT '',
    "planned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actual" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "planId" TEXT NOT NULL,
    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeddingPlan_updatedAt_idx" ON "WeddingPlan"("updatedAt");
CREATE INDEX "BudgetItem_planId_idx" ON "BudgetItem"("planId");
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "WeddingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
