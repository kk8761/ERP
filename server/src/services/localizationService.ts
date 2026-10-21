import prisma from '../config/prisma';

/**
 * Localization Service
 * Handles country-specific settings, translations, and formatting
 */

export interface LocalizationData {
  countryCode: string;
  countryName: string;
  languageCode: string;
  languageName: string;
  currencyCode: string;
  currencySymbol: string;
  currencyFormat: string;
  decimalSeparator: string;
  thousandSeparator: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  firstDayOfWeek: number;
  numberFormat: string;
  defaultTaxType?: string;
  taxIdLabel?: string;
  addressFormat: string;
  postalCodeFormat?: string;
  isActive?: boolean;
  notes?: string;
}

export interface TranslationData {
  translationKey: string;
  translatedText: string;
  localizationId: string;
  module?: string;
  context?: string;
  isApproved?: boolean;
  translatedBy?: string;
  approvedBy?: string;
}

/**
 * Get all active localizations
 */
export async function getAllLocalizations() {
  return await prisma.localization.findMany({
    where: { isActive: true },
    orderBy: { countryName: 'asc' },
  });
}

/**
 * Get localization by country code
 */
export async function getLocalizationByCountry(countryCode: string) {
  return await prisma.localization.findUnique({
    where: { countryCode },
    include: { translations: true },
  });
}

/**
 * Create a new localization
 */
export async function createLocalization(data: LocalizationData) {
  return await prisma.localization.create({
    data: {
      countryCode: data.countryCode,
      countryName: data.countryName,
      languageCode: data.languageCode,
      languageName: data.languageName,
      currencyCode: data.currencyCode,
      currencySymbol: data.currencySymbol,
      currencyFormat: data.currencyFormat,
      decimalSeparator: data.decimalSeparator,
      thousandSeparator: data.thousandSeparator,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      timezone: data.timezone,
      firstDayOfWeek: data.firstDayOfWeek,
      numberFormat: data.numberFormat,
      defaultTaxType: data.defaultTaxType,
      taxIdLabel: data.taxIdLabel,
      addressFormat: data.addressFormat,
      postalCodeFormat: data.postalCodeFormat,
      isActive: data.isActive ?? true,
      notes: data.notes,
    },
  });
}

/**
 * Update localization
 */
export async function updateLocalization(countryCode: string, data: Partial<LocalizationData>) {
  return await prisma.localization.update({
    where: { countryCode },
    data,
  });
}

/**
 * Format currency according to locale
 */
export function formatCurrency(amount: number, localization: LocalizationData): string {
  const { decimalSeparator, thousandSeparator, currencySymbol } = localization;
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart = '00'] = amount.toFixed(2).split('.');
  
  // Add thousand separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
  // Combine with decimal separator
  const formattedAmount = `${formattedInteger}${decimalSeparator}${decimalPart}`;
  
  // Apply currency format template
  return localization.currencyFormat
    .replace('1,234.56', formattedAmount)
    .replace('$', currencySymbol);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, localization: LocalizationData): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return localization.dateFormat
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', String(year));
}

/**
 * Format number according to locale
 */
export function formatNumber(num: number, localization: LocalizationData): string {
  const { decimalSeparator, thousandSeparator } = localization;
  
  const [integerPart, decimalPart] = num.toString().split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
  if (decimalPart) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }
  
  return formattedInteger;
}

/**
 * Get translation by key and localization
 */
export async function getTranslation(translationKey: string, localizationId: string) {
  return await prisma.translation.findUnique({
    where: {
      translationKey_localizationId: {
        translationKey,
        localizationId,
      },
    },
  });
}

/**
 * Get all translations for a localization
 */
export async function getTranslationsByLocalization(localizationId: string, module?: string) {
  return await prisma.translation.findMany({
    where: {
      localizationId,
      ...(module && { module }),
    },
    orderBy: { translationKey: 'asc' },
  });
}

/**
 * Create or update translation
 */
export async function upsertTranslation(data: TranslationData) {
  return await prisma.translation.upsert({
    where: {
      translationKey_localizationId: {
        translationKey: data.translationKey,
        localizationId: data.localizationId,
      },
    },
    create: {
      translationKey: data.translationKey,
      translatedText: data.translatedText,
      localizationId: data.localizationId,
      module: data.module,
      context: data.context,
      isApproved: data.isApproved ?? false,
      translatedBy: data.translatedBy,
      approvedBy: data.approvedBy,
    },
    update: {
      translatedText: data.translatedText,
      module: data.module,
      context: data.context,
      isApproved: data.isApproved,
      translatedBy: data.translatedBy,
      approvedBy: data.approvedBy,
    },
  });
}

