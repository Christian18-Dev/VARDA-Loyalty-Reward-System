import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const targetId = new mongoose.Types.ObjectId('6ae42730db9ab0ee4a626531');
  console.log('TargetId generation time:', targetId.getTimestamp());

  // Check mealregistrations count again
  const count = await db.collection('mealregistrations').countDocuments();
  console.log('db.collection(mealregistrations).countDocuments():', count);

  // Check if any other database exists on this mongo instance!
  const adminDb = db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('Databases on this MongoDB cluster:', dbs.databases.map(d => d.name));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

