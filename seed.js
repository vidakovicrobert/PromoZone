import { connectToDatabase } from './db.js';

async function seedDatabase(reset = false) {
    let db = await connectToDatabase();

    if (reset) {
        console.log("⚠️ Resetting database...");
        await db.collection('users').deleteMany({});
        await db.collection('stores').deleteMany({});
        await db.collection('flyers').deleteMany({});
        await db.collection('shopping_list').deleteMany({});
        console.log("✅ Database reset completed.");
    }

    // Users Collection
    const users = [
        { name: "John Doe", email: "john@example.com", password: "123456", favorites: ["Supermart"] },
        { name: "Jane Doe", email: "jane@example.com", password: "password", favorites: ["QuickBuy", "Supermart"] }
    ];

    // Stores Collection
    const stores = [
        { name: "Supermart", location: "Downtown", isFavorite: true },
        { name: "QuickBuy", location: "Suburb", isFavorite: false },
        { name: "GroceryLand", location: "Mall", isFavorite: false }
    ];

    // Flyers Collection (now includes images, dates, and items)
    const flyers = [
        { store: "Supermart", title: "Supermart Deals", isNew: true, isSaved: false, imageUrl: "https://example.com/supermart.jpg", date: "2024-02-04", items: ["Milk", "Bread", "Apples"] },
        { store: "QuickBuy", title: "Weekly Discounts", isNew: false, isSaved: true, imageUrl: "https://example.com/quickbuy.jpg", date: "2024-02-01", items: ["Cheese", "Tomatoes"] },
        { store: "GroceryLand", title: "Fresh Market", isNew: true, isSaved: false, imageUrl: "https://example.com/groceryland.jpg", date: "2024-02-03", items: ["Carrots", "Oranges", "Chicken"] }
    ];

    // Shopping List Collection (linked to users)
    const shoppingList = [
        { userEmail: "john@example.com", items: [{ item: "Milk", quantity: 2 }, { item: "Eggs", quantity: 12 }] },
        { userEmail: "jane@example.com", items: [{ item: "Bread", quantity: 1 }, { item: "Tomatoes", quantity: 5 }] }
    ];

    try {
        await db.collection('users').insertMany(users);
        await db.collection('stores').insertMany(stores);
        await db.collection('flyers').insertMany(flyers);
        await db.collection('shopping_list').insertMany(shoppingList);
        console.log("✅ Database seeded successfully");
    } catch (error) {
        console.error("⚠️ Error seeding database:", error);
    }
}

// Run script with reset option
const resetDB = process.argv.includes("--reset"); // Run `nodemon seed.js --reset` to reset
seedDatabase(resetDB);
