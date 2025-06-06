import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (req, res) => {
  const { firstName, lastName, password, termsAccepted, idNumber } = req.body;
  
  console.log('Received registration data:', { firstName, lastName, idNumber });
  
  if (!termsAccepted) {
    return res.status(400).json({ message: 'Terms and conditions must be accepted' });
  }

  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'First Name and Last Name are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const existing = await User.findOne({ idNumber });
  if (existing) {
    return res.status(400).json({ message: 'ID Number already registered' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const userData = { 
    firstName,
    lastName,
    password: hashed,
    idNumber,
    termsAccepted: true,
    termsAcceptedAt: new Date()
  };
  
  console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });
  
  try {
    const user = await User.create(userData);
    console.log('Created user:', { 
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      idNumber: user.idNumber,
      role: user.role
    });

    // Create response object with all user data
    const responseData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      idNumber: user.idNumber,
      role: user.role,
      token: generateToken(user)
    };

    console.log('Sending response:', responseData);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  console.log('Login attempt for ID:', req.body.idNumber);
  const { idNumber, password } = req.body;
  
  if (!idNumber || !password) {
    console.log('Missing credentials:', { idNumber: !!idNumber, password: !!password });
    return res.status(400).json({ message: 'ID number and password are required' });
  }

  try {
    const user = await User.findOne({ idNumber });
    if (!user) {
      console.log('User not found for ID:', idNumber);
      return res.status(400).json({ message: 'Invalid ID number or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', idNumber);
      return res.status(400).json({ message: 'Invalid ID number or password' });
    }

    console.log('Login successful for user:', idNumber);
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      idNumber: user.idNumber,
      role: user.role,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};
