import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to DB:', mongoose.connection.db.databaseName);

import { executeDailySummaryEmail, initDailySummaryCron } from '../utils/dailySummaryCron.js';

// Test cron registration
const task = initDailySummaryCron();
task.stop();

// Test sending the summary email
const res = await executeDailySummaryEmail({});
console.log('Email execution result:', {
  success: res.success,
  filename: res.filename,
  recipients: res.recipients,
  mode: res.mode,
  dateRangeLabel: res.dateRangeLabel
});

await mongoose.disconnect();
console.log('Done.');

