import express from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { registerUser, loginUser, forgotPassword, resetPassword, verifyResetToken } from '../controllers/authController.js';

const router = express.Router();

// Import rate limiters from config
import { authLimiter } from '../config/rateLimits.js';

// Use the authLimiter for login routes
const loginLimiter = authLimiter;

// Slow down after max attempts
const loginSpeedLimiter = slowDown({
  windowMs: 5 * 60 * 1000, // 5 minutes
  delayAfter: 3, // Start adding delay after 3 requests
  delayMs: (used) => (used - 3) * 1000, // Add 1 second per request after the 3rd
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  validate: { delayMs: false } // Disable validation warning
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginSpeedLimiter, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

export default router;
