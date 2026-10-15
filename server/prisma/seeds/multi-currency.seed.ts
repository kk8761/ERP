/**
 * Multi-Currency Seed Data
 * 
 * Seeds common currencies and exchange rates for testing and development
 */

import prisma from '../../src/config/prisma';

export async function seedMultiCurrency() {
  console.log('🌍 Seeding multi-currency data...');

  // Create common currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, isBaseCurrency: true },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  ];

  const createdCurrencies: any = {};

  for (const currency of currencies) {
    const existing = await prisma.currency.findUnique({
      where: { code: currency.code },
    });

    if (!existing) {
      const created = await prisma.currency.create({
        data: currency,
      });
      createdCurrencies[currency.code] = created;
      console.log(`  ✓ Created currency: ${currency.code} - ${currency.name}`);
    } else {
      createdCurrencies[currency.code] = existing;
      console.log(`  ⊙ Currency already exists: ${currency.code}`);
    }
  }

  // Create exchange rates (sample rates as of a reference date)
  const today = new Date();
  const exchangeRates = [
    // USD to other currencies
    { from: 'USD', to: 'EUR', rate: 0.85 },
    { from: 'USD', to: 'GBP', rate: 0.73 },
    { from: 'USD', to: 'JPY', rate: 110.50 },
    { from: 'USD', to: 'CNY', rate: 6.45 },
    { from: 'USD', to: 'INR', rate: 74.50 },
    { from: 'USD', to: 'AUD', rate: 1.35 },
    { from: 'USD', to: 'CAD', rate: 1.25 },
    { from: 'USD', to: 'CHF', rate: 0.92 },
    { from: 'USD', to: 'SGD', rate: 1.35 },

    // Reverse rates (other currencies to USD)
    { from: 'EUR', to: 'USD', rate: 1.18 },
    { from: 'GBP', to: 'USD', rate: 1.37 },
    { from: 'JPY', to: 'USD', rate: 0.0091 },
    { from: 'CNY', to: 'USD', rate: 0.155 },
    { from: 'INR', to: 'USD', rate: 0.0134 },
    { from: 'AUD', to: 'USD', rate: 0.74 },
    { from: 'CAD', to: 'USD', rate: 0.80 },
    { from: 'CHF', to: 'USD', rate: 1.09 },
    { from: 'SGD', to: 'USD', rate: 0.74 },

    // Cross rates (EUR to other currencies)
    { from: 'EUR', to: 'GBP', rate: 0.86 },
    { from: 'EUR', to: 'JPY', rate: 130.00 },
    { from: 'EUR', to: 'CNY', rate: 7.60 },

    // Cross rates (GBP to other currencies)
    { from: 'GBP', to: 'EUR', rate: 1.16 },
    { from: 'GBP', to: 'JPY', rate: 151.00 },
  ];

  let ratesCreated = 0;
  let ratesSkipped = 0;

  for (const rate of exchangeRates) {
    const fromCurrency = createdCurrencies[rate.from];
    const toCurrency = createdCurrencies[rate.to];

    if (!fromCurrency || !toCurrency) {
      console.log(`  ⚠ Skipping rate ${rate.from}/${rate.to}: Currency not found`);
      continue;
    }

    const existing = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrencyId_toCurrencyId_effectiveDate: {
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
          effectiveDate: today,
        },
      },
    });

    if (!existing) {
      await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
          rate: rate.rate,
          effectiveDate: today,
          source: 'seed',
        },
      });
      ratesCreated++;
    } else {
      ratesSkipped++;
    }
  }

  console.log(`  ✓ Created ${ratesCreated} exchange rates`);
  if (ratesSkipped > 0) {
    console.log(`  ⊙ Skipped ${ratesSkipped} existing exchange rates`);
  }

  console.log('✅ Multi-currency seed completed\n');
}

// Run if executed directly
if (require.main === module) {
  seedMultiCurrency()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

