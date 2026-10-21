import { Request, Response } from 'express';
import * as localizationService from '../services/localizationService';

/**
 * Get all localizations
 */
export async function getAllLocalizations(req: Request, res: Response) {
  try {
    const localizations = await localizationService.getAllLocalizations();
    res.json(localizations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get localization by country code
 */
export async function getLocalizationByCountry(req: Request, res: Response) {
  try {
    const { countryCode } = req.params;
    const localization = await localizationService.getLocalizationByCountry(countryCode);
    
    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }
    
    res.json(localization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create localization
 */
export async function createLocalization(req: Request, res: Response) {
  try {
    const localization = await localizationService.createLocalization(req.body);
    res.status(201).json(localization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update localization
 */
export async function updateLocalization(req: Request, res: Response) {
  try {
    const { countryCode } = req.params;
    const localization = await localizationService.updateLocalization(countryCode, req.body);
    res.json(localization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Format currency
 */
export async function formatCurrency(req: Request, res: Response) {
  try {
    const { amount, countryCode } = req.body;
    
    const localization = await localizationService.getLocalizationByCountry(countryCode);
    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }
    
    const formatted = localizationService.formatCurrency(amount, localization);
    res.json({ formatted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Format date
 */
export async function formatDate(req: Request, res: Response) {
  try {
    const { date, countryCode } = req.body;
    
    const localization = await localizationService.getLocalizationByCountry(countryCode);
    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }
    
    const formatted = localizationService.formatDate(new Date(date), localization);
    res.json({ formatted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get translations by localization
 */
export async function getTranslationsByLocalization(req: Request, res: Response) {
  try {
    const { localizationId } = req.params;
    const { module } = req.query;
    
    const translations = await localizationService.getTranslationsByLocalization(
      localizationId,
      module as string | undefined
    );
    
    res.json(translations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Upsert translation
 */
export async function upsertTranslation(req: Request, res: Response) {
  try {
    const translation = await localizationService.upsertTranslation(req.body);
    res.json(translation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Translate content
 */
export async function translate(req: Request, res: Response) {
  try {
    const { key, localizationId, fallback } = req.body;
    
    const translated = await localizationService.translate(key, localizationId, fallback);
    res.json({ translated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Bulk import translations
 */
export async function bulkImportTranslations(req: Request, res: Response) {
  try {
    const { localizationId, translations, module } = req.body;
    
    const result = await localizationService.bulkImportTranslations(localizationId, translations, module);
    res.json({ imported: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Seed default localizations
 */
export async function seedDefaultLocalizations(req: Request, res: Response) {
  try {
    const result = await localizationService.seedDefaultLocalizations();
    res.json({ seeded: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
