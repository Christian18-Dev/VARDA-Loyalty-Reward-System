import Code from '../models/Code.js'; // Make sure this line is at the top of your file
import ClaimedReward from '../models/ClaimedReward.js';
import PointsUsage from '../models/PointsUsage.js';
import User from '../models/User.js';

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

// Get points usage history with user details
export const getPointsUsageHistory = async (req, res) => {
  try {
    // Get the cashier's store name from their role
    let storeName;
    switch (req.user.role) {
      case 'varda':
        storeName = 'Varda';
        break;
      case 'blueCafe':
        storeName = 'Blue Cafe';
        break;
      case 'colonelsCurry':
        storeName = "Colonel's Curry";
        break;
      case 'chillers':
        storeName = 'Chillers';
        break;
      case 'luckyShawarma':
        storeName = 'Lucky Shawarma';
        break;
      case 'yumdimdum':
        storeName = 'Yumdimdum';
        break;
      default:
        storeName = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);
    }
    
    // Find points usage records for this store only
    const pointsUsage = await PointsUsage.find({ storeName })
      .sort({ dateUsed: -1 })
      .lean();

    // Get user details for each points usage record
    const pointsUsageWithUserDetails = await Promise.all(
      pointsUsage.map(async (usage) => {
        const user = await User.findOne({ idNumber: usage.idNumber })
          .select('firstName lastName')
          .lean();
        
        return {
          ...usage,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || 'Unknown'
        };
      })
    );

    res.json(pointsUsageWithUserDetails);
  } catch (error) {
    console.error('Error fetching points usage history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};