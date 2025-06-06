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
      console.error(error);
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
