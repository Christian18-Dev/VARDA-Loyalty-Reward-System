// Set Node.js memory limit to 384MB to leave room for system processes
process.env.NODE_OPTIONS = '--max-old-space-size=384';

import express from 'express';
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
import { MongoClient } from 'mongodb';
import User from './models/User.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === "production";

// Memory monitoring
const logMemoryUsage = () => {
  const used = process.memoryUsage();
  console.log(`Memory usage - heapTotal: ${Math.round(used.heapTotal / 1024 / 1024)}MB, heapUsed: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
};

// Set up periodic memory logging in production
if (isProd) {
  setInterval(logMemoryUsage, 30000); // Log every 30 seconds
}

// ✅ Logging info
console.log(`🔧 Environment: ${isProd ? "🚀 Production" : "🛠 Development"}`);
console.log(`🔧 Using PORT: ${PORT}`);
console.log(`🔧 Using MongoDB URI: ${mongoURI ? "✅ Loaded" : "❌ Not Found"}`);

// ✅ CORS Configuration 
const allowedOrigins = [
  "https://christian18-dev.github.io",
  "https://www.2gonz.com",
  "http://www.2gonz.com",
  "https://2gonz.com",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:3001"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
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
