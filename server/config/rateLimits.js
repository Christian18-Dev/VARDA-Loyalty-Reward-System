import rateLimit from 'express-rate-limit';

// General rate limiter for all routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Too many requests, please try again after 15 minutes' 
  }
});

// More aggressive rate limiting for auth routes
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per window (more strict for auth)
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again after 5 minutes' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});
