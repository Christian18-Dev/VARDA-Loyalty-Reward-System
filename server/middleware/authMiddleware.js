import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      // Only log unexpected errors, not token expiration
      if (error.name !== 'TokenExpiredError') {
        console.error('Auth error:', error);
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Session expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as admin' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

export const cashierOnly = (req, res, next) => {
  const allowedRoles = [
    'cashier',
    'varda',
    'blueCafe',
    'colonelsCurry',
    'chillers',
    'luckyShawarma',
    'yumdimdum'
  ];
  
  if (req.user && allowedRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as cashier' });
  }
};

export const conciergeOnly = (req, res, next) => {
  if (req.user?.role !== 'concierge') {
    return res.status(403).json({ message: 'Concierge access only' });
  }
  next();
};

export const borrowAccess = (req, res, next) => {
  const allowedRoles = ['student', 'teacher', 'ateneostaff', 'concierge'];
  if (req.user && allowedRoles.includes(req.user.role.toLowerCase())) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Only students, teachers, Ateneo staff, and concierge can borrow items.'
    });
  }
};
