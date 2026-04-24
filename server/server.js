/**
 * NexaERP — Main Server Entry Point
 * Node.js + Express + MongoDB + Socket.io
 */

require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const cron     = require('node-cron');
const rateLimit = require('express-rate-limit');

const connectDB    = require('./config/db');
const socketSetup  = require('./socket/handlers');
const { runLowStockCheck } = require('./utils/notifications');

// ─── Routes ────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const productRoutes      = require('./routes/products');
const orderRoutes        = require('./routes/orders');
const customerRoutes     = require('./routes/customers');
const staffRoutes        = require('./routes/staff');
const transactionRoutes  = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const supplierRoutes     = require('./routes/suppliers');
const analyticsRoutes    = require('./routes/analytics');

// ─── App Setup ─────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Connect Database ─────────────────────────────────────
connectDB();

// ─── Socket.io Setup ──────────────────────────────────────
const io = socketSetup(server);
app.set('io', io); // Make io accessible in routes

// ─── Global Rate Limiting ─────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please wait 15 minutes.' }
});

// ─── Middleware ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalLimiter);

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexaERP Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🚀 NexaERP API is running',
    version: '1.0.0',
    docs: '/api/health',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/products',
      'GET  /api/orders',
      'GET  /api/customers',
      'GET  /api/staff',
      'GET  /api/transactions',
      'GET  /api/notifications',
      'GET  /api/suppliers',
      'GET  /api/analytics',
    ]
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/customers',     customerRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/suppliers',     supplierRoutes);
app.use('/api/analytics',     analyticsRoutes);

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Scheduled Jobs ───────────────────────────────────────
// Daily low stock check at 9 AM
cron.schedule(process.env.LOW_STOCK_CHECK_CRON || '0 9 * * *', async () => {
  console.log('⏰ [CRON] Running daily low stock check...');
  try {
    const notifications = await runLowStockCheck(io);
    console.log(`✅ [CRON] Created ${notifications.length} low stock notifications`);
  } catch (err) {
    console.error('❌ [CRON] Low stock check failed:', err.message);
  }
});

// Check every 5 minutes for critical stock (0 units)
cron.schedule('*/5 * * * *', async () => {
  try {
    const Product = require('./models/Product');
    const critical = await Product.find({ stock: 0, isActive: true });
    if (critical.length > 0) {
      io.emit('critical_stock', { count: critical.length, items: critical.map(p => p.name) });
    }
  } catch {}
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║        NexaERP Backend Server             ║
  ╠═══════════════════════════════════════════╣
  ║  🚀 Running on port: ${PORT}                ║
  ║  🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║  📊 MongoDB: Connecting...                ║
  ║  🔌 Socket.io: Ready                      ║
  ╚═══════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
