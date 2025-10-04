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

    // Record the claim with new model structure
    await ClaimedReward.create({
      idNumber: req.user.idNumber,
      reward: reward._id, // Reference to the reward
      rewardName: reward.name, // Store reward name
      pointsUsed: reward.cost,
      claimedAt: new Date(),
      status: 'claimed'
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
      points: user.points,
      pointsUsed: user.pointsUsed || 0
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

    // Get user with password field included
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Get user with password field included
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Get user ID before deletion for cleanup
    const userId = user._id;
    const idNumber = user.idNumber;

    // Delete all user data
    await Promise.all([
      // Delete user's feedback
      Feedback.deleteMany({ user: userId }),
      
      // Delete user's claimed rewards
      ClaimedReward.deleteMany({ user: userId }),
      
      // Delete user's account
      User.findByIdAndDelete(userId)
    ]);

    res.status(200).json({ 
      success: true,
      message: 'Account and all associated data have been successfully deleted.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete account. Please try again.'
    });
  }
};

export const getClaimedRewards = async (req, res) => {
  try {
    const claimedRewards = await ClaimedReward.find({ 
      idNumber: req.user.idNumber 
    })
    .sort({ claimedAt: -1 }); // Sort by most recent first

    // Get all unique reward IDs
    const rewardIds = [...new Set(claimedRewards.map(cr => cr.reward).filter(Boolean))];

    // Fetch all rewards in one query
    const Reward = (await import('../models/Reward.js')).default;
    const rewards = await Reward.find({ _id: { $in: rewardIds } });

    // Create a map for quick lookup
    const rewardMap = new Map();
    rewards.forEach(reward => {
      rewardMap.set(reward._id.toString(), reward);
    });

    // Process the data
    const processedRewards = claimedRewards.map(claimedReward => {
      const reward = claimedReward.toObject();
      
      // Try to find the actual reward data
      let rewardData = null;
      if (reward.reward) {
        const rewardId = reward.reward.toString();
        rewardData = rewardMap.get(rewardId);
      }
      
      if (rewardData) {
        return {
          ...reward,
          reward: {
            name: rewardData.name || reward.rewardName,
            description: rewardData.description,
            imageUrl: rewardData.imageUrl,
            cost: rewardData.cost
          }
        };
      }
      
      // Fallback for missing reward data
      return {
        ...reward,
        reward: {
          name: reward.rewardName || 'Unknown Reward',
          description: 'Reward details not available',
          imageUrl: null,
          cost: reward.pointsUsed
        }
      };
    });

    res.json({
      success: true,
      data: processedRewards
    });
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch claimed rewards' 
    });
  }
};

export const verifyRewardClaim = async (req, res) => {
  try {
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    const expectedCode = process.env.REWARD_VERIFICATION_CODE || '0102';

    if (verificationCode !== expectedCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    res.json({ 
      success: true,
      message: 'Verification successful' 
    });
  } catch (error) {
    console.error('Error verifying reward claim:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
