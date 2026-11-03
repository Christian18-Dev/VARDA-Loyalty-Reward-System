import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const client = await mongoose.connect(process.env.MONGO_URI);
  console.log('Current connected DB name:', mongoose.connection.name);

  // Check each database for mealregistrations!
  for (const dbName of ['Varda', 'test', 'ISIP', 'coupondb_test', 'digital_menu']) {
    const db = mongoose.connection.client.db(dbName);
    const cols = await db.listCollections().toArray();
    const colNames = cols.map(c => c.name);
    if (colNames.includes('mealregistrations')) {
      const c = await db.collection('mealregistrations').countDocuments();
      console.log(`DB ${dbName} has mealregistrations: count = ${c}`);
      if (c > 0) {
        const sample = await db.collection('mealregistrations').find().sort({ _id: -1 }).limit(3).toArray();
        console.log(`Sample from ${dbName}.mealregistrations:`, sample.map(s => ({
          _id: s._id,
          idNumber: s.idNumber,
          meals: s.meals,
          mealsAvailed: s.mealsAvailed,
          registrationDate: s.registrationDate
        })));
      }
    }
    if (colNames.includes('availhistories')) {
      const c = await db.collection('availhistories').countDocuments();
      console.log(`DB ${dbName} has availhistories: count = ${c}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

