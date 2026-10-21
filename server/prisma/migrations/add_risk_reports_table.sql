-- CreateTable: RiskReport
-- This migration adds the risk_reports table for storing financial risk assessment reports

CREATE TABLE IF NOT EXISTS "RiskReport" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "reportType" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "reportData" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskReport_reportDate_idx" ON "RiskReport"("reportDate");
CREATE INDEX "RiskReport_reportType_idx" ON "RiskReport"("reportType");
CREATE INDEX "RiskReport_currency_idx" ON "RiskReport"("currency");
CREATE INDEX "RiskReport_reportType_currency_reportDate_idx" ON "RiskReport"("reportType", "currency", "reportDate");

-- Add comment
COMMENT ON TABLE "RiskReport" IS 'Financial risk management reports including currency, interest rate, and credit risk assessments';
