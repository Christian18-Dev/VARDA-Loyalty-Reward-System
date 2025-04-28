import mongoose from 'mongoose';

const claimedRewardSchema = new mongoose.Schema({
  name: { type: String, required: true },      // User's name
  reward: { type: String, required: true },    // Reward name
  pointsUsed: { type: Number, required: true }, // NEW: Track points spent
  dateClaimed: { type: Date, default: Date.now },
});

const ClaimedReward = mongoose.model('ClaimedReward', claimedRewardSchema);
export default ClaimedReward;