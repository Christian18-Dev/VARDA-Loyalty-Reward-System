import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String }
});

export default mongoose.model('Reward', rewardSchema);
