import User from '../models/User.js';
import Reward from '../models/Reward.js';
import ClaimedReward from '../models/ClaimedReward.js';

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
  const users = await User.find({}, 'name points role');
  res.json(users);
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
