import mongoose from 'mongoose';

const claimedRewardSchema = new mongoose.Schema({
  idNumber: { type: String, required: true },  // User's ID number
  reward: { type: String, required: true },    // Reward name
  pointsUsed: { type: Number, required: true }, // Points spent
  dateClaimed: { type: Date, default: Date.now },
});

const ClaimedReward = mongoose.model('ClaimedReward', claimedRewardSchema);
export default ClaimedReward;