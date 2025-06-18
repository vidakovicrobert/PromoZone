// seed.js
// Prototype seeder for MongoDB (native driver) using centralized connection helper
// Collections: countries, chains, stores, categories, leaflets

import { connectToDatabase } from './db.js';

async function createCollections(db) {
  // Create collections if they don't exist and add indexes
  await Promise.all([
    db.createCollection('countries').catch(() => {}),
    db.createCollection('chains').catch(() => {}),
    db.createCollection('stores').catch(() => {}),
    db.createCollection('categories').catch(() => {}),
    db.createCollection('leaflets').catch(() => {}),
  ]);

  // Unique indexes for quick lookup and data integrity
  await db.collection('countries').createIndex({ code: 1 }, { unique: true });
  await db.collection('chains').createIndex({ name: 1 }, { unique: true });
  await db.collection('stores').createIndex({ url: 1 }, { unique: true });
  await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
  await db.collection('leaflets').createIndex(
    { store: 1, validFrom: 1 },
    { unique: true }
  );
}

async function seed(db) {
  // Clear existing data (idempotent)
  const names = ['countries','chains','stores','categories','leaflets'];
  await Promise.all(names.map(n => db.collection(n).deleteMany({})));

  // References for later
  const countries = db.collection('countries');
  const chains = db.collection('chains');
  const stores = db.collection('stores');
  const categories = db.collection('categories');
  const leaflets = db.collection('leaflets');

  // 1. Seed one country
  const { insertedId: countryId } = await countries.insertOne({
    code: 'HR',
    name: 'Croatia',
    createdAt: new Date()
  });

  // 2. Seed chains
  const { insertedId: sparChainId } = await chains.insertOne({
    name: 'SPAR',
    website: 'https://www.spar.hr',
    country: countryId,
    createdAt: new Date()
  });
  const { insertedId: dmChainId } = await chains.insertOne({
    name: 'DM',
    website: 'https://www.dm.hr',
    country: countryId,
    createdAt: new Date()
  });

  // 3. Seed stores
  const { insertedId: sparStoreId } = await stores.insertOne({
    chain: sparChainId,
    name: 'SPAR Zagreb Ilica',
    url: 'https://www.spar.hr/zagreb-ilica',
    location: { city: 'Zagreb' },
    createdAt: new Date()
  });
  const { insertedId: dmStoreId } = await stores.insertOne({
    chain: dmChainId,
    name: 'DM Dubrovnik',
    url: 'https://www.dm.hr/dubrovnik',
    location: { city: 'Dubrovnik' },
    createdAt: new Date()
  });

  // 4. Seed categories
  const { insertedId: foodCatId } = await categories.insertOne({
    slug: 'food',
    name: 'Food & Grocery',
    createdAt: new Date()
  });
  const { insertedId: beautyCatId } = await categories.insertOne({
    slug: 'beauty',
    name: 'Beauty & Health',
    createdAt: new Date()
  });

  // 5. Seed a sample leaflet for SPAR store (weekly period)
  const now = new Date();
  // Find last Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  await leaflets.insertOne({
    store: sparStoreId,
    validFrom: monday,
    validTo: nextMonday,
    scrapedAt: now,
    createdAt: now
  });

  console.log('✅ Prototype seed complete');
}

async function main() {
  const { db, client } = await connectToDatabase();
  try {
    await createCollections(db);
    await seed(db);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
