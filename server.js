import express from 'express';
import { connectToDatabase } from './db.js';

const app = express();
app.use(express.json());

let db = await connectToDatabase();

app.get('/', (req, res) => {
    res.send('PromoZone Backend is running');
});

app.get('/users', async (req, res) => {
    let users_collection = db.collection('users'); // pohranjujemo referencu na kolekciju
    let allUsers = await users_collection.find().toArray(); // dohvaćamo sve korisnike iz kolekcije i pretvaramo Cursor objekt u Array
    res.status(200).json(allUsers);
});


const PORT = 3000;
app.listen(PORT, error => {
    if (error) {
        console.log('Greška prilikom pokretanja servera', error);
    }
    console.log(`Server is running on http://localhost:${PORT}`);
});