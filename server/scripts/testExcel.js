import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to DB:', mongoose.connection.db.databaseName);

import { getMealSummaryData, buildSummaryExcelWorkbook } from '../utils/summaryReportService.js';

const data = await getMealSummaryData({});
console.log('Date label:', data.dateRangeLabel);
console.log('Breakfast availed:', data.metrics.breakfast.availed);
console.log('Lunch availed:', data.metrics.lunch.availed);

// Test Excel generation
const workbook = buildSummaryExcelWorkbook(data);
const buffer = await workbook.xlsx.writeBuffer();
const outPath = join(__dirname, 'test_output.xlsx');
writeFileSync(outPath, buffer);
console.log('Excel written to:', outPath, '| Size:', buffer.byteLength, 'bytes');

await mongoose.disconnect();
console.log('Done.');

