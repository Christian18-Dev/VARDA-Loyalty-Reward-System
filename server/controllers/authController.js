import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendPasswordResetConfirmation } from '../utils/emailService.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

export const registerUser = async (req, res) => {
  const { firstName, lastName, password, termsAccepted, idNumber, email, role, university } = req.body;
  
  if (!termsAccepted) {
    return res.status(400).json({ message: 'Terms and conditions must be accepted' });
  }

  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'First Name and Last Name are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const existingId = await User.findOne({ idNumber }).lean();
    if (existingId) {
      return res.status(400).json({ message: 'ID Number already registered' });
    }

    const existingEmail = await User.findOne({ email }).lean();
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userData = { 
      firstName,
      lastName,
      email,
      password: hashed,
      idNumber,
      role: role || 'student',
      university: university || 'ateneo',
      termsAccepted: true,
      termsAcceptedAt: new Date()
    };
    
    const user = await User.create(userData);
    
    // Create response object without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(201).json({
      ...userWithoutPassword,
      token: generateToken(user)
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Track failed login attempts
const failedAttempts = new Map();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes window
      failedAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export const loginUser = async (req, res) => {
  const { idNumber, password } = req.body;
  
  if (!idNumber || !password) {
    return res.status(400).json({ message: 'ID number and password are required' });
  }

  try {
    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    const user = await User.findOne({ idNumber }).lean();
    
    if (!user) {
      // Track failed attempt
      const attempts = (failedAttempts.get(idNumber)?.attempts || 0) + 1;
      failedAttempts.set(idNumber, { 
        attempts, 
        timestamp: Date.now() 
      });

      // Log only on 5th attempt
      if (attempts >= 5) {
        console.warn(`[SECURITY] Multiple failed login attempts for ID: ${idNumber} (${attempts} attempts)`);
      }

      return res.status(400).json({ 
        message: 'Invalid ID number or password',
        attemptsRemaining: Math.max(0, 5 - attempts)
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Track failed attempt
      const attempts = (failedAttempts.get(idNumber)?.attempts || 0) + 1;
      failedAttempts.set(idNumber, { 
        attempts, 
        timestamp: Date.now() 
      });

      // Log only on 5th attempt
      if (attempts >= 5) {
        console.warn(`[SECURITY] Multiple failed login attempts for ID: ${idNumber} (${attempts} attempts)`);
      }

      return res.status(400).json({ 
        message: 'Invalid ID number or password',
        attemptsRemaining: Math.max(0, 5 - attempts)
      });
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(idNumber);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      ...userWithoutPassword,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || 'www.2gonz.com'}/#/reset-password/${resetToken}`;

    // Send email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, resetUrl);

    if (emailSent) {
      res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } else {
      // If email fails, remove the reset token
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();
      
      res.status(500).json({ message: 'Error sending password reset email. Please try again.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email, user.firstName);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyResetToken = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
