-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBaseCurrency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "expiryDate" DATE,
    "source" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyGainLoss" (
    "id" TEXT NOT NULL,
    "transactionType" VARCHAR(50) NOT NULL,
    "transactionId" VARCHAR(100) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "originalRate" DOUBLE PRECISION NOT NULL,
    "settlementAmount" DOUBLE PRECISION,
    "settlementRate" DOUBLE PRECISION,
    "gainLossAmount" DOUBLE PRECISION NOT NULL,
    "gainLossType" VARCHAR(20) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "glAccountId" VARCHAR(100),
    "journalEntryId" VARCHAR(100),
    "fiscalPeriod" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyGainLoss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE INDEX "Currency_isBaseCurrency_idx" ON "Currency"("isBaseCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_effectiveDate_key" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_effectiveDate_idx" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectiveDate_idx" ON "ExchangeRate"("effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_isActive_idx" ON "ExchangeRate"("isActive");

-- CreateIndex
CREATE INDEX "CurrencyGainLoss_transactionType_transactionId_idx" ON "CurrencyGainLoss"("transactionType", "transactionId");

-- CreateIndex
CREATE INDEX "CurrencyGainLoss_currencyId_idx" ON "CurrencyGainLoss"("currencyId");

-- CreateIndex
CREATE INDEX "CurrencyGainLoss_gainLossType_idx" ON "CurrencyGainLoss"("gainLossType");

-- CreateIndex
CREATE INDEX "CurrencyGainLoss_fiscalPeriod_idx" ON "CurrencyGainLoss"("fiscalPeriod");

-- CreateIndex
CREATE INDEX "CurrencyGainLoss_transactionDate_idx" ON "CurrencyGainLoss"("transactionDate");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyGainLoss" ADD CONSTRAINT "CurrencyGainLoss_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
