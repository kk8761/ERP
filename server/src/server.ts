/**
 * NexaERP — Main Server Entry Point (TypeScript)
 * Enterprise-grade ERP platform with monolithic architecture
 */

import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import viewRoutes from './routes/viewRoutes';
import { defaultTLSConfig, createHTTPSOptions } from './config/tls.config';
import { tlsSecurityMiddleware } from './middleware/tls.middleware';
import { certificateService } from './services/certificate.service';

dotenv.config();

// ─── App Setup ─────────────────────────────────────────────
const app: Application = express();

// Create HTTP or HTTPS server based on TLS configuration
let server: http.Server | https.Server;

if (defaultTLSConfig.enabled && process.env.NODE_ENV === 'production') {
  try {
    const httpsOptions = createHTTPSOptions();
    server = https.createServer(httpsOptions, app);
    console.log('✅ HTTPS server created with TLS 1.3 enforcement');
  } catch (error) {
    console.error('❌ Failed to create HTTPS server:', error);
    console.log('⚠️ Falling back to HTTP server');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ TLS not enabled in production - this is insecure!');
  }
}

// ─── CORS Configuration ────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://dapper-kheer-031b2c.netlify.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(null, true); // Permissive in dev; tighten in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Middleware ────────────────────────────────────────────
// Correlation ID middleware (must be first to track all requests)
app.use(correlationIdMiddleware);

// TLS Security Middleware (enforce HTTPS and TLS 1.3 in production)
if (process.env.NODE_ENV === 'production') {
  app.use(tlsSecurityMiddleware);
}

// Security headers (helmet)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Request logging (morgan)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// SIEM Security Logging Middleware
app.use(requestLogger);
app.use(authenticationLogger);
app.use(authorizationLogger);
app.use(suspiciousActivityDetector);

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import passport from 'passport';
import { sessionConfig } from './config/session';
import { configurePassport } from './config/passport';

// Cookie parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET || 'nexaerp-secret-key'));

// Session middleware
app.use(sessionConfig);

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── View Engine Setup ─────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Disable view caching in development for hot reload
if (process.env.NODE_ENV !== 'production') {
  app.set('view cache', false);
}

