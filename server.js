// server.js
// Express backend for PromoZone, integrating centralized DB connection and prototype seeder

import express from 'express';
import { body, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './db.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
//import './seed.js'; // Run seed script on startup

async function startServer() {
  // Establish MongoDB connection
  const { db, client } = await connectToDatabase();
  
  dotenv.config();
  if (!process.env.JWT_SECRET) {
    console.error('⚠️  Missing JWT_SECRET in environment!');
    process.exit(1);
  }

  
  const app = express();
  const SALT_ROUNDS = 10;
  const JWT_SECRET    = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

  console.log('Using JWT secret:', JWT_SECRET);

  // CORS & JSON
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.options('*', cors());
  app.use(express.json());

  // Issue token helper
  function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Auth middleware
  function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const token = auth.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // REGISTER
  app.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Must be a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const users = db.collection('users');
    if (await users.findOne({ email })) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const createdAt    = new Date();
    const result       = await users.insertOne({ name, email, passwordHash, createdAt });

    const user = { _id: result.insertedId, name, email };
    const token = signToken(user);

    res.status(201).json({ message: 'Registered', user, token });
  });

  // LOGIN
  app.post('/login', [
    body('email').isEmail().withMessage('Must be a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const users = db.collection('users');
    const userDoc = await users.findOne({ email });
    if (!userDoc) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, userDoc.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = { _id: userDoc._id, name: userDoc.name, email: userDoc.email };
    const token = signToken(user);

    res.json({ message: 'Logged in', user, token });
  });

  // Example protected route
  app.get('/me', requireAuth, async (req, res) => {
    // req.user comes from the token payload
    res.json({ user: req.user });
  });

// Home Route
  app.get('/', (req, res) => {
    res.send('PromoZone Backend is running');
  });

  // Users - Fetch All
  app.get('/users', async (req, res) => {
    try {
      const users = await db.collection('users').find().toArray();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });


  // Stores - Fetch All
  app.get('/stores', async (req, res) => {
    try {
      const stores = await db.collection('stores').find().toArray();
      res.status(200).json(stores);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  });

  // Stores - Fetch by Category
  app.get('/stores/category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const storesCollection = db.collection('stores');
      const filtered = await storesCollection.find({ category }).toArray();
      if (!filtered.length) return res.status(404).json({ message: 'No stores found for this category' });
      res.status(200).json(filtered);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stores by category' });
    }
  });

  // Stores - Fetch Favorite Stores
  app.get('/stores/favorites', async (req, res) => {
    try {
      const favorites = await db.collection('stores').find({ isFavorite: true }).toArray();
      res.status(200).json(favorites);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch favorite stores' });
    }
  });

  // Flyers - Fetch All
  app.get('/flyers', async (req, res) => {
    try {
      const flyers = await db.collection('flyers').find().toArray();
      res.status(200).json(flyers);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch flyers' });
    }
  });

  // Flyers - Fetch New (e.g., current week)
  app.get('/flyers/new', async (req, res) => {
    try {
      const now = new Date();
      const flyersCollection = db.collection('flyers');
      const newFlyers = await flyersCollection.find({ validFrom: { $lte: now }, validTo: { $gte: now } }).toArray();
      res.status(200).json(newFlyers);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch new flyers' });
    }
  });

  // Shopping List - CRUD
  app.get('/shopping-list', async (req, res) => {
    try {
      const list = await db.collection('shopping_list').find().toArray();
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
  });

  app.post('/shopping-list', async (req, res) => {
    try {
      const { item, quantity } = req.body;
      await db.collection('shopping_list').insertOne({ item, quantity });
      res.status(201).json({ message: 'Item added to shopping list' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  app.delete('/shopping-list/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('shopping_list').deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Item removed from shopping list' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove item' });
    }
  });

  // Settings/Preferences (Placeholder)
  app.get('/settings', (req, res) => {
    res.status(200).json({ message: 'Settings API is not implemented yet' });
  });

  // Start Server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, err => {
    if (err) console.error('Server start error:', err);
    else console.log(`Server is running at http://localhost:${PORT}`);
  });
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await client.close();
    process.exit(0);
  });
}

startServer().catch(err => console.error('Startup error:', err));
