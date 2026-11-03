import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const client = mongoose.connection.client;

  for (const name of ['Varda', 'ISIP', 'coupondb_test', 'digital_menu']) {
    const db = client.db(name);
    const cols = await db.listCollections().toArray();
    console.log(`Collections in ${name}:`, cols.map(c => c.name));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

