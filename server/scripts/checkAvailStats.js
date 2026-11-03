import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Let's aggregate AvailHistory by mealType for today or overall
  const overallByMeal = await AvailHistory.aggregate([
    { $group: { _id: '$mealType', count: { $sum: 1 } } }
  ]);
  console.log('Overall AvailHistory by mealType:', overallByMeal);

  // Today's range (2026-10-30 in PH time)
  const now = new Date('2026-10-30T13:40:00+08:00');
  const startOfDay = new Date('2026-10-30T00:00:00+08:00');
  const endOfDay = new Date('2026-10-30T23:59:59+08:00');

  const todayByMeal = await AvailHistory.aggregate([
    { $match: { availedAt: { $gte: startOfDay, $lte: endOfDay } } },
    { $group: { _id: '$mealType', count: { $sum: 1 } } }
  ]);
  console.log("Today's AvailHistory by mealType (availedAt):", todayByMeal);

  const todayByRegDate = await AvailHistory.aggregate([
    { $match: { registrationDate: { $gte: startOfDay, $lte: endOfDay } } },
    { $group: { _id: '$mealType', count: { $sum: 1 } } }
  ]);
  console.log("Today's AvailHistory by mealType (registrationDate):", todayByRegDate);

  // Total unique students who availed today
  const studentsToday = await AvailHistory.distinct('idNumber', {
    registrationDate: { $gte: startOfDay, $lte: endOfDay }
  });
  console.log("Today's distinct students in AvailHistory:", studentsToday.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

