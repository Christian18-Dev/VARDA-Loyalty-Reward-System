import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';
import MealRegistration from '../models/MealRegistration.js';

async function testToday() {
  await mongoose.connect(process.env.MONGO_URI);

  // Today in PH time 5 AM window:
  // Today is Oct 30 2026
  const windowStartUTC = new Date('2026-10-29T21:00:00.000Z'); // 5:00 AM PH Oct 30
  const windowEndUTC = new Date('2026-10-30T21:00:00.000Z');   // 5:00 AM PH Oct 31

  const histQuery = {
    $or: [
      { registrationDate: { $gte: windowStartUTC, $lt: windowEndUTC } },
      { availedAt: { $gte: windowStartUTC, $lt: windowEndUTC } }
    ]
  };

  const availHistories = await AvailHistory.find(histQuery).lean();
  console.log('AvailHistories in window:', availHistories.length);

  // Group by mealType
  const availedCounts = { breakfast: 0, lunch: 0, dinner: 0 };
  const availedStudentsByMeal = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set()
  };

  availHistories.forEach(h => {
    if (availedCounts[h.mealType] !== undefined) {
      availedCounts[h.mealType] += 1;
      availedStudentsByMeal[h.mealType].add(h.idNumber);
    }
  });

  console.log('Availed counts by meal:', availedCounts);
  console.log('Unique students who availed breakfast:', availedStudentsByMeal.breakfast.size);
  console.log('Unique students who availed lunch:', availedStudentsByMeal.lunch.size);
  console.log('Unique students who availed dinner:', availedStudentsByMeal.dinner.size);

  // Total LIMA students
  const limaStudents = await User.find({ university: 'lima', role: 'student' }).lean();
  console.log('Total LIMA students (role: student):', limaStudents.length);

  // Let's see how many LIMA students did NOT avail breakfast:
  const unavailedBreakfast = limaStudents.filter(s => !availedStudentsByMeal.breakfast.has(s.idNumber));
  console.log('Unavailed Breakfast count:', unavailedBreakfast.length);

  // Unavailed Lunch:
  const unavailedLunch = limaStudents.filter(s => !availedStudentsByMeal.lunch.has(s.idNumber));
  console.log('Unavailed Lunch count:', unavailedLunch.length);

  // Unavailed Dinner:
  const unavailedDinner = limaStudents.filter(s => !availedStudentsByMeal.dinner.has(s.idNumber));
  console.log('Unavailed Dinner count:', unavailedDinner.length);

  process.exit(0);
}

testToday().catch(err => {
  console.error(err);
  process.exit(1);
});

