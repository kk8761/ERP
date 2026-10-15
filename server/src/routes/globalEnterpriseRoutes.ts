import express from 'express';
import * as localizationController from '../controllers/localizationController';
import * as transferPricingController from '../controllers/transferPricingController';
import * as supplyNetworkController from '../controllers/supplyNetworkController';

const router = express.Router();

// ─── Localization Routes ───────────────────────────────────

router.get('/localizations', localizationController.getAllLocalizations);
router.get('/localizations/:countryCode', localizationController.getLocalizationByCountry);
router.post('/localizations', localizationController.createLocalization);
router.put('/localizations/:countryCode', localizationController.updateLocalization);
router.post('/localizations/format/currency', localizationController.formatCurrency);
router.post('/localizations/format/date', localizationController.formatDate);
router.post('/localizations/seed', localizationController.seedDefaultLocalizations);

// Translation routes
router.get('/localizations/:localizationId/translations', localizationController.getTranslationsByLocalization);
router.post('/translations', localizationController.upsertTranslation);
router.post('/translations/translate', localizationController.translate);
router.post('/translations/bulk-import', localizationController.bulkImportTranslations);

// ─── Transfer Pricing Routes ───────────────────────────────

router.post('/transfer-pricing', transferPricingController.createTransferPricing);
router.get('/transfer-pricing/:id', transferPricingController.getTransferPricingById);
router.get('/transfer-pricing/entity/:entityId', transferPricingController.getTransferPricingByEntity);
router.get('/transfer-pricing/intercompany/:fromEntityId/:toEntityId', transferPricingController.getIntercompanyTransactions);
router.put('/transfer-pricing/:id', transferPricingController.updateTransferPricing);

// Transfer Pricing Report routes
router.post('/transfer-pricing-reports', transferPricingController.createTransferPricingReport);
router.get('/transfer-pricing-reports/:id', transferPricingController.getTransferPricingReportById);
router.get('/transfer-pricing-reports/entity/:entityId', transferPricingController.getTransferPricingReportsByEntity);
router.put('/transfer-pricing-reports/:id', transferPricingController.updateTransferPricingReport);
router.post('/transfer-pricing-reports/:reportId/add-transactions', transferPricingController.addTransactionsToReport);
router.post('/transfer-pricing-reports/generate', transferPricingController.generateTransferPricingReport);

// Transfer Pricing Analysis routes
router.get('/transfer-pricing/analyze/:entityId/:fiscalYear/compliance', transferPricingController.analyzeTransferPricingCompliance);
router.get('/transfer-pricing/analyze/:entityId/:fiscalYear/summary', transferPricingController.getTransferPricingSummaryByType);

// ─── Supply Network Routes ─────────────────────────────────

// Node routes
router.post('/supply-network/nodes', supplyNetworkController.createSupplyNetworkNode);
router.get('/supply-network/nodes', supplyNetworkController.getAllSupplyNetworkNodes);
router.get('/supply-network/nodes/:id', supplyNetworkController.getSupplyNetworkNodeById);
router.put('/supply-network/nodes/:id', supplyNetworkController.updateSupplyNetworkNode);

// Route routes
router.post('/supply-network/routes', supplyNetworkController.createSupplyNetworkRoute);
router.get('/supply-network/routes', supplyNetworkController.getAllSupplyNetworkRoutes);
router.get('/supply-network/routes/:id', supplyNetworkController.getSupplyNetworkRouteById);
router.put('/supply-network/routes/:id', supplyNetworkController.updateSupplyNetworkRoute);

// Optimization routes
router.post('/supply-network/shortest-path', supplyNetworkController.findShortestPath);
router.post('/supply-network/optimize', supplyNetworkController.optimizeSupplyNetwork);
router.get('/supply-network/optimizations', supplyNetworkController.getAllOptimizations);
router.get('/supply-network/optimizations/:id', supplyNetworkController.getOptimizationById);

// Analysis routes
router.get('/supply-network/statistics', supplyNetworkController.calculateNetworkStatistics);
router.get('/supply-network/connectivity', supplyNetworkController.analyzeNetworkConnectivity);

export default router;
