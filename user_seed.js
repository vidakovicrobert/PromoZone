import { connectToDatabase } from './db.js';

async function seed() {
  const { db, client } = await connectToDatabase();

  // Check if 'users' collection already exists
  const existing = await db.listCollections({ name: 'users' }).toArray();
  if (existing.length === 0) {
    // Create 'users' with extended JSON Schema validation
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'passwordHash', 'createdAt'],
          properties: {
            name: {
              bsonType: 'string',
              description: 'User full name'
            },
            email: {
              bsonType: 'string',
              pattern: '^.+@.+\\..+$',
              description: 'Valid email address and is required'
            },
            passwordHash: {
              bsonType: 'string',
              description: 'Hashed password and is required'
            },
            createdAt: {
              bsonType: 'date',
              description: 'Account creation date and is required'
            },
            lastLogin: {
              bsonType: 'date',
              description: 'Last login date'
            },
            roles: {
              bsonType: 'array',
              items: { enum: ['user', 'admin'] },
              description: 'User roles (default: ["user"])'
            },
            isVerified: {
              bsonType: 'bool',
              description: 'Email verification status (default: false)'
            }
          }
        }
      }
    });
    console.log('Created users collection with extended schema validation');
  }

  // Ensure a unique index on email
  await db.collection('users').createIndex(
    { email: 1 },
    { unique: true, background: true }
  );
  console.log('Ensured unique index on users.email');

  // 3) Insert test users if collection is empty
  const count = await db.collection('users').countDocuments();
  if (count === 0) {
    const now = new Date();
    await db.collection('users').insertMany([
      {
        email: 'alice@example.com',
        passwordHash: 'hash1',
        createdAt: now,
        name: 'Alice',
        roles: ['user'],
        isVerified: true
      },
      {
        email: 'bob@example.com',
        passwordHash: 'hash2',
        createdAt: now,
        name: 'Bob',
        roles: ['user'],
        isVerified: false
      },
      {
        email: 'carol@example.com',
        passwordHash: 'hash3',
        createdAt: now,
        name: 'Carol',
        roles: ['admin'],
        isVerified: true
      }
    ]);
    console.log('Inserted 3 test users into users collection');
  }

  await client.close();

}

seed().catch(console.error);
