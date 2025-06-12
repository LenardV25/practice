// lib/dbConnect.ts
import mongoose from 'mongoose';

// Global variable to cache the Mongoose connection
let cachedMongooseConnection: {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} = global.mongoose;

if (!cachedMongooseConnection) {
  cachedMongooseConnection = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If a connection is already established, return it
  if (cachedMongooseConnection.conn) {
    return cachedMongooseConnection.conn;
  }

  // If there's no connection promise, create one
  if (!cachedMongooseConnection.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    const opts = {
      bufferCommands: false, // Disables Mongoose buffering, so connections fail fast
    };

    cachedMongooseConnection.promise = mongoose.connect(MONGODB_URI, opts);
  }

  // Await the connection promise and cache the connection
  cachedMongooseConnection.conn = await cachedMongooseConnection.promise;
  return cachedMongooseConnection.conn;
}

export default dbConnect;