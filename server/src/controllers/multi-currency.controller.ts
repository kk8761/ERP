/**
 * Multi-Currency Controller
 * 
 * Handles HTTP requests for multi-currency operations
 */

import { Request, Response } from 'express';
import * as multiCurrencyService from '../services/multi-currency.service';

class MultiCurrencyController {
  // ============================================================================
  // Currency Management
  // ============================================================================

  static async createCurrency(req: Request, res: Response) {
    try {
      const currency = await multiCurrencyService.createCurrency(req.body);
      res.status(201).json(currency);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCurrencies(req: Request, res: Response) {
    try {
      const isActive = req.query.isActive === 'true' ? true : undefined;
      const currencies = await multiCurrencyService.getCurrencies({ isActive });
      res.json(currencies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCurrencyByCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const currency = await multiCurrencyService.getCurrencyByCode(code);
      
      if (!currency) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      
      res.json(currency);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getBaseCurrency(_req: Request, res: Response) {
    try {
      const currency = await multiCurrencyService.getBaseCurrency();
      
      if (!currency) {
        return res.status(404).json({ error: 'No base currency configured' });
      }
      
      res.json(currency);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCurrency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currency = await multiCurrencyService.updateCurrency(id, req.body);
      res.json(currency);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deactivateCurrency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currency = await multiCurrencyService.deactivateCurrency(id);
      res.json(currency);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Exchange Rate Management
  // ============================================================================

  static async setExchangeRate(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        effectiveDate: new Date(req.body.effectiveDate),
        ...(req.body.expiryDate && { expiryDate: new Date(req.body.expiryDate) }),
      };
      
      const rate = await multiCurrencyService.setExchangeRate(data);
      res.status(201).json(rate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getExchangeRate(req: Request, res: Response) {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const rate = await multiCurrencyService.getExchangeRate(
        fromCurrency,
        toCurrency,
        date
      );
      
      res.json({ 
        fromCurrency, 
        toCurrency, 
        rate, 
        date: date.toISOString() 
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async getExchangeRateHistory(req: Request, res: Response) {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const rates = await multiCurrencyService.getExchangeRateHistory(
        fromCurrency,
        toCurrency,
        startDate,
        endDate
      );
      
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getLatestExchangeRates(_req: Request, res: Response) {
    try {
      const rates = await multiCurrencyService.getLatestExchangeRates();
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deactivateExchangeRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const rate = await multiCurrencyService.deactivateExchangeRate(id);
      res.json(rate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Currency Conversion
  // ============================================================================

  static async convertCurrency(req: Request, res: Response) {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;
      const date = req.body.date ? new Date(req.body.date) : new Date();
      
      const convertedAmount = await multiCurrencyService.convertCurrency(
        parseFloat(amount),
        fromCurrency,
        toCurrency,
        date
      );
      
      res.json({
        originalAmount: parseFloat(amount),
        fromCurrency,
        toCurrency,
        convertedAmount,
        date: date.toISOString(),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async convertToBaseCurrency(req: Request, res: Response) {
    try {
      const { amount, fromCurrency } = req.body;
      const date = req.body.date ? new Date(req.body.date) : new Date();
      
      const convertedAmount = await multiCurrencyService.convertToBaseCurrency(
        parseFloat(amount),
        fromCurrency,
        date
      );
      
      const baseCurrency = await multiCurrencyService.getBaseCurrency();
      
      res.json({
        originalAmount: parseFloat(amount),
        fromCurrency,
        toCurrency: baseCurrency?.code,
        convertedAmount,
        date: date.toISOString(),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Currency Gains/Losses
  // ============================================================================

  static async recordCurrencyGainLoss(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        transactionDate: new Date(req.body.transactionDate),
        ...(req.body.settlementDate && { 
          settlementDate: new Date(req.body.settlementDate) 
        }),
      };
      
      const gainLoss = await multiCurrencyService.recordCurrencyGainLoss(data);
      res.status(201).json(gainLoss);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCurrencyGainsLosses(req: Request, res: Response) {
    try {
      const filters = {
        fiscalPeriod: req.query.fiscalPeriod as string,
        currencyCode: req.query.currencyCode as string,
        gainLossType: req.query.gainLossType as string,
        ...(req.query.startDate && { 
          startDate: new Date(req.query.startDate as string) 
        }),
        ...(req.query.endDate && { 
          endDate: new Date(req.query.endDate as string) 
        }),
      };
      
      const gainsLosses = await multiCurrencyService.getCurrencyGainsLosses(filters);
      res.json(gainsLosses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async calculateTotalGainsLosses(req: Request, res: Response) {
    try {
      const { fiscalPeriod } = req.params;
      const gainLossType = req.query.type as 'realized' | 'unrealized' | undefined;
      
      const result = await multiCurrencyService.calculateTotalGainsLosses(
        fiscalPeriod,
        gainLossType
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revalueForeignCurrencyBalances(req: Request, res: Response) {
    try {
      const { asOfDate, fiscalPeriod } = req.body;
      
      const result = await multiCurrencyService.revalueForeignCurrencyBalances(
        new Date(asOfDate),
        fiscalPeriod
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // View Rendering
  // ============================================================================

  static async renderCurrenciesPage(req: Request, res: Response) {
    try {
      const currencies = await multiCurrencyService.getCurrencies({ isActive: true });
      const baseCurrency = await multiCurrencyService.getBaseCurrency();
      
      res.render('pages/finance/currencies', {
        title: 'Currency Management',
        currencies,
        baseCurrency,
        user: req.user,
      });
    } catch (error: any) {
      res.status(500).render('error', { error: error.message });
    }
  }

  static async renderExchangeRatesPage(req: Request, res: Response) {
    try {
      const rates = await multiCurrencyService.getLatestExchangeRates();
      const currencies = await multiCurrencyService.getCurrencies({ isActive: true });
      
      res.render('pages/finance/exchange-rates', {
        title: 'Exchange Rate Management',
        rates,
        currencies,
        user: req.user,
      });
    } catch (error: any) {
      res.status(500).render('error', { error: error.message });
    }
  }

  static async renderGainsLossesPage(req: Request, res: Response) {
    try {
      const fiscalPeriod = req.query.period as string || new Date().toISOString().slice(0, 7);
      const gainsLosses = await multiCurrencyService.getCurrencyGainsLosses({ fiscalPeriod });
      const summary = await multiCurrencyService.calculateTotalGainsLosses(fiscalPeriod);
      
      res.render('pages/finance/currency-gains-losses', {
        title: 'Currency Gains & Losses',
        gainsLosses,
        summary,
        fiscalPeriod,
        user: req.user,
      });
    } catch (error: any) {
      res.status(500).render('error', { error: error.message });
    }
  }
}

export default MultiCurrencyController;
