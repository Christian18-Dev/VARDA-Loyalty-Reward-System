import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  email: { 
    type: String, 
    unique: true,
    required: function() {
      // Only require email for new documents (when _id doesn't exist)
      return !this._id;
    }
  },
  password: { type: String, required: true },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  role: {
    type: String,
    enum: [
      'student', 
      'teacher', 
      'ateneoStaff', 
      'cashier', 
      'admin', 
      'concierge', 
      'catering',
      'varda',
      'blueCafe',
      'colonelsCurry',
      'chillers',
      'luckyShawarma',
      'yumdimdum',
      'guest'
    ],
    default: 'student'
  },
  university: {
    type: String,
    enum: [
      'ateneo',
      'dlsulipa',
      'lpudavao',
      'lima',
      'mapuadavao',
      'mapuamakati'
    ],
    default: 'ateneo'
  },
  points: { type: Number, default: 0 },   // Loyalty points
  pointsUsed: { type: Number, default: 0 }, // Total loyalty points spent
  cateringPoints: {
    type: {
      breakfast: { type: Number, default: 250 },
      lunch: { type: Number, default: 250 },
      dinner: { type: Number, default: 250 },
      lastReset: { type: Date, default: Date.now }
    },
    default: () => ({
      breakfast: 250,
      lunch: 250,
      dinner: 250,
      lastReset: new Date()
    })
  },
  cateringPointsUsed: { type: Number, default: 0 }, // Total catering points spent
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // Ensure we don't have any unwanted indexes
  autoIndex: false
});

const User = mongoose.model('User', userSchema);

// Drop any existing indexes on the collection
User.collection.dropIndexes().catch(err => {
  console.log('No indexes to drop or error dropping indexes:', err);
});

export default User;
