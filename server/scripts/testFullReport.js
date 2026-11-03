import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';

async function testReport() {
  await mongoose.connect(process.env.MONGO_URI);

  const startUTC = new Date('2026-10-29T21:00:00.000Z');
  const endUTC = new Date('2026-10-30T21:00:00.000Z');

  // 1. Fetch eligible students
  const studentQuery = { university: 'lima', role: 'student' };
  const students = await User.find(studentQuery).lean();
  const studentMap = new Map(students.map(s => [s.idNumber, s]));

  // 2. Fetch AvailHistory
  const histQuery = {
    $or: [
      { registrationDate: { $gte: startUTC, $lt: endUTC } },
      { availedAt: { $gte: startUTC, $lt: endUTC } }
    ]
  };
  const availHistories = await AvailHistory.find(histQuery).sort({ availedAt: -1 }).lean();

  // 3. Count availed by meal
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

  const totalRegisteredStudents = students.length;
  const daysCount = 1;
  const registeredPerMeal = totalRegisteredStudents * daysCount;

  const metrics = {
    breakfast: {
      registered: registeredPerMeal,
      availed: availedCounts.breakfast,
      unavailed: Math.max(0, registeredPerMeal - availedCounts.breakfast),
      rate: Number(((availedCounts.breakfast / registeredPerMeal) * 100).toFixed(1))
    },
    lunch: {
      registered: registeredPerMeal,
      availed: availedCounts.lunch,
      unavailed: Math.max(0, registeredPerMeal - availedCounts.lunch),
      rate: Number(((availedCounts.lunch / registeredPerMeal) * 100).toFixed(1))
    },
    dinner: {
      registered: registeredPerMeal,
      availed: availedCounts.dinner,
      unavailed: Math.max(0, registeredPerMeal - availedCounts.dinner),
      rate: Number(((availedCounts.dinner / registeredPerMeal) * 100).toFixed(1))
    },
    total: {
      registered: registeredPerMeal * 3,
      availed: availedCounts.breakfast + availedCounts.lunch + availedCounts.dinner,
      unavailed: (registeredPerMeal * 3) - (availedCounts.breakfast + availedCounts.lunch + availedCounts.dinner),
      rate: Number((((availedCounts.breakfast + availedCounts.lunch + availedCounts.dinner) / (registeredPerMeal * 3)) * 100).toFixed(1))
    }
  };

  console.log('Metrics summary:');
  console.log(metrics);

  process.exit(0);
}

testReport().catch(err => {
  console.error(err);
  process.exit(1);
});

