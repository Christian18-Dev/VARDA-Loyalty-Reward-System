import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const indexes = await db.collection('mealregistrations').indexes();
  console.log('mealregistrations indexes:', indexes);

  // Also check if any cron jobs or scheduled tasks exist in server
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

