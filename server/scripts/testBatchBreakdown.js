import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';

async function testBatchBreakdown() {
  await mongoose.connect(process.env.MONGO_URI);

  const windowStartUTC = new Date('2026-10-29T21:00:00.000Z');
  const windowEndUTC = new Date('2026-10-30T21:00:00.000Z');

  const histQuery = {
    $or: [
      { registrationDate: { $gte: windowStartUTC, $lt: windowEndUTC } },
      { availedAt: { $gte: windowStartUTC, $lt: windowEndUTC } }
    ]
  };

  const availHistories = await AvailHistory.find(histQuery).lean();
  const limaStudents = await User.find({ university: 'lima', role: 'student' }).lean();
  const studentMap = new Map(limaStudents.map(s => [s.idNumber, s]));

  const batches = ['B29', 'B31', 'B32', 'B33'];
  const batchStats = {};
  batches.forEach(b => {
    batchStats[b] = {
      totalStudents: 0,
      breakfastAvailed: 0,
      lunchAvailed: 0,
      dinnerAvailed: 0,
      totalAvailed: 0
    };
  });

  limaStudents.forEach(s => {
    const b = s.limaBatch;
    if (batchStats[b]) {
      batchStats[b].totalStudents += 1;
    }
  });

  availHistories.forEach(h => {
    const s = studentMap.get(h.idNumber);
    const b = h.limaBatch || s?.limaBatch;
    if (batchStats[b]) {
      if (h.mealType === 'breakfast') batchStats[b].breakfastAvailed += 1;
      if (h.mealType === 'lunch') batchStats[b].lunchAvailed += 1;
      if (h.mealType === 'dinner') batchStats[b].dinnerAvailed += 1;
      batchStats[b].totalAvailed += 1;
    }
  });

  console.log('Batch Breakdown:');
  console.table(batchStats);

  process.exit(0);
}

testBatchBreakdown().catch(err => {
  console.error(err);
  process.exit(1);
});

