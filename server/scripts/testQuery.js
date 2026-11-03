import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import MealRegistration from '../models/MealRegistration.js';
import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Check the latest 10 AvailHistory records
  const recentHistories = await AvailHistory.find().sort({ availedAt: -1 }).limit(10).lean();
  console.log('Recent 10 AvailHistories:');
  recentHistories.forEach(h => {
    console.log(`ID: ${h.idNumber}, AccountID: ${h.accountID}, Batch: ${h.limaBatch}, Meal: ${h.mealType}, RegDate: ${h.registrationDate}, AvailedAt: ${h.availedAt}, RegId: ${h.registrationId}`);
  });

  // Check the 2 MealRegistrations
  const allRegs = await MealRegistration.find().lean();
  console.log('\nAll MealRegistrations in DB:');
  console.log(allRegs);

  // Check collections in DB
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\nCollections in DB:', collections.map(c => c.name));

  // Check User count
  const userCount = await User.countDocuments();
  console.log('\nTotal Users in DB:', userCount);
  const limaUsers = await User.countDocuments({ university: 'lima' });
  console.log('Lima Users in DB:', limaUsers);
  const batchCounts = await User.aggregate([
    { $match: { university: 'lima' } },
    { $group: { _id: '$limaBatch', count: { $sum: 1 } } }
  ]);
  console.log('Lima Users by Batch:', batchCounts);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
