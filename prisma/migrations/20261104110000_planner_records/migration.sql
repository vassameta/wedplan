CREATE TYPE "PlannerRecordKind" AS ENUM ('VENDOR', 'GUEST', 'TASK', 'PAYMENT');

CREATE TABLE "PlannerRecord" (
    "id" TEXT NOT NULL,
    "kind" "PlannerRecordKind" NOT NULL,
    "data" JSONB NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlannerRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlannerRecord_planId_kind_idx" ON "PlannerRecord"("planId", "kind");

ALTER TABLE "PlannerRecord"
ADD CONSTRAINT "PlannerRecord_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "WeddingPlan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
