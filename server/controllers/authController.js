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
  const { name, password, termsAccepted, idNumber } = req.body;
  
  if (!termsAccepted) {
    return res.status(400).json({ message: 'Terms and conditions must be accepted' });
  }

  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  const existing = await User.findOne({ $or: [{ name }, { idNumber }] });
  if (existing) {
    if (existing.name === name) {
      return res.status(400).json({ message: 'Username taken' });
    }
    if (existing.idNumber === idNumber) {
      return res.status(400).json({ message: 'ID Number already registered' });
    }
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ 
    name, 
    password: hashed,
    idNumber,
    termsAccepted: true,
    termsAcceptedAt: new Date()
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    idNumber: user.idNumber,
    role: user.role,
    token: generateToken(user),
  });
};

export const loginUser = async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
