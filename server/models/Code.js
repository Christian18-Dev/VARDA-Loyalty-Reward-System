import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // Add status field
  createdAt: { type: Date, default: Date.now },
  // Redemption tracking fields
  redeemedBy: { type: String }, // Store IDNumber of user who redeemed
  redeemedAt: { type: Date } // Store when the code was redeemed
});

const Code = mongoose.model('Code', codeSchema);

export default Code;
