/**
 * Multi-Currency Routes
 */

import { Router } from 'express';
import MultiCurrencyController from '../controllers/multi-currency.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// View Routes (Server-Side Rendered Pages)
// ============================================================================

router.get('/currencies', MultiCurrencyController.renderCurrenciesPage);
router.get('/exchange-rates', MultiCurrencyController.renderExchangeRatesPage);
router.get('/gains-losses', MultiCurrencyController.renderGainsLossesPage);

// ============================================================================
// API Routes - Currency Management
// ============================================================================

router.post('/api/currencies', MultiCurrencyController.createCurrency);
router.get('/api/currencies', MultiCurrencyController.getCurrencies);
router.get('/api/currencies/base', MultiCurrencyController.getBaseCurrency);
router.get('/api/currencies/:code', MultiCurrencyController.getCurrencyByCode);
router.put('/api/currencies/:id', MultiCurrencyController.updateCurrency);
router.delete('/api/currencies/:id', MultiCurrencyController.deactivateCurrency);

// ============================================================================
// API Routes - Exchange Rate Management
// ============================================================================

router.post('/api/exchange-rates', MultiCurrencyController.setExchangeRate);
router.get('/api/exchange-rates', MultiCurrencyController.getLatestExchangeRates);
router.get('/api/exchange-rates/:fromCurrency/:toCurrency', MultiCurrencyController.getExchangeRate);
router.get('/api/exchange-rates/:fromCurrency/:toCurrency/history', MultiCurrencyController.getExchangeRateHistory);
router.delete('/api/exchange-rates/:id', MultiCurrencyController.deactivateExchangeRate);

// ============================================================================
// API Routes - Currency Conversion
// ============================================================================

router.post('/api/convert', MultiCurrencyController.convertCurrency);
router.post('/api/convert/to-base', MultiCurrencyController.convertToBaseCurrency);

// ============================================================================
// API Routes - Currency Gains/Losses
// ============================================================================

router.post('/api/gains-losses', MultiCurrencyController.recordCurrencyGainLoss);
router.get('/api/gains-losses', MultiCurrencyController.getCurrencyGainsLosses);
router.get('/api/gains-losses/:fiscalPeriod/total', MultiCurrencyController.calculateTotalGainsLosses);
router.post('/api/revalue', MultiCurrencyController.revalueForeignCurrencyBalances);

export default router;
