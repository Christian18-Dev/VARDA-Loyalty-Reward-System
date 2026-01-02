import mongoose from 'mongoose';

const mealRegistrationSchema = new mongoose.Schema({
  idNumber: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  university: { type: String, required: true },
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },
  mealsAvailed: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },
  registrationDate: { 
    type: Date, 
    default: () => {
      // Store registration date in Asia/Manila timezone (UTC+8)
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utcTime + (8 * 3600000));
    }
  },
  status: { 
    type: String, 
    enum: ['active', 'cancelled'], 
    default: 'active' 
  }
}, {
  timestamps: true
});

// Index to prevent duplicate active registrations for the same day
mealRegistrationSchema.index({ idNumber: 1, registrationDate: 1, status: 1 });

const MealRegistration = mongoose.model('MealRegistration', mealRegistrationSchema);
export default MealRegistration;

