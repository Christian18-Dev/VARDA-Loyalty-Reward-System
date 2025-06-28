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

export const deleteReward = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reward = await Reward.findByIdAndDelete(id);
    
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    res.json({ message: 'Reward deleted successfully' });
  } catch (error) {
    console.error('Error in deleteReward:', error);
    res.status(500).json({ message: 'Server error deleting reward' });
  }
};