// ─── Static Asset Serving ──────────────────────────────────
// Serve static files from the root directory (css, js, assets)
app.use('/css', express.static(path.join(__dirname, '../../css'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use('/js', express.static(path.join(__dirname, '../../js'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use('/assets', express.static(path.join(__dirname, '../../assets'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use(express.static(path.join(__dirname, '../../'), { 
  index: false,
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// ─── Rate Limiting ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

app.use(generalLimiter);

import authRoutes from './routes/auth.routes';
import crmRoutes from './routes/crm.routes';
import inventoryRoutes from './routes/inventory.routes';
import accountingRoutes from './routes/accounting.routes';
import dmsRoutes from './routes/dms.routes';
import workflowRoutes from './routes/workflow.routes';
import hrmsRoutes from './routes/hrms.routes';
import hcmRoutes from './routes/hcm.routes';
import manufacturingRoutes from './routes/manufacturing.routes';
import scmRoutes from './routes/scm.routes';
import biRoutes from './routes/bi.routes';
import integrationsRoutes from './routes/integrations.routes';
import monitoringRoutes from './routes/monitoring.routes';
import auditRoutes from './routes/audit.routes';
import userManagementRoutes from './routes/user-management.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import qualityManagementRoutes from './routes/qualityManagement.routes';
import warehouseManagementRoutes from './routes/warehouse-management.routes';
import eamRoutes from './routes/eam.routes';
import projectRoutes from './routes/project.routes';
import grcRoutes from './routes/grc.routes';
import analyticsRoutes from './routes/analytics';
import industry40Routes from './routes/industry40.routes';
import financialConsolidationRoutes from './routes/financial-consolidation.routes';
import multiCurrencyRoutes from './routes/multi-currency.routes';
import treasuryRoutes from './routes/treasury.routes';
import riskManagementRoutes from './routes/risk-management.routes';
import taxEngineRoutes from './routes/tax-engine.routes';
import complianceReportingRoutes from './routes/compliance-reporting.routes';
import industryModulesRoutes from './routes/industry-modules.routes';
import customEntityRoutes from './routes/customEntity.routes';
import customFieldRoutes from './routes/customField.routes';
import formulaFieldRoutes from './routes/formulaField.routes';
import customRelationshipRoutes from './routes/customRelationship.routes';
import businessRuleRoutes from './routes/businessRule.routes';
import validationRuleRoutes from './routes/validationRule.routes';
import pageLayoutRoutes from './routes/pageLayout.routes';
import deviceTrustRoutes from './routes/device-trust.routes';
import encryptionRoutes from './routes/encryptionRoutes';
import certificateRoutes from './routes/certificate.routes';
import keyManagementRoutes from './routes/keyManagementRoutes';
import anomalyDetectionRoutes from './routes/anomaly-detection.routes';
import signatureRoutes from './routes/signature.routes';
import notificationRoutes from './routes/notificationRoutes';
import notificationCenterRoutes from './routes/notification-center.routes';
import notificationTrackingRoutes from './routes/notification-tracking.routes';
import escalationRoutes from './routes/escalation.routes';
import digestNotificationRoutes from './routes/digest-notification.routes';
import helpRoutes from './routes/help.routes';
import tutorialRoutes from './routes/tutorial.routes';
import docsRoutes from './routes/docs.routes';
import forumRoutes from './routes/forum.routes';
import { encryptionService } from './services/EncryptionService';
import { keyManagementService } from './services/KeyManagementService';
import { initializeNotificationScheduler } from './services/notification.scheduler';

// ─── Serve Static Frontend ─────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── View Routes ───────────────────────────────────────────
app.use('/', viewRoutes);

// ─── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/dms', dmsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/hcm', hcmRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/scm', scmRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quality', qualityManagementRoutes);
app.use('/api/warehouse', warehouseManagementRoutes);
app.use('/api/eam', eamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/grc', grcRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/industry40', industry40Routes);
app.use('/api/financial-consolidation', financialConsolidationRoutes);
app.use('/api/multi-currency', multiCurrencyRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/risk-management', riskManagementRoutes);
app.use('/api/tax', taxEngineRoutes);
app.use('/api/compliance-reporting', complianceReportingRoutes);
app.use('/api/industry', industryModulesRoutes);
app.use('/custom-entities', customEntityRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/formula-fields', formulaFieldRoutes);
app.use('/api/custom-relationships', customRelationshipRoutes);
app.use('/api/business-rules', businessRuleRoutes);
app.use('/api/validation-rules', validationRuleRoutes);
app.use('/api/page-layouts', pageLayoutRoutes);
app.use('/api/device-trust', deviceTrustRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/keys', keyManagementRoutes);
app.use('/api/anomaly-detection', anomalyDetectionRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-center', notificationCenterRoutes);
app.use('/api/notification-tracking', notificationTrackingRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/digest-notifications', digestNotificationRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/forum', forumRoutes);

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexaERP Backend',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🚀 NexaERP API v2.0 (TypeScript) is running',
    status: 'ok',
  });
});

// ─── Error Handler ─────────────────────────────────────────
// Replaced with centralized error-handler middleware (Requirement 28.5)
import { errorHandler, notFoundHandler } from './middleware/error-handler';

app.use(notFoundHandler);
app.use(errorHandler);

import connectDB from './config/database';
import { connectPostgres } from './config/prisma';
import { connectRedis } from './config/redis';
import { databaseMonitor } from './services/database.monitor';
import { warmCriticalCaches } from './services/cache.warming';
import { SessionCleanupService } from './services/session.cleanup';
import { AuditScheduler } from './services/audit.scheduler';
import inventoryScheduler from './services/inventory.scheduler';
import workflowTriggerService from './services/workflowTrigger.service';
import workflowTemplateService from './services/workflowTemplate.service';
import { analyticsScheduler } from './services/analytics.scheduler';
import { keyRotationScheduler } from './services/key-rotation.scheduler';
import { initializePaymentGateway } from './services/payment-gateway';
import { siemService } from './services/SIEMService';
import { correlationIdMiddleware } from './middleware/correlationId';
import {
  requestLogger,
  authenticationLogger,
  authorizationLogger,
  suspiciousActivityDetector,
} from './middleware/securityLogging.middleware';

// ─── Start Server ──────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

const startServer = async () => {
  try {
    // Initialize Encryption Service
    console.log('Initializing encryption service...');
    await encryptionService.initialize();
    console.log('✅ Encryption service initialized');

    // Initialize Key Management Service
    console.log('Initializing key management service...');
    await keyManagementService.initialize();
    console.log('✅ Key management service initialized');

    // Validate TLS certificates if enabled
    if (defaultTLSConfig.enabled) {
      console.log('Validating TLS certificates...');
      const certStatus = await certificateService.getCertificateStatus();
      
      if (!certStatus.valid) {
        console.error('❌ TLS certificate validation failed:');
        certStatus.validation.errors.forEach((err: string) => console.error(`   - ${err}`));
        
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid TLS certificate in production');
        }
      }
      
      if (certStatus.validation.warnings.length > 0) {
        console.warn('⚠️ TLS certificate warnings:');
        certStatus.validation.warnings.forEach((warn: string) => console.warn(`   - ${warn}`));
      }
      
      if (certStatus.info) {
        console.log(`✅ TLS certificate valid until ${certStatus.info.validTo.toISOString()}`);
        console.log(`   Days remaining: ${certStatus.info.daysUntilExpiry}`);
      }
      
      // Start certificate monitoring
      certificateService.startMonitoring(24); // Check every 24 hours
    }

    // Initialize Database Connections
    await Promise.all([
      connectDB().catch((_err: any) => console.warn('⚠️ MongoDB connection skipped or failed')),
      connectPostgres().catch((_err: any) => console.warn('⚠️ PostgreSQL connection skipped or failed')),
      connectRedis().catch((_err: any) => console.warn('⚠️ Redis connection skipped or failed'))
    ]);

    // Start database monitoring (every 5 minutes)
    if (process.env.NODE_ENV === 'production') {
      databaseMonitor.startMonitoring(5 * 60 * 1000);
    }

    // Start session cleanup service (runs hourly)
    SessionCleanupService.start();

    // Start audit retention scheduler (runs daily at 2:00 AM)
    AuditScheduler.start();

    // Start inventory scheduler (reorder points, expiry checks)
    inventoryScheduler.start();

    // Start analytics scheduler (ETL, reports, KPIs)
    analyticsScheduler.start();

    // Initialize payment gateway
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      initializePaymentGateway({
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      });
      console.log('✅ Payment gateway (Razorpay) initialized');
    } else {
      console.warn('⚠️ Razorpay credentials not configured');
    }

    // Initialize workflow templates and scheduled workflows
    try {
      await workflowTemplateService.initializeDefaultTemplates();
      await workflowTriggerService.initializeScheduledWorkflows();
      console.log('✅ Workflow system initialized');
    } catch (err) {
      console.warn('⚠️ Workflow initialization failed:', err);
    }

    // Warm critical caches after connections are established
    // Run in background to not block server startup
    warmCriticalCaches().catch(err => 
      console.warn('⚠️ Cache warming failed:', err.message)
    );

    server.listen(PORT, HOST, () => {
      console.log(`\n  🚀 NexaERP Server running on port ${PORT}`);
      console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📦 TypeScript: Enabled`);
      console.log(
        `  📡 DB: ${process.env.MONGODB_URI ? 'MongoDB URI configured' : '⚠️ No MONGODB_URI set'}`
      );
      console.log(
        `  📡 DB: ${process.env.DATABASE_URL ? 'PostgreSQL URL configured' : '⚠️ No DATABASE_URL set'}\n`
      );
      
      // Initialize notification scheduler
      initializeNotificationScheduler();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ─── Graceful Shutdown ─────────────────────────────────────
process.on('unhandledRejection', (err: Error) => {
  console.error('⚠️ Unhandled rejection:', err.message);
});

process.on('uncaughtException', (err: Error) => {
  console.error('⚠️ Uncaught exception:', err.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  SessionCleanupService.stop();
  AuditScheduler.stop();
  workflowTriggerService.cleanup();
  analyticsScheduler.stop();
  certificateService.stopMonitoring();
  keyRotationScheduler.stop();
  siemService.shutdown().then(() => {
    console.log('✅ SIEM service shutdown complete');
  });
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  SessionCleanupService.stop();
  AuditScheduler.stop();
  workflowTriggerService.cleanup();
  analyticsScheduler.stop();
  certificateService.stopMonitoring();
  keyRotationScheduler.stop();
  siemService.shutdown().then(() => {
    console.log('✅ SIEM service shutdown complete');
  });
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, server };
