// controllers/rewardController.js
import Reward from '../models/Reward.js';

export const getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find(); // <-- no filters
    res.json(rewards);
  } catch (error) {
    console.error('Error in getRewards:', error);
    res.status(500).json({ message: 'Server error fetching rewards' });
  }
};
