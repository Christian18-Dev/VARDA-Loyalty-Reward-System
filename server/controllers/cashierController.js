import Code from '../models/Code.js'; // Make sure this line is at the top of your file
import ClaimedReward from '../models/ClaimedReward.js';

export const generateCode = async (req, res) => {
  try {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    // Create a new code entry with status 'active'
    const code = await Code.create({
      code: newCode,
      status: 'active',  // Initially active
    });

    res.status(201).json({ message: 'Code generated', code });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getClaimedRewards = async (req, res) => {
  try {
    const rewards = await ClaimedReward.find().sort({ time: -1 });
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};