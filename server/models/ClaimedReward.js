import mongoose from 'mongoose';

const claimedRewardSchema = new mongoose.Schema({
  idNumber: { type: String, required: true },  // User's ID number
  reward: { 
    type: mongoose.Schema.Types.Mixed, // Allow both String and ObjectId for backward compatibility
    required: true 
  }, 
  rewardName: { type: String, required: true }, // Store reward name for quick access
  pointsUsed: { type: Number, required: true }, // Points spent
  claimedAt: { type: Date, default: Date.now }, // Renamed for consistency
  status: { type: String, enum: ['claimed', 'redeemed'], default: 'claimed' }, // Status of the claimed reward
});

// Add index for better query performance
claimedRewardSchema.index({ idNumber: 1, claimedAt: -1 });

const ClaimedReward = mongoose.model('ClaimedReward', claimedRewardSchema);
export default ClaimedReward;