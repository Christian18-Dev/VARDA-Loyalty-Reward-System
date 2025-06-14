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
  const { idNumber, password } = req.body;
  
  if (!idNumber || !password) {
    return res.status(400).json({ message: 'ID number and password are required' });
  }

  try {
    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    const user = await User.findOne({ idNumber }).lean();
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid ID number or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid ID number or password' });
    }

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
