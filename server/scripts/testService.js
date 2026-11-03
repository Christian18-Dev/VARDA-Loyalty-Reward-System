import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to DB:', mongoose.connection.db.databaseName);

// Quick test of the service
import { getMealSummaryData } from '../utils/summaryReportService.js';

const data = await getMealSummaryData({});
console.log('\n=== SUMMARY REPORT TEST ===');
console.log('Date range label:', data.dateRangeLabel);
console.log('Total registered students:', data.metrics.totalRegisteredStudents);
console.log('\nMeal Metrics:');
console.log('  Breakfast - Availed:', data.metrics.breakfast.availed, '| Unavailed:', data.metrics.breakfast.unavailed, '| Rate:', data.metrics.breakfast.rate + '%');
console.log('  Lunch     - Availed:', data.metrics.lunch.availed, '| Unavailed:', data.metrics.lunch.unavailed, '| Rate:', data.metrics.lunch.rate + '%');
console.log('  Dinner    - Availed:', data.metrics.dinner.availed, '| Unavailed:', data.metrics.dinner.unavailed, '| Rate:', data.metrics.dinner.rate + '%');
console.log('\nBatch Breakdown:');
data.batchBreakdown.forEach(b => {
  console.log(`  ${b.batch}: ${b.registeredStudents} students | BF=${b.breakfast.availed} | Lunch=${b.lunch.availed} | Dinner=${b.dinner.availed} | Rate=${b.overallRate}%`);
});
console.log('\nAvailed list entries:', data.availedList.length);
console.log('Unavailed list entries:', data.unavailedList.length);

await mongoose.disconnect();
console.log('\nDone.');

