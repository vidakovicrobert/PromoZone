// db.js
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config(); // load MONGO_URI, DB_NAME from .env

const uri     = process.env.MONGO_URI;
const dbName  = process.env.DB_NAME;

let cachedClient = null;
let cachedDb     = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, { /* your options */ });
  await client.connect();
  console.log('Uspješno spajanje na bazu podataka');

  const db = client.db(dbName);
  cachedClient = client;
  cachedDb     = db;
  return { client, db };
}
