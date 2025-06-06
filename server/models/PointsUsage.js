import mongoose from 'mongoose';

const pointsUsageSchema = new mongoose.Schema({
  idNumber: { type: String, required: true },  // User's ID number
  firstName: { type: String, required: true }, // User's first name
  lastName: { type: String, required: true },  // User's last name
  mealType: { 
    type: String, 
    required: true,
    enum: ['breakfast', 'lunch', 'dinner']
  },
  storeName: { type: String, required: true },  // Name of the store/canteen
  pointsUsed: { type: Number, required: true }, // Points spent
  items: [{  // Array of items purchased
    name: String,
    points: Number,
    quantity: Number
  }],
  dateUsed: { type: Date, default: Date.now },
  totalAmount: { type: Number, required: true } // Total amount of the purchase
});

const PointsUsage = mongoose.model('PointsUsage', pointsUsageSchema);
export default PointsUsage; 