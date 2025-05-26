import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  code: { type: String, required: true },
  idNumber: { type: String, required: true },  // User's ID number
  rating: { type: Number, required: true, min: 1, max: 5 },
  date: { type: Date, default: Date.now },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
