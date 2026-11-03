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

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const doc = await db.collection(col.name).findOne({ _id: targetId });
    if (doc) {
      console.log(`Found in collection ${col.name}:`, doc);
    }
  }

  // Also search if there is another database or collection
  console.log('Done searching for targetId');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

