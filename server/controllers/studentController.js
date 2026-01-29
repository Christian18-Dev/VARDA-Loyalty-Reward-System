import Code from '../models/Code.js';
import Reward from '../models/Reward.js';
import Feedback from '../models/Feedback.js';
import ClaimedReward from '../models/ClaimedReward.js';
import User from '../models/User.js';
import MealRegistration from '../models/MealRegistration.js';
import AvailHistory from '../models/AvailHistory.js';
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

// Meal Registration Functions
export const registerMeals = async (req, res) => {
  try {
    const { meals } = req.body;
    const user = req.user;

    // Validate that at least one meal is selected
    if (!meals || (!meals.breakfast && !meals.lunch && !meals.dinner)) {
      return res.status(400).json({ 
        message: 'Please select at least one meal (Breakfast, Lunch, or Dinner)' 
      });
    }

    // Check if user is from LIMA
    if (user.university !== 'lima') {
      return res.status(403).json({ 
        message: 'Meal registration is only available for LIMA students' 
      });
    }

    // Use proper timezone handling with Asia/Manila timezone
    const now = new Date();
    
    // Get current time in Asia/Manila (UTC+8) for window calculations
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const philNow = new Date(utcTime + (8 * 3600000));

    // Compute the start of the current 5 AM–5 AM window in PH time
    const windowStart = new Date(philNow);
    windowStart.setHours(5, 0, 0, 0); // 5:00 AM
    
    // If current PH time is before 5 AM, use previous day's 5 AM as window start
    if (philNow.getHours() < 5) {
      windowStart.setDate(windowStart.getDate() - 1);
    }
    
    // Convert window boundaries back to UTC for database queries
    const windowStartUTC = new Date(windowStart.getTime() - (8 * 3600000));
    const windowEndUTC = new Date(windowStartUTC.getTime() + (24 * 3600000));

    // Check if there's an active registration in the current 5 AM–5 AM PH window
    const existingRegistration = await MealRegistration.findOne({
      idNumber: user.idNumber,
      registrationDate: {
        $gte: windowStartUTC,
        $lt: windowEndUTC
      },
      status: 'active'
    });

    const hour = philNow.getHours();
    const minute = philNow.getMinutes();
    const currentMinutes = (hour * 60) + minute;

    const breakfastStart = 5 * 60;
    const breakfastEnd = 10 * 60;
    const lunchStart = 10 * 60;
    const lunchEnd = 14 * 60;
    const dinnerStart = 14 * 60;
    const dinnerEnd = 22 * 60;

    const allowedMeals = {
      breakfast: currentMinutes >= breakfastStart && currentMinutes < breakfastEnd,
      lunch: currentMinutes >= lunchStart && currentMinutes < lunchEnd,
      dinner: currentMinutes >= dinnerStart && currentMinutes < dinnerEnd
    };

    if (existingRegistration) {
      const previousMealsAvailed = {
        breakfast: existingRegistration.mealsAvailed?.breakfast || false,
        lunch: existingRegistration.mealsAvailed?.lunch || false,
        dinner: existingRegistration.mealsAvailed?.dinner || false
      };

      // Only validate time windows for meals that are being newly availed
      // (i.e., selected now but not previously availed).
      const selectedMeals = ['breakfast', 'lunch', 'dinner'].filter((mealType) => !!(meals?.[mealType]));
      const mealsToValidate = selectedMeals.filter((mealType) => !previousMealsAvailed[mealType]);

      if (mealsToValidate.length === 0) {
        return res.status(400).json({
          message: 'No new meals selected to avail.'
        });
      }

      const invalidSelections = mealsToValidate.filter((mealType) => !allowedMeals[mealType]);

      if (invalidSelections.length > 0) {
        return res.status(400).json({
          message: `You can only claim meals during these PH time windows: Breakfast 5:00 AM–10:00 AM, Lunch 10:00 AM–2:00 PM, Dinner 2:00 PM–10:00 PM. Invalid selection(s): ${invalidSelections.join(', ')}.`
        });
      }

      // Update existing registration
      existingRegistration.meals = {
        breakfast: meals.breakfast || false,
        lunch: meals.lunch || false,
        dinner: meals.dinner || false
      };

      existingRegistration.mealsAvailed = {
        breakfast: previousMealsAvailed.breakfast || !!(meals.breakfast),
        lunch: previousMealsAvailed.lunch || !!(meals.lunch),
        dinner: previousMealsAvailed.dinner || !!(meals.dinner)
      };

      await existingRegistration.save();

      const userWithAccountId = await User.findOne({ idNumber: existingRegistration.idNumber })
        .select('accountID')
        .lean();

      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const historyCreates = mealTypes
        .filter((mealType) => !!(meals?.[mealType]) && !previousMealsAvailed[mealType])
        .map((mealType) => AvailHistory.create({
          registrationId: existingRegistration._id,
          idNumber: existingRegistration.idNumber,
          accountID: userWithAccountId?.accountID || null,
          firstName: existingRegistration.firstName,
          lastName: existingRegistration.lastName,
          mealType,
          availedBy: {
            idNumber: existingRegistration.idNumber,
            name: `${existingRegistration.firstName} ${existingRegistration.lastName}`
          },
          registrationDate: existingRegistration.registrationDate
        }));

      await Promise.all(historyCreates);

      return res.json({
        success: true,
        message: 'Meal registration updated successfully',
        registration: existingRegistration
      });
    }

    // New registration: validate all selected meals
    const selectedMeals = ['breakfast', 'lunch', 'dinner'].filter((mealType) => !!(meals?.[mealType]));
    const invalidSelections = selectedMeals.filter((mealType) => !allowedMeals[mealType]);

    if (invalidSelections.length > 0) {
      return res.status(400).json({
        message: `You can only claim meals during these PH time windows: Breakfast 5:00 AM–10:00 AM, Lunch 10:00 AM–2:00 PM, Dinner 2:00 PM–10:00 PM. Invalid selection(s): ${invalidSelections.join(', ')}.`
      });
    }

    // Create new registration
    const registration = await MealRegistration.create({
      idNumber: user.idNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      university: user.university,
      meals: {
        breakfast: meals.breakfast || false,
        lunch: meals.lunch || false,
        dinner: meals.dinner || false
      },
      mealsAvailed: {
        breakfast: !!(meals.breakfast),
        lunch: !!(meals.lunch),
        dinner: !!(meals.dinner)
      }
    });

    const userWithAccountId = await User.findOne({ idNumber: registration.idNumber })
      .select('accountID')
      .lean();

    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const historyCreates = mealTypes
      .filter((mealType) => !!(meals?.[mealType]))
      .map((mealType) => AvailHistory.create({
        registrationId: registration._id,
        idNumber: registration.idNumber,
        accountID: userWithAccountId?.accountID || null,
        firstName: registration.firstName,
        lastName: registration.lastName,
        mealType,
        availedBy: {
          idNumber: registration.idNumber,
          name: `${registration.firstName} ${registration.lastName}`
        },
        registrationDate: registration.registrationDate
      }));

    await Promise.all(historyCreates);

    res.json({
      success: true,
      message: 'Meal registration successful',
      registration
    });
  } catch (error) {
    console.error('Error registering meals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMealRegistration = async (req, res) => {
  try {
    const user = req.user;

    // Check if user is from LIMA
    if (user.university !== 'lima') {
      return res.status(403).json({ 
        message: 'Meal registration is only available for LIMA students' 
      });
    }

    // Use proper timezone handling with Asia/Manila timezone
    const now = new Date();
    
    // Get current time in Asia/Manila (UTC+8) for window calculations
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const philNow = new Date(utcTime + (8 * 3600000));
    
    // Compute the start of the current 5 AM–5 AM window in PH time
    const windowStart = new Date(philNow);
    windowStart.setHours(5, 0, 0, 0); // 5:00 AM
    
    // If current PH time is before 5 AM, use previous day's 5 AM as window start
    if (philNow.getHours() < 5) {
      windowStart.setDate(windowStart.getDate() - 1);
    }
    
    // Convert window boundaries back to UTC for database queries
    const windowStartUTC = new Date(windowStart.getTime() - (8 * 3600000));
    const windowEndUTC = new Date(windowStartUTC.getTime() + (24 * 3600000));

    // Find active registration in the current 5 AM–5 AM PH window
    const registration = await MealRegistration.findOne({
      idNumber: user.idNumber,
      registrationDate: {
        $gte: windowStartUTC,
        $lt: windowEndUTC
      },
      status: 'active'
    });

    res.json({
      success: true,
      registration: registration || null
    });
  } catch (error) {
    console.error('Error fetching meal registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
