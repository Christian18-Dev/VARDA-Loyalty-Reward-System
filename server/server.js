// Set Node.js memory limit to 400MB to stay within Render's 512MB RAM limit
process.env.NODE_OPTIONS = '--max-old-space-size=400';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import conciergeRoutes from './routes/conciergeRoutes.js';
import mongoose from 'mongoose';

dotenv.config();
const app = express();

// Trust first proxy (for Render.com)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === "production";

// Memory monitoring
const logMemoryUsage = () => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  
  console.log(`Memory usage - heapTotal: ${heapTotalMB}MB, heapUsed: ${heapUsedMB}MB`);
  
  // Warn if memory usage is high
  if (heapUsedMB > 350) {
    console.warn(`⚠️ High memory usage detected: ${heapUsedMB}MB (approaching 512MB limit)`);
  }
};

// Set up periodic memory logging in production (reduced frequency)
if (isProd) {
  setInterval(logMemoryUsage, 60000); // Log every 60 seconds instead of 30
  
  // Periodic garbage collection hint (every 2 minutes for 512MB RAM)
  setInterval(() => {
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection triggered');
    }
  }, 120000); // 2 minutes
}

// ✅ Logging info
console.log(`🔧 Environment: ${isProd ? "🚀 Production" : "🛠 Development"}`);
console.log(`🔧 Using PORT: ${PORT}`);
console.log(`🔧 Using MongoDB URI: ${mongoURI ? "✅ Loaded" : "❌ Not Found"}`);

// Configure CORS with specific origins and methods
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "https://christian18-dev.github.io",
      "https://www.vgconcierge.com",
      "http://www.vgconcierge.com",
      "http://localhost:3001"
    ];

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for now as it may break some features
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Apply CORS after Helmet
app.use(cors(corsOptions));

// Import rate limiters from config
import { apiLimiter, authLimiter } from './config/rateLimits.js';

// Apply rate limiting to all routes
app.use(apiLimiter);

// Add request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  res.setTimeout(30000);
  next();
});

app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

async function connectDB() {
  try {
    // Configure Mongoose connection
    const mongooseOptions = {
      maxPoolSize: 3, // Reduced for 512MB RAM limit
      minPoolSize: 1, // Reduced for 512MB RAM limit
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
    };

    await mongoose.connect(mongoURI, mongooseOptions);
    console.log("✅ Connected to MongoDB Atlas via Mongoose");

    // Use Mongoose connection for native operations
    app.locals.db = mongoose.connection.db;
    console.log("✅ Using Mongoose connection for native operations");

    startServer();
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/concierge', conciergeRoutes);

// Routes
app.get('/', (req, res) => res.send('API is running...'));

function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

connectDB();