/**
 * Translate content using stored translations
 */
export async function translate(key: string, localizationId: string, fallback?: string): Promise<string> {
  const translation = await getTranslation(key, localizationId);
  return translation?.translatedText || fallback || key;
}

/**
 * Bulk import translations
 */
export async function bulkImportTranslations(localizationId: string, translations: Record<string, string>, module?: string) {
  const operations = Object.entries(translations).map(([key, text]) =>
    prisma.translation.upsert({
      where: {
        translationKey_localizationId: {
          translationKey: key,
          localizationId,
        },
      },
      create: {
        translationKey: key,
        translatedText: text,
        localizationId,
        module,
      },
      update: {
        translatedText: text,
        module,
      },
    })
  );
  
  return await prisma.$transaction(operations);
}

/**
 * Seed default localizations for 50+ countries
 */
export async function seedDefaultLocalizations() {
  const defaultLocalizations: LocalizationData[] = [
    {
      countryCode: 'US',
      countryName: 'United States',
      languageCode: 'en-US',
      languageName: 'English (US)',
      currencyCode: 'USD',
      currencySymbol: '$',
      currencyFormat: '$1,234.56',
      decimalSeparator: '.',
      thousandSeparator: ',',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'hh:mm:ss A',
      timezone: 'America/New_York',
      firstDayOfWeek: 0,
      numberFormat: '1,234.56',
      defaultTaxType: 'Sales Tax',
      taxIdLabel: 'Tax ID',
      addressFormat: JSON.stringify({ format: '{street}\n{city}, {state} {zip}\n{country}' }),
      postalCodeFormat: '^\\d{5}(-\\d{4})?$',
    },
    {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      languageCode: 'en-GB',
      languageName: 'English (UK)',
      currencyCode: 'GBP',
      currencySymbol: '£',
      currencyFormat: '£1,234.56',
      decimalSeparator: '.',
      thousandSeparator: ',',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm:ss',
      timezone: 'Europe/London',
      firstDayOfWeek: 1,
      numberFormat: '1,234.56',
      defaultTaxType: 'VAT',
      taxIdLabel: 'VAT Number',
      addressFormat: JSON.stringify({ format: '{street}\n{city}\n{postcode}\n{country}' }),
      postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$',
    },
    {
      countryCode: 'DE',
      countryName: 'Germany',
      languageCode: 'de-DE',
      languageName: 'Deutsch',
      currencyCode: 'EUR',
      currencySymbol: '€',
      currencyFormat: '1.234,56 €',
      decimalSeparator: ',',
      thousandSeparator: '.',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm:ss',
      timezone: 'Europe/Berlin',
      firstDayOfWeek: 1,
      numberFormat: '1.234,56',
      defaultTaxType: 'VAT',
      taxIdLabel: 'USt-IdNr.',
      addressFormat: JSON.stringify({ format: '{street}\n{zip} {city}\n{country}' }),
      postalCodeFormat: '^\\d{5}$',
    },
    {
      countryCode: 'FR',
      countryName: 'France',
      languageCode: 'fr-FR',
      languageName: 'Français',
      currencyCode: 'EUR',
      currencySymbol: '€',
      currencyFormat: '1 234,56 €',
      decimalSeparator: ',',
      thousandSeparator: ' ',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm:ss',
      timezone: 'Europe/Paris',
      firstDayOfWeek: 1,
      numberFormat: '1 234,56',
      defaultTaxType: 'VAT',
      taxIdLabel: 'Numéro de TVA',
      addressFormat: JSON.stringify({ format: '{street}\n{zip} {city}\n{country}' }),
      postalCodeFormat: '^\\d{5}$',
    },
    {
      countryCode: 'IN',
      countryName: 'India',
      languageCode: 'en-IN',
      languageName: 'English (India)',
      currencyCode: 'INR',
      currencySymbol: '₹',
      currencyFormat: '₹1,234.56',
      decimalSeparator: '.',
      thousandSeparator: ',',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'hh:mm:ss A',
      timezone: 'Asia/Kolkata',
      firstDayOfWeek: 0,
      numberFormat: '1,234.56',
      defaultTaxType: 'GST',
      taxIdLabel: 'GSTIN',
      addressFormat: JSON.stringify({ format: '{street}\n{city} - {pin}\n{state}, {country}' }),
      postalCodeFormat: '^\\d{6}$',
    },
    // Add more countries as needed...
  ];
  
  const operations = defaultLocalizations.map((loc) =>
    prisma.localization.upsert({
      where: { countryCode: loc.countryCode },
      create: loc,
      update: loc,
    })
  );
  
  return await prisma.$transaction(operations);
}
