import mongoose from 'mongoose';

const availHistorySchema = new mongoose.Schema({
  registrationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MealRegistration', 
    required: true 
  },
  idNumber: { type: String, required: true },
  accountID: { type: Number },
  limaBatch: { type: String, enum: ['B29', 'B31', 'B32'], default: null },
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
  availedAt: { type: Date, default: Date.now },
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

