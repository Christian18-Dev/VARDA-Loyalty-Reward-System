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
import notificationRoutes from './routes/notificationRoutes.js';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb'; // Corrected import
import { createOverdueNotifications } from './controllers/notificationController.js';
import cron from 'node-cron';
import User from './models/User.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === "production";

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
    // Allow requests with no origin (like mobile apps or curl requests)
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
app.use(express.json());

async function connectDB() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB Atlas via Mongoose");

    const client = new MongoClient(mongoURI);
    await client.connect();
    app.locals.db = client.db();
    console.log("✅ Native MongoDB client connected");

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
app.use('/api/notifications', notificationRoutes);

// Routes
app.get('/', (req, res) => res.send('API is running...'));

function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// Set up automatic overdue notifications check
setInterval(createOverdueNotifications, 60 * 60 * 1000); // Check every hour

// Add daily points reset cron job
// Using Philippine timezone (UTC+8)
// Reset at 5:00 AM Philippine time (before breakfast service)
cron.schedule('0 5 * * *', async () => {
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('\n=== Daily Points Reset (5:00 AM) ===');
    console.log(`Reset Time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
    console.log('Starting daily points reset for all users...');
    
    // Use bulk update for better performance
    const result = await User.updateMany(
      { 'cateringPoints': { $exists: true } },
      {
        $set: {
          'cateringPoints.breakfast': 250,
          'cateringPoints.lunch': 250,
          'cateringPoints.dinner': 250,
          'cateringPoints.lastReset': now
        }
      }
    );
    
    console.log(`\nReset Summary:`);
    console.log(`Total users reset: ${result.modifiedCount}`);
    console.log(`Total users matched: ${result.matchedCount}`);
    console.log('=== End of Daily Reset ===\n');
  } catch (error) {
    console.error('Error in daily points reset:', error);
  }
});

connectDB();
