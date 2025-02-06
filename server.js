import express from 'express';
import { connectToDatabase } from './db.js';
//import './seed.js';  // This runs the seed script on startup

const app = express();
app.use(express.json());

let db = await connectToDatabase();

// Home Route
app.get('/', (req, res) => {
    res.send('PromoZone Backend is running');
});

// Users - Fetch All
app.get('/users', async (req, res) => {
    try {
        let users_collection = db.collection('users');
        let allUsers = await users_collection.find().toArray();
        res.status(200).json(allUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Authentication Routes (Register & Login)
app.post('/register', async (req, res) => {
    try {
        let users_collection = db.collection('users');
        let { name, email, password } = req.body;

        let existingUser = await users_collection.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        await users_collection.insertOne({ name, email, password });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/login', async (req, res) => {
    try {
        let users_collection = db.collection('users');
        let { email, password } = req.body;

        let user = await users_collection.findOne({ email, password });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Stores - Fetch All
app.get('/stores', async (req, res) => {
    try {
        let stores_collection = db.collection('stores');
        let allStores = await stores_collection.find().toArray();
        res.status(200).json(allStores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stores' });
    }
});

// Stores - Fetch by Category
app.get('/stores/category/:category', async (req, res) => {
    try {
        let category = req.params.category;
        let stores_collection = db.collection('stores');
        let categorizedStores = await stores_collection.find({ category: category }).toArray();
        
        if (categorizedStores.length === 0) {
            return res.status(404).json({ message: 'No stores found for this category' });
        }

        res.status(200).json(categorizedStores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stores by category' });
    }
});

// Stores - Fetch Favorite Stores
app.get('/stores/favorites', async (req, res) => {
    try {
        let stores_collection = db.collection('stores');
        let favoriteStores = await stores_collection.find({ isFavorite: true }).toArray();
        res.status(200).json(favoriteStores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch favorite stores' });
    }
});

// Flyers - Fetch All
app.get('/flyers', async (req, res) => {
    try {
        let flyers_collection = db.collection('flyers');
        let allFlyers = await flyers_collection.find().toArray();
        res.status(200).json(allFlyers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch flyers' });
    }
});

// Flyers - Fetch New Flyers
app.get('/flyers/new', async (req, res) => {
    try {
        let flyers_collection = db.collection('flyers');
        let newFlyers = await flyers_collection.find({ isNew: true }).toArray();
        res.status(200).json(newFlyers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch new flyers' });
    }
});

// Flyers - Fetch Saved Flyers
app.get('/flyers/saved', async (req, res) => {
    try {
        let flyers_collection = db.collection('flyers');
        let savedFlyers = await flyers_collection.find({ isSaved: true }).toArray();
        res.status(200).json(savedFlyers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch saved flyers' });
    }
});

// Shopping List - CRUD
app.get('/shopping-list', async (req, res) => {
    try {
        let shopping_collection = db.collection('shopping_list');
        let list = await shopping_collection.find().toArray();
        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
});

app.post('/shopping-list', async (req, res) => {
    try {
        let shopping_collection = db.collection('shopping_list');
        let { item, quantity } = req.body;
        await shopping_collection.insertOne({ item, quantity });
        res.status(201).json({ message: 'Item added to shopping list' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item' });
    }
});

app.delete('/shopping-list/:id', async (req, res) => {
    try {
        let shopping_collection = db.collection('shopping_list');
        let { id } = req.params;
        await shopping_collection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ message: 'Item removed from shopping list' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Settings/Preferences (Placeholder for future settings)
app.get('/settings', (req, res) => {
    res.status(200).json({ message: 'Settings API is not implemented yet' });
});

// Start Server
const PORT = 4000;
app.listen(PORT, error => {
    if (error) {
        console.log('Error starting server:', error);
    }
    console.log(`Server is running on http://localhost:${PORT}`);
});
