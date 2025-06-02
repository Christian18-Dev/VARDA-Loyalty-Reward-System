import User from '../models/User.js';
import Reward from '../models/Reward.js';
import ClaimedReward from '../models/ClaimedReward.js';
import bcrypt from 'bcryptjs';

export const getStats = async (req, res) => {
  try {
    // Get all users
    const users = await User.find();
    
    // Calculate total unused points by summing points from users
    const totalPointsUnused = users.reduce((acc, user) => acc + user.points, 0);

    // Get all claimed rewards and calculate total points used
    const claimedRewards = await ClaimedReward.find();
    
    // Ensure that pointsUsed is valid and sum it
    const totalPointsUsed = claimedRewards.reduce(
      (sum, reward) => sum + (reward.pointsUsed > 0 ? reward.pointsUsed : 0), 
      0
    );

    res.json({
      totalPointsUnused,
      totalPointsUsed,
      totalUsers: users.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createReward = async (req, res) => {
  const { name, cost } = req.body;
  if (!name || !cost) return res.status(400).json({ message: 'Missing fields' });

  const reward = new Reward({ name, cost });
  await reward.save();

  res.status(201).json(reward);
};

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = search ? { idNumber: { $regex: search, $options: 'i' } } : {};

    // Get total count for pagination
    const total = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select('idNumber points role firstName lastName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ idNumber: 1 });

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const getClaimedRewards = async (req, res) => {
  try {
    const claimedRewards = await ClaimedReward.find().sort({ dateClaimed: -1 });
    res.json(claimedRewards);
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['student', 'teacher', 'ateneoStaff', 'cashier', 'concierge'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Find user and prevent admin role changes
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot change admin role' });
    }

    // Update the role
    user.role = role;
    await user.save();

    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user and prevent admin password changes
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot change admin password' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
};
