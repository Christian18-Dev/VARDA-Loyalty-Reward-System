import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb'; // Corrected import

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
  "http://localhost:5000"
];

app.use(cors());
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

// Routes
app.get('/', (req, res) => res.send('API is running...'));

function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

connectDB();
