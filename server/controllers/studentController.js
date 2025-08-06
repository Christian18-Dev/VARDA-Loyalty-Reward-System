import Code from '../models/Code.js';
import Reward from '../models/Reward.js';
import Feedback from '../models/Feedback.js';
import ClaimedReward from '../models/ClaimedReward.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const claimCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const foundCode = await Code.findOne({ code });

    if (!foundCode) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (foundCode.status === 'inactive') {
      return res.status(400).json({ message: 'Code already used' });
    }

    // Award 1 point per code redemption
    const pointsToAward = 1;
    req.user.points += pointsToAward;
    await req.user.save();

    // Mark code as inactive and store redemption info
    foundCode.status = 'inactive';
    foundCode.redeemedBy = req.user.idNumber;
    foundCode.redeemedAt = new Date();
    await foundCode.save();

    res.status(200).json({ 
      message: 'Code claimed successfully',
      pointsAwarded: pointsToAward,
      newPoints: req.user.points
    });
  } catch (error) {
    console.error('Error in claimCode:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const claimReward = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    if (reward.cost <= 0) {
      return res.status(400).json({ message: 'Invalid reward cost' });
    }

    if (req.user.points < reward.cost) {
      return res.status(400).json({ message: 'Not enough points' });
    }

    // Deduct points and increment pointsUsed
    req.user.points -= reward.cost;
    req.user.pointsUsed += reward.cost;
    await req.user.save();

    // Record the claim
    await ClaimedReward.create({
      idNumber: req.user.idNumber,
      reward: reward.name,
      pointsUsed: reward.cost,
      dateClaimed: new Date(),
    });

    res.json({ 
      message: 'Reward claimed successfully!',
      newPoints: req.user.points 
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPoints = async (req, res) => {
  try {
    // Find the user to get their current points
    const user = await User.findOne({ idNumber: req.user.idNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      points: user.points
    });
  } catch (error) {
    console.error('Error getting points:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitFeedback = async (req, res) => {
  const { code, rating } = req.body;

  console.log('Received feedback:', { code, rating });

  if (!code || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Invalid feedback data' });
  }

  try {
    const foundCode = await Code.findOne({ code });

    if (!foundCode) {
      console.log('Code not found:', code);
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // ✅ Check if feedback already exists for this code
    const existingFeedback = await Feedback.findOne({ code });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this code' });
    }

    // ✅ Proceed even if code is inactive (claimed already)
    const feedback = new Feedback({
      code,
      rating,
      idNumber: req.user.idNumber,
      date: new Date(),
    });

    await feedback.save();

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If trying to change password
    if (newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        idNumber: user.idNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



