import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // Let's find ANY doc in mealregistrations
  const allDocs = await db.collection('mealregistrations').find({}).toArray();
  console.log('Native find() count in mealregistrations:', allDocs.length);
  console.log('Docs:', allDocs);

  // Let's inspect the ObjectId of recent AvailHistories
  const sampleHist = await db.collection('availhistories').findOne({}, { sort: { _id: -1 } });
  console.log('Latest AvailHistory doc:', sampleHist);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

