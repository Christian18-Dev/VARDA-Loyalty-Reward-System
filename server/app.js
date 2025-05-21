import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import qrCodeScanRoutes from './routes/qrCodeScanRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Routes
app.use('/api/qrcode', qrCodeScanRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.url,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- POST /api/qrcode/save-scan');
  console.log('- GET /api/qrcode/scans');
  console.log('- GET /api/test');
}); 