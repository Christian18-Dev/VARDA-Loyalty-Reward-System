import mongoose from 'mongoose';

const availHistorySchema = new mongoose.Schema({
  registrationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MealRegistration', 
    required: true 
  },
  idNumber: { type: String, required: true },
  accountID: { type: Number },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mealType: { 
    type: String, 
    enum: ['breakfast', 'lunch', 'dinner'], 
    required: true 
  },
  availedBy: {
    idNumber: { type: String, required: true },
    name: { type: String, required: true }
  },
  availedAt: { 
    type: Date, 
    default: () => {
      // Store availed date in Asia/Manila timezone (UTC+8)
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utcTime + (8 * 3600000));
    }
  },
  registrationDate: { type: Date, required: true }
}, {
  timestamps: true
});

// Index for efficient queries
availHistorySchema.index({ availedAt: -1 });
availHistorySchema.index({ accountID: 1 });
availHistorySchema.index({ idNumber: 1 });
availHistorySchema.index({ mealType: 1 });

const AvailHistory = mongoose.model('AvailHistory', availHistorySchema);
export default AvailHistory;

