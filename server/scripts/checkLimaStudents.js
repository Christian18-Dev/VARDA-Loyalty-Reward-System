import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import AvailHistory from '../models/AvailHistory.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const students = await User.find({ university: 'lima' }).lean();
  console.log('Total LIMA users:', students.length);
  const byRole = {};
  students.forEach(s => {
    byRole[s.role] = (byRole[s.role] || 0) + 1;
  });
  console.log('LIMA users by role:', byRole);

  // Check some student records
  console.log('Sample LIMA student:', {
    idNumber: students[0].idNumber,
    accountID: students[0].accountID,
    firstName: students[0].firstName,
    lastName: students[0].lastName,
    limaBatch: students[0].limaBatch,
    university: students[0].university
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